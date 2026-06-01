import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Employee } from "@/lib/supabase";
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
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PersonCard({
  employee,
  open,
  onClose,
}: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!employee) return null;
  const e = employee;

  const social: Array<[string | null, React.ReactNode, string]> = [
    [e.instagram, <Instagram size={16} />, "instagram"],
    [e.linkedin, <Linkedin size={16} />, "linkedin"],
    [e.twitter, <Twitter size={16} />, "twitter"],
    [e.github, <Github size={16} />, "github"],
    [e.website, <Globe size={16} />, "website"],
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass !max-w-md p-0 overflow-hidden border-border">
        <DialogTitle className="sr-only">{e.name}</DialogTitle>
        <div className="relative h-28 bg-gradient-to-br from-primary/40 via-primary/10 to-transparent">
          <div className="absolute -bottom-10 left-6">
            <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-primary shadow-2xl bg-secondary">
              {e.photo_url ? (
                <img src={e.photo_url} alt={e.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-2xl">
                  {e.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pt-12 px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto scroll-thin">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{e.name}</h2>
              {e.pronouns && <span className="text-xs text-muted-foreground">({e.pronouns})</span>}
              {e.is_founder && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-wider">
                  Founder
                </span>
              )}
            </div>
            {e.position && <p className="text-sm text-primary font-medium">{e.position}</p>}
            {e.tagline && <p className="text-sm text-muted-foreground italic mt-1">"{e.tagline}"</p>}
          </div>

          {e.bio && <p className="text-sm text-foreground/80 leading-relaxed">{e.bio}</p>}

          <div className="grid grid-cols-2 gap-2 text-xs">
            {e.department && <InfoRow icon={<Briefcase size={14} />} label={e.department} />}
            {e.chapter && <InfoRow icon={<MapPin size={14} />} label={`HQ: ${e.chapter}`} />}
            {e.location && <InfoRow icon={<MapPin size={14} />} label={e.location} />}
            {e.joined_at && (
              <InfoRow icon={<Calendar size={14} />} label={`Since ${new Date(e.joined_at).getFullYear()}`} />
            )}
            {e.phone && <InfoRow icon={<Phone size={14} />} label={e.phone} />}
            {e.email_primary && <InfoRow icon={<Mail size={14} />} label={e.email_primary} />}
            {e.email_secondary && <InfoRow icon={<Mail size={14} />} label={e.email_secondary} />}
          </div>

          {e.skills && e.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {e.skills.map((s) => (
                <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-secondary border border-border">
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {social.map(([url, icon, key]) =>
              url ? (
                <a
                  key={key}
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-lg glass flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition"
                >
                  {icon}
                </a>
              ) : null,
            )}
          </div>

          <Link
            to="/$slug"
            params={{ slug: e.slug }}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            View public card <ExternalLink size={14} />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-foreground/80 truncate">
      <span className="text-primary">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
