import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type Employee } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { ZUUP_LOGO } from "@/lib/brand";
import {
  Instagram,
  Linkedin,
  Twitter,
  Globe,
  Github,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Share2,
  Download,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Zuup` },
      { name: "description", content: `${params.slug}'s Zuup card.` },
    ],
  }),
  component: PersonPage,
});

function PersonPage() {
  const { slug } = Route.useParams();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("slug", slug).maybeSingle();
      if (error || !data) setNotFound(true);
      else setEmp(data as Employee);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (notFound || !emp)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">No one here yet.</p>
        <Link to="/" className="text-primary text-sm hover:underline">← Back to the network</Link>
      </div>
    );

  const url = typeof window !== "undefined" ? `${window.location.origin}/${emp.slug}` : `https://people.zuup.dev/${emp.slug}`;

  const social: Array<[string | null, React.ReactNode, string, string]> = [
    [emp.instagram, <Instagram size={18} />, "Instagram", "instagram"],
    [emp.linkedin, <Linkedin size={18} />, "LinkedIn", "linkedin"],
    [emp.twitter, <Twitter size={18} />, "Twitter", "twitter"],
    [emp.github, <Github size={18} />, "GitHub", "github"],
    [emp.website, <Globe size={18} />, "Website", "website"],
  ];

  function share() {
    if (navigator.share) navigator.share({ title: emp!.name, url }).catch(() => {});
    else {
      navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  }

  function downloadVCard() {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${emp!.name}`,
      emp!.position && `TITLE:${emp!.position}`,
      emp!.department && `ORG:Zuup;${emp!.department}`,
      emp!.email_primary && `EMAIL;TYPE=PREF:${emp!.email_primary}`,
      emp!.email_secondary && `EMAIL:${emp!.email_secondary}`,
      emp!.phone && `TEL:${emp!.phone}`,
      emp!.website && `URL:${emp!.website}`,
      emp!.location && `ADR:;;;${emp!.location};;;`,
      `URL:${url}`,
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([vcf], { type: "text/vcard" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${emp!.slug}.vcf`;
    a.click();
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
      <header className="w-full max-w-2xl flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Network
        </Link>
        <img src={ZUUP_LOGO} alt="Zuup" className="h-7" />
      </header>

      <div className="w-full max-w-2xl glass rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative h-40 bg-gradient-to-br from-primary/50 via-primary/10 to-transparent">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(" + ZUUP_LOGO + ")", backgroundSize: "300px", backgroundPosition: "right -50px center", backgroundRepeat: "no-repeat" }} />
          <div className="absolute -bottom-16 left-8">
            <div className="w-32 h-32 rounded-3xl overflow-hidden ring-4 ring-background shadow-2xl bg-secondary">
              {emp.photo_url ? (
                <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-4xl">
                  {emp.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-20 px-6 sm:px-8 pb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold flex items-center gap-2 flex-wrap">
                {emp.name}
                {emp.pronouns && <span className="text-sm text-muted-foreground font-normal">({emp.pronouns})</span>}
              </h1>
              {emp.position && <p className="text-primary font-medium">{emp.position}</p>}
              {emp.tagline && <p className="text-muted-foreground italic mt-1">"{emp.tagline}"</p>}
            </div>
            {emp.is_founder && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-primary/20 text-primary uppercase font-bold tracking-wider">
                Founder
              </span>
            )}
          </div>

          {emp.bio && <p className="mt-4 text-foreground/80 leading-relaxed">{emp.bio}</p>}

          <div className="grid sm:grid-cols-2 gap-3 mt-6 text-sm">
            {emp.department && <Info icon={<Briefcase size={14} />}>{emp.department}</Info>}
            {emp.chapter && <Info icon={<MapPin size={14} />}>HQ {emp.chapter}</Info>}
            {emp.location && <Info icon={<MapPin size={14} />}>{emp.location}</Info>}
            {emp.phone && <Info icon={<Phone size={14} />}><a href={`tel:${emp.phone}`}>{emp.phone}</a></Info>}
            {emp.email_primary && <Info icon={<Mail size={14} />}><a href={`mailto:${emp.email_primary}`}>{emp.email_primary}</a></Info>}
            {emp.email_secondary && <Info icon={<Mail size={14} />}><a href={`mailto:${emp.email_secondary}`}>{emp.email_secondary}</a></Info>}
          </div>

          {emp.skills && emp.skills.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {emp.skills.map((s) => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border">{s}</span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {social.map(([url, icon, label, key]) =>
              url ? (
                <a
                  key={key}
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-primary hover:text-primary-foreground transition text-sm"
                >
                  {icon} {label}
                </a>
              ) : null,
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start border-t border-border pt-6">
            <div className="p-3 bg-white rounded-xl">
              <QRCodeSVG value={url} size={140} level="M" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Share this card</div>
              <div className="text-sm font-mono break-all text-primary">{url}</div>
              <div className="flex gap-2 pt-2">
                <button onClick={share} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90">
                  <Share2 size={14} /> Share
                </button>
                <button onClick={downloadVCard} className="flex-1 px-3 py-2 rounded-lg glass text-sm font-medium flex items-center justify-center gap-2 hover:text-primary">
                  <Download size={14} /> vCard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-6 text-xs text-muted-foreground">
        Part of the <a href="https://zuup.dev" className="text-primary hover:underline">Zuup</a> network
      </footer>
    </div>
  );
}

function Info({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-foreground/80">
      <span className="text-primary">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}
