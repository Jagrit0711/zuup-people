import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qnapwukqhybziduhzpow.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYXB3dWtxaHliemlkdWh6cG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjA3ODYsImV4cCI6MjA4NzkzNjc4Nn0.x1a-lyiPhBDqR2U-ZAC_waSa-2smUs_KpSGXbK54rp0";

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
