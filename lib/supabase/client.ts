import { createBrowserClient } from '@supabase/ssr';
/** False when NEXT_PUBLIC_SUPABASE_* were missing at build time (they are inlined during `next build`). */
export const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const createClient = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
