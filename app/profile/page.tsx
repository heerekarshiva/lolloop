import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GAMES, fmt } from '@/lib/games';
export const metadata: Metadata = { title: 'Your profile', robots: { index: false } };
export const dynamic = 'force-dynamic';
export default async function Profile() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login?next=/profile');
  const [{ data: prof }, { data: streak }, { data: scores }] = await Promise.all([
    sb.from('profiles').select('username').eq('id', user.id).single(),
    sb.from('user_streaks').select('current_streak,longest_streak').eq('user_id', user.id).maybeSingle(),
    sb.from('game_scores').select('score,played_at,games(slug)').eq('user_id', user.id).order('played_at', { ascending: false }).limit(100),
  ]);
  const rows = (scores ?? []) as unknown as { score: number; played_at: string; games: { slug: string } | { slug: string }[] | null }[];
  const slugOf = (r: (typeof rows)[number]) => (Array.isArray(r.games) ? r.games[0]?.slug : r.games?.slug);
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8"><h1 className="text-4xl font-extrabold tracking-tight">{prof?.username ?? 'Player'}</h1>
      <div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-3xl bg-cream p-4"><p className="text-3xl font-extrabold">{streak?.current_streak ?? 0}</p><p className="text-sm font-bold">Day streak</p></div><div className="rounded-3xl bg-cream p-4"><p className="text-3xl font-extrabold">{streak?.longest_streak ?? 0}</p><p className="text-sm font-bold">Longest streak</p></div></div>
      <section><h2 className="mb-2 text-xl font-extrabold">Personal bests</h2><ul className="space-y-2">{GAMES.map((g) => { const b = Math.max(0, ...rows.filter((r) => slugOf(r) === g.slug).map((r) => r.score)); return <li key={g.slug} className="flex justify-between rounded-full bg-white px-5 py-3 font-bold"><span>{g.name}</span><span>{b ? fmt(g, b) : '-'}</span></li>; })}</ul></section>
      <section><h2 className="mb-2 text-xl font-extrabold">History</h2>{rows.length === 0 ? <p className="rounded-3xl bg-field p-4 font-semibold">No saved scores yet. Play a game and tap Save my score.</p> : <ul className="space-y-2">{rows.slice(0, 30).map((r, i) => { const g = GAMES.find((x) => x.slug === slugOf(r)); return <li key={i} className="flex justify-between rounded-full bg-field px-5 py-2.5 text-sm font-bold"><span>{g?.name}</span><span>{g ? fmt(g, r.score) : r.score} · {new Date(r.played_at).toLocaleDateString()}</span></li>; })}</ul>}</section></main>
  );
}
