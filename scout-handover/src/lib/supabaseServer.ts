import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Request-scoped client that respects RLS. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (all) => all.forEach(({ name, value, options }) => store.set(name, value, options))
      }
    }
  );
}

/** Ingestion-only client. Service role key never reaches the browser. */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
