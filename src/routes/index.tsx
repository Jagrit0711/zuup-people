import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PeopleGraph } from "@/components/PeopleGraph";
import { PersonCard } from "@/components/PersonCard";
import { supabase, type Employee } from "@/lib/supabase";
import { ZUUP_LOGO } from "@/lib/brand";
import { Link } from "@tanstack/react-router";
import { Settings, Users, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zuup — People" },
      { name: "description", content: "The Zuup org — a living, breathing network of people." },
      { property: "og:title", content: "Zuup — People" },
      { property: "og:description", content: "The Zuup org — a living network of people." },
    ],
  }),
  component: Index,
});

function Index() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("is_founder", { ascending: false });
      if (!active) return;
      if (error) setError(error.message);
      else setEmployees(data as Employee[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <img src={ZUUP_LOGO} alt="Zuup" className="h-8 w-auto" />
          <div className="hidden sm:block">
            <div className="text-xs text-muted-foreground uppercase tracking-widest">People</div>
            <div className="text-sm font-display font-semibold">The Zuup network</div>
          </div>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5">
            <Users size={12} className="text-primary" /> {employees.length} members
          </div>
          <Link
            to="/admin"
            className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 hover:text-primary"
          >
            <Settings size={12} /> Admin
          </Link>
        </div>
      </header>

      <main className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin mr-2" /> Loading the network…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive p-8 text-center">
            <div>
              <p className="font-semibold mb-2">Couldn't load people</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs mt-4 text-muted-foreground">
                Make sure you've run the SQL setup in your Supabase project. Head to <Link to="/admin" className="text-primary underline">/admin</Link>.
              </p>
            </div>
          </div>
        )}
        {!loading && !error && employees.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-center p-8">
            <div className="max-w-sm">
              <h2 className="text-2xl font-display font-bold mb-2">No people yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Head to <Link to="/admin" className="text-primary underline">admin</Link> to add the founder and start growing the tree.
              </p>
            </div>
          </div>
        )}
        {!loading && !error && employees.length > 0 && (
          <PeopleGraph employees={employees} onSelect={setSelected} />
        )}
      </main>

      <PersonCard employee={selected} open={!!selected} onClose={() => setSelected(null)} />

      <div className="absolute bottom-4 left-4 text-[10px] text-muted-foreground/70 pointer-events-none">
        Drag people · scroll to zoom · click to open
      </div>
    </div>
  );
}
