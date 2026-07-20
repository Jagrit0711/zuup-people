import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://auth.zuup.dev";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "unconfigured";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Employee = {
  id: string;
  slug: string;
  name: string;
  photo_url: string | null;
  position: string | null;
  department: string | null;
  location: string | null;
  chapter: string | null;
  parent_id: string | null;
  is_founder: boolean;
  bio: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  website: string | null;
  github: string | null;
  phone: string | null;
  email_primary: string | null;
  email_secondary: string | null;
  joined_at: string | null;
  skills: string[] | null;
  pronouns: string | null;
  tagline: string | null;
  created_at: string;
};
