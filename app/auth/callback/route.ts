import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code'); const n = searchParams.get('next') ?? '/profile';
  const next = n.startsWith('/') && !n.startsWith('//') ? n : '/profile';
  if (code) { const { error } = await createClient().auth.exchangeCodeForSession(code); if (!error) return NextResponse.redirect(`${origin}${next}`); }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
