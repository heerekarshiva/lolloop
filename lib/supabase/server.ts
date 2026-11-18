import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export function createClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (list: { name: string; value: string; options: CookieOptions }[]) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* server component */ } } },
  });
}
// Trusted server code only. Never import from client components.
export const createAdminClient = () => createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
