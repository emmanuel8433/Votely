import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.");
  const store = cookies();
  return createServerClient(url, key, { cookies: {
    getAll: () => store.getAll(),
    setAll: (c) => { try { c.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} } } });
}
