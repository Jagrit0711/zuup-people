import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, SUPABASE_URL, type Employee } from "@/lib/supabase";
import { slugify, ZUUP_LOGO } from "@/lib/brand";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, Edit3, X, Save, ArrowLeft, Copy, Check, LogOut, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Zuup — Admin" }] }),
  component: AdminGate,
});

const SETUP_SQL = `-- Run this once in your Supabase SQL editor.
-- The admin email lives ONLY here (server-side). Change it as needed.
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  photo_url text,
  position text,
  department text,
  location text,
  chapter text,
  parent_id uuid references public.employees(id) on delete set null,
  is_founder boolean default false,
  bio text,
  instagram text,
  linkedin text,
  twitter text,
  website text,
  github text,
  phone text,
  email_primary text,
  email_secondary text,
  joined_at date,
  skills text[],
  pronouns text,
  tagline text,
  created_at timestamptz default now()
);
alter table public.employees enable row level security;

-- Public can READ.
drop policy if exists "read all" on public.employees;
create policy "read all" on public.employees for select using (true);

-- Server-side admin check. The admin email lives ONLY here.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, auth
as $$
  select coalesce(
    (select email from auth.users where id = auth.uid()) = 'jagrit@zuup.dev',
    false
  );
$$;
grant execute on function public.is_admin() to authenticated, anon;

-- Only admin can mutate.
drop policy if exists "insert all" on public.employees;
drop policy if exists "update all" on public.employees;
drop policy if exists "delete all" on public.employees;
drop policy if exists "admin insert" on public.employees;
drop policy if exists "admin update" on public.employees;
drop policy if exists "admin delete" on public.employees;
create policy "admin insert" on public.employees for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.employees for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.employees for delete to authenticated using (public.is_admin());`;

function AdminGate() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<{ email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function verify() {
    setChecking(true);

    // Handle ?token= from SSO redirect
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("token");
    if (ssoToken) {
      await supabase.auth.setSession({ access_token: ssoToken, refresh_token: ssoToken });
      // Clean token from URL without a reload
      window.history.replaceState({}, "", window.location.pathname);
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSession(null);
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    setSession({ email: userData.user.email });
    const { data, error } = await supabase.rpc("is_admin");
    setIsAdmin(!error && data === true);
    setChecking(false);
  }

  useEffect(() => {
    verify();
    const { data: sub } = supabase.auth.onAuthStateChange(() => verify());
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" /> Checking access…
      </div>
    );
  }
  if (!session) return <LoginScreen />;
  if (!isAdmin) return <NotAuthorized email={session.email} />;
  return <Admin />;
}

function LoginScreen() {
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Use redirect_to so the worker appends ?token= back to our page
    const returnTo = encodeURIComponent(window.location.origin + "/admin");
    window.location.href = `${SUPABASE_URL}/login?redirect_to=${returnTo}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="glass rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-primary" />
          <h1 className="font-display text-xl font-bold">Admin sign in</h1>
        </div>
        <p className="text-xs text-muted-foreground">Restricted area. Sign in with your Zuup admin account via SSO.</p>
        <button
          disabled={loading}
          className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Redirecting…" : "Sign in with Zuup SSO"}
        </button>
        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">← Back to network</Link>
      </form>
    </div>
  );
}

function NotAuthorized({ email }: { email?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="glass rounded-2xl p-8 max-w-sm space-y-3">
        <Lock className="mx-auto text-destructive" />
        <h1 className="font-display text-xl font-bold">Not authorized</h1>
        <p className="text-sm text-muted-foreground">
          <code className="text-foreground">{email}</code> doesn't have admin access to this workspace.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-2 rounded-md glass text-xs flex items-center gap-1 hover:text-primary"
          >
            <LogOut size={12} /> Sign out
          </button>
          <Link to="/" className="px-3 py-2 rounded-md glass text-xs hover:text-primary">Back to network</Link>
        </div>
      </div>
    </div>
  );
}

type Form = Partial<Employee> & { skills_text?: string };

const EMPTY: Form = {
  name: "",
  slug: "",
  is_founder: false,
};

function Admin() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("employees").select("*").order("created_at");
    if (error) setError(error.message);
    else setEmployees(data as Employee[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const payload: any = { ...editing };
    if (payload.skills_text !== undefined) {
      payload.skills = payload.skills_text
        ? payload.skills_text.split(",").map((s: string) => s.trim()).filter(Boolean)
        : null;
      delete payload.skills_text;
    }
    if (!payload.slug && payload.name) payload.slug = slugify(payload.name);
    if (payload.parent_id === "") payload.parent_id = null;
    if (payload.joined_at === "") payload.joined_at = null;

    let res;
    if (payload.id) res = await supabase.from("employees").update(payload).eq("id", payload.id);
    else res = await supabase.from("employees").insert(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this person?")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  function startEdit(e: Employee) {
    setEditing({ ...e, skills_text: e.skills?.join(", ") ?? "" });
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to network
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs px-2.5 py-1.5 rounded-md glass flex items-center gap-1 hover:text-primary"
          >
            <LogOut size={12} /> Sign out
          </button>
          <img src={ZUUP_LOGO} alt="Zuup" className="h-8" />
        </div>
      </header>

      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">Manage the Zuup people network.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSQL((s) => !s)}
            className="px-3 py-2 rounded-lg glass text-sm hover:text-primary"
          >
            DB setup SQL
          </button>
          <button
            onClick={() => setEditing(EMPTY)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90"
          >
            <Plus size={16} /> Add person
          </button>
        </div>
      </div>

      {showSQL && (
        <div className="glass rounded-xl p-4 mb-6 relative">
          <button
            className="absolute top-3 right-3 text-xs px-2 py-1 rounded bg-secondary hover:bg-accent flex items-center gap-1"
            onClick={() => {
              navigator.clipboard.writeText(SETUP_SQL);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
          </button>
          <pre className="text-[11px] overflow-x-auto text-muted-foreground whitespace-pre-wrap">{SETUP_SQL}</pre>
        </div>
      )}

      {error && (
        <div className="glass rounded-lg p-3 mb-4 border-destructive/40 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {employees.length === 0 && (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">
            No people yet. Click <b className="text-primary">Add person</b> to start.
          </div>
        )}
        {employees.map((e) => (
          <div key={e.id} className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
              {e.photo_url ? (
                <img src={e.photo_url} alt={e.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-display">
                  {e.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {e.name}{" "}
                {e.is_founder && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase">
                    founder
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {e.position} {e.chapter && `· ${e.chapter}`} ·{" "}
                <Link to="/$slug" params={{ slug: e.slug }} className="text-primary hover:underline">
                  /{e.slug}
                </Link>
              </div>
            </div>
            <button onClick={() => startEdit(e)} className="p-2 hover:text-primary"><Edit3 size={16} /></button>
            <button onClick={() => remove(e.id)} className="p-2 hover:text-destructive"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
            <div className="sticky top-0 glass flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display font-bold text-lg">
                {editing.id ? "Edit person" : "Add person"}
              </h2>
              <button onClick={() => setEditing(null)} className="p-1 hover:text-primary"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <Field label="Name *">
                <input
                  value={editing.name ?? ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    setEditing((f) => ({
                      ...f!,
                      name,
                      slug: f!.slug && f!.id ? f!.slug : slugify(name),
                    }));
                  }}
                />
              </Field>
              <Field label="Slug (URL) *">
                <input value={editing.slug ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, slug: slugify(v.target.value) }))} />
              </Field>
              <Field label="Photo URL" full>
                <input value={editing.photo_url ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, photo_url: v.target.value }))} />
              </Field>
              <Field label="Position">
                <input value={editing.position ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, position: v.target.value }))} />
              </Field>
              <Field label="Department">
                <input value={editing.department ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, department: v.target.value }))} />
              </Field>
              <Field label="Chapter / HQ">
                <input value={editing.chapter ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, chapter: v.target.value }))} placeholder="HQ India, Giza, ..." />
              </Field>
              <Field label="Location">
                <input value={editing.location ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, location: v.target.value }))} />
              </Field>
              <Field label="Reports to (parent)">
                <select
                  value={editing.parent_id ?? ""}
                  onChange={(v) => setEditing((f) => ({ ...f!, parent_id: v.target.value || null }))}
                >
                  <option value="">— None (top of tree) —</option>
                  {employees
                    .filter((e) => e.id !== editing.id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} {e.position ? `· ${e.position}` : ""}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Founder?">
                <label className="flex items-center gap-2 h-9 px-3 rounded bg-input cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editing.is_founder}
                    onChange={(v) => setEditing((f) => ({ ...f!, is_founder: v.target.checked }))}
                  />
                  <span className="text-sm">Mark as founder</span>
                </label>
              </Field>
              <Field label="Pronouns">
                <input value={editing.pronouns ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, pronouns: v.target.value }))} />
              </Field>
              <Field label="Joined date">
                <input
                  type="date"
                  value={editing.joined_at ?? ""}
                  onChange={(v) => setEditing((f) => ({ ...f!, joined_at: v.target.value }))}
                />
              </Field>
              <Field label="Tagline" full>
                <input value={editing.tagline ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, tagline: v.target.value }))} />
              </Field>
              <Field label="Bio" full>
                <textarea
                  rows={3}
                  value={editing.bio ?? ""}
                  onChange={(v) => setEditing((f) => ({ ...f!, bio: v.target.value }))}
                />
              </Field>
              <Field label="Phone">
                <input value={editing.phone ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, phone: v.target.value }))} />
              </Field>
              <Field label="Email (primary)">
                <input value={editing.email_primary ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, email_primary: v.target.value }))} />
              </Field>
              <Field label="Email (secondary)">
                <input value={editing.email_secondary ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, email_secondary: v.target.value }))} />
              </Field>
              <Field label="Instagram URL">
                <input value={editing.instagram ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, instagram: v.target.value }))} />
              </Field>
              <Field label="LinkedIn URL">
                <input value={editing.linkedin ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, linkedin: v.target.value }))} />
              </Field>
              <Field label="Twitter / X URL">
                <input value={editing.twitter ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, twitter: v.target.value }))} />
              </Field>
              <Field label="GitHub URL">
                <input value={editing.github ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, github: v.target.value }))} />
              </Field>
              <Field label="Website" full>
                <input value={editing.website ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, website: v.target.value }))} />
              </Field>
              <Field label="Skills (comma separated)" full>
                <input value={editing.skills_text ?? ""} onChange={(v) => setEditing((f) => ({ ...f!, skills_text: v.target.value }))} />
              </Field>
            </div>
            <div className="sticky bottom-0 glass border-t border-border px-5 py-3 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm hover:bg-accent">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !editing.name}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={14} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`text-xs space-y-1 ${full ? "col-span-2" : ""}`}>
      <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="[&_input]:w-full [&_input]:h-9 [&_input]:px-3 [&_input]:rounded-md [&_input]:bg-input [&_input]:text-sm [&_input]:outline-none [&_input]:border [&_input]:border-border [&_input:focus]:border-primary [&_select]:w-full [&_select]:h-9 [&_select]:px-2 [&_select]:rounded-md [&_select]:bg-input [&_select]:text-sm [&_select]:border [&_select]:border-border [&_textarea]:w-full [&_textarea]:p-3 [&_textarea]:rounded-md [&_textarea]:bg-input [&_textarea]:text-sm [&_textarea]:border [&_textarea]:border-border [&_textarea:focus]:border-primary [&_textarea]:outline-none">
        {children}
      </div>
    </label>
  );
}
