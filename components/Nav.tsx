'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { readScores, writeScores } from '@/lib/guest';

const links = [
  ['/', 'Home'],
  ['/feed', 'Game Feed'],
  ['/games', 'Explore'],
  ['/multiplayer', 'Multiplayer'],
  ['/leaderboard', 'Leaderboards'],
] as const;

export default function Nav() {
  const [user, setUser] = useState<boolean | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setUser(false);
      return;
    }
    const sb = createClient();
    const sync = async () => {
      const pending = readScores().filter((s) => !s.synced);
      if (!pending.length) return;
      const r = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: pending }),
      });
      if (r.ok) {
        const ids = new Set(pending.map((p) => p.id));
        writeScores(
          readScores().map((s) => (ids.has(s.id) ? { ...s, synced: true } : s))
        );
        setToast('Your guest scores were saved to your account.');
        setTimeout(() => setToast(''), 4000);
      }
    };

    sb.auth.getUser().then(({ data }) => {
      setUser(!!data.user);
      if (data.user) sync();
    });

    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setUser(!!s?.user);
      if (s?.user) sync();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    location.href = '/';
  };

  const cls = 'rounded-full px-4 py-2 text-sm font-extrabold text-ink/80 hover:text-ink hover:bg-chip transition';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ink/5">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-ink/10 shadow-sm flex items-center justify-center bg-white">
            {/* Logo infinity mark */}
            <svg viewBox="0 0 100 50" className="w-7 h-7">
              <path
                d="M 28,12 C 16,12 8,20 8,28 C 8,36 16,42 26,42 C 38,42 45,28 50,25 C 55,22 62,8 74,8 C 84,8 92,16 92,25 C 92,34 84,42 74,42 C 62,42 55,28 50,25 C 45,22 38,8 26,8"
                fill="none"
                stroke="#191B1F"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M 50,25 C 55,22 62,8 74,8 C 84,8 92,16 92,25 C 92,34 84,42 74,42"
                fill="none"
                stroke="#FFB800"
                strokeWidth="7"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-ink group-hover:opacity-90 transition">
            LOL<span className="text-marigold">LOOP</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map(([h, l]) => (
            <Link key={h} href={h} className={cls}>
              {l}
            </Link>
          ))}
          <div className="h-5 w-px bg-ink/10 mx-2" />
          {user ? (
            <>
              <Link href="/profile" className={cls}>
                Profile
              </Link>
              <button onClick={logout} className={cls}>
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-ink px-5 py-2 text-sm font-extrabold text-white hover:bg-ink/90 shadow-sm transition"
            >
              Log in
            </Link>
          )}
        </div>

        {/* Mobile Dropdown */}
        <details className="relative md:hidden">
          <summary
            className="cursor-pointer list-none rounded-full bg-chip px-4 py-2 text-sm font-extrabold"
            aria-label="Menu"
          >
            Menu
          </summary>
          <div className="absolute right-0 mt-2 flex w-56 flex-col rounded-3xl border border-ink/10 bg-white p-2 shadow-2xl">
            {links.map(([h, l]) => (
              <Link key={h} href={h} className={cls}>
                {l}
              </Link>
            ))}
            <div className="h-px bg-ink/10 my-1" />
            {user ? (
              <>
                <Link href="/profile" className={cls}>
                  Profile
                </Link>
                <button onClick={logout} className={`${cls} text-left`}>
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" className={cls}>
                Log in
              </Link>
            )}
          </div>
        </details>
      </nav>
      {toast && (
        <p
          role="status"
          className="mx-auto w-fit rounded-full bg-cream border border-marigold/30 px-5 py-1.5 text-xs font-black shadow-sm mb-2"
        >
          {toast}
        </p>
      )}
    </header>
  );
}
