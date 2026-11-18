'use client';
import { useEffect, useState } from 'react';
import { configured, createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
const input = 'h-12 w-full rounded-full bg-field px-5 font-semibold outline-none focus:ring-2 focus:ring-ink';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  const [next, setNext] = useState('/profile');
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const n = p.get('next'); if (n && n.startsWith('/') && !n.startsWith('//')) setNext(n);
    const m = p.get('mode'); if (m === 'reset') setMode('reset');
  }, []);
  const origin = () => process.env.NEXT_PUBLIC_SITE_URL || location.origin;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (!configured) return setMsg({ ok: false, t: 'Accounts are not set up on this site yet.' });
    setBusy(true);
    const sb = createClient();
    try {
      if (mode === 'login') { const { error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) throw error; location.href = next; return; }
      if (mode === 'register') {
        if (pw.length < 8) throw new Error('Use at least 8 characters.');
        const { error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw error; setMsg({ ok: true, t: 'Check your email to verify your account. Your guest scores will sync after you log in.' });
      }
      if (mode === 'forgot') { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent('/login?mode=reset')}` }); if (error) throw error; setMsg({ ok: true, t: 'If that email has an account, a reset link is on its way.' }); }
      if (mode === 'reset') { if (pw.length < 8) throw new Error('Use at least 8 characters.'); const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw error; location.href = '/profile'; return; }
    } catch (err) { setMsg({ ok: false, t: err instanceof Error ? err.message : 'Something went wrong.' }); }
    setBusy(false);
  };
  const google = async () => { if (!configured) return setMsg({ ok: false, t: 'Accounts are not set up on this site yet.' }); const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next)}` } }); if (error) setMsg({ ok: false, t: 'Google login is not configured. Use email instead.' }); };
  const title = { login: 'Welcome back', register: 'Create your account', forgot: 'Reset your password', reset: 'Choose a new password' }[mode];

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-[rgba(25,27,31,0.06)] bg-white p-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-sm font-semibold opacity-70">You never need an account to play. Sign up only to keep scores permanently.</p>
        {mode !== 'reset' && <input className={input} type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        {mode !== 'forgot' && <input className={input} type="password" required minLength={mode === 'login' ? 1 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />}
        <button disabled={busy} className="w-full rounded-full bg-marigold py-3.5 font-bold disabled:opacity-50">{busy ? 'Please wait…' : { login: 'Log in', register: 'Sign up', forgot: 'Send reset link', reset: 'Save password' }[mode]}</button>
        {msg && <p role="alert" className={`text-sm font-bold ${msg.ok ? '' : 'text-[#EF4444]'}`}>{msg.t}</p>}
        {(mode === 'login' || mode === 'register') && <button type="button" onClick={google} className="w-full rounded-full border-[1.5px] border-ink py-3 font-bold">Continue with Google</button>}
        <div className="flex flex-wrap justify-between gap-2 text-sm font-bold underline">
          {mode !== 'login' && <button type="button" onClick={() => setMode('login')}>Log in</button>}
          {mode !== 'register' && <button type="button" onClick={() => setMode('register')}>Create account</button>}
          {mode === 'login' && <button type="button" onClick={() => setMode('forgot')}>Forgot password?</button>}
        </div>
      </form>
    </main>
  );
}
