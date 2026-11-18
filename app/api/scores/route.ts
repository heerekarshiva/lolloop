import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { GAMES } from '@/lib/games';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 });
  let body: { scores?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  if (!Array.isArray(body.scores) || body.scores.length === 0 || body.scores.length > 50) return NextResponse.json({ error: 'bad scores' }, { status: 400 });

  // Game-specific validation: known game, integer in the achievable range, valid id.
  const valid = body.scores.flatMap((s: any) => {
    const g = GAMES.find((x) => x.slug === s?.slug);
    if (!g || typeof s.id !== 'string' || !UUID.test(s.id) || !Number.isInteger(s.score) || s.score < 0 || s.score > (g.maxScore ?? 1_000_000)) return [];
    const at = Number.isFinite(s.at) && s.at <= Date.now() + 60_000 && s.at > Date.now() - 400 * 86_400_000 ? new Date(s.at) : new Date();
    return [{ client_id: s.id, slug: g.slug, score: s.score as number, played_at: at }];
  });
  if (valid.length === 0) return NextResponse.json({ error: 'no valid scores' }, { status: 422 });

  const db = createAdminClient();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from('game_scores').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('played_at', since);
  if ((count ?? 0) > 300) return NextResponse.json({ error: 'rate limit' }, { status: 429 });

  const { data: games } = await db.from('games').select('id,slug').in('slug', GAMES.map((g) => g.slug));
  const ids = new Map((games ?? []).map((g) => [g.slug, g.id]));
  const rows = valid.filter((v) => ids.has(v.slug)).map((v) => ({ client_id: v.client_id, user_id: user.id, game_id: ids.get(v.slug)!, score: v.score, played_at: v.played_at.toISOString(), metadata: { source: 'client' } }));
  const { error } = await db.from('game_scores').upsert(rows, { onConflict: 'client_id', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });

  // daily streak
  const today = new Date().toISOString().slice(0, 10);
  const { data: st } = await db.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle();
  if (st?.last_played_date !== today) {
    const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const cur = st?.last_played_date === y ? st.current_streak + 1 : 1;
    await db.from('user_streaks').upsert({ user_id: user.id, current_streak: cur, longest_streak: Math.max(cur, st?.longest_streak ?? 0), last_played_date: today });
  }
  return NextResponse.json({ saved: rows.length });
}
