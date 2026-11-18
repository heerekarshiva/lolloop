# LOLLOOP

Free browser mini-games. Next.js 14 (App Router), TypeScript, Tailwind, Supabase (Auth, Postgres, RLS, Realtime). Deploys on Vercel.

## What's in v1
- Games: Don't Press the Button, Tap Like Crazy (also 1v1 Tap War), The Wrong Answer Wins (also multiplayer quiz), Lightning Reflex, Memory Match, Tic Tac Toe Battle (real-time 1v1).
- 50 games total: 6 hand-built plus 44 themed games on 8 mechanics (target tap, dodge/catch, memory, pattern echo, math rush, odd one out, timing, runner). Add more by appending to `lib/specs.json` and a matching SQL insert.
- Swipe feed at /feed, original SVG art per game, synthesized music (no licensed audio).
- Guest play with localStorage, optional accounts, guest-to-account sync, leaderboards (daily, weekly, all-time), profile with streaks, daily challenge.
- AdSense-ready slots, SEO (metadata, sitemap, robots, canonical), security headers.
- Not in v1: Save Your Sandwich, What Changed?, cookie consent banner, Vercel Analytics, admin dashboard.

## Local setup
1. `npm install`
2. `cp .env.example .env.local` and fill in the values below.
3. `npm run dev` then open http://localhost:3000

Production check: `npm run build && npm run start`. Type check: `npm run lint`.

## Supabase
1. Create a project at supabase.com.
2. SQL Editor: run `supabase/migrations/001_init.sql`, `002_more_games.sql`, then `003_arcade_games.sql` (in order).
3. Project Settings > API: copy the URL, anon key and service_role key into the env vars. The service_role key is server-only, never prefix it with NEXT_PUBLIC_.
4. Authentication > URL Configuration: set Site URL to your domain and add Redirect URLs `http://localhost:3000/auth/callback` and `https://YOURDOMAIN/auth/callback`.
5. Authentication > Providers: Email is on by default (keep "Confirm email" on). Optional: enable Google and add its client id and secret.
6. Realtime is on by default. Multiplayer uses it and needs no tables.

## Env vars
| Name | Needed | Notes |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | yes | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | yes | |
| SUPABASE_SERVICE_ROLE_KEY | yes | server only, used by /api/scores |
| NEXT_PUBLIC_SITE_URL | yes | for example https://lolloop.com |
| NEXT_PUBLIC_ADSENSE_CLIENT_ID | no | ads render only when set |
| NEXT_PUBLIC_ADSENSE_SLOT_HOME, NEXT_PUBLIC_ADSENSE_SLOT_RESULT | no | AdSense slot ids |

## Deploy to Vercel
1. `git init && git add . && git commit -m "LOLLOOP"`, create a GitHub repo and push.
2. vercel.com > Add New Project > import the repo (Next.js is auto-detected).
3. Add the env vars above and deploy.
4. Custom domain: Project > Settings > Domains, add the DNS records Vercel shows, then update NEXT_PUBLIC_SITE_URL and the Supabase redirect URLs.
5. AdSense: after approval, put your line in `public/ads.txt` and set the AdSense env vars.

## Post-deploy checklist
- Play each game as a guest.
- Sign up, verify the email, log in, and confirm guest scores sync (a toast appears).
- Save a score and see it on /leaderboard and /profile.
- Password reset email works.
- Two browsers join one /multiplayer room and finish a round.
- /sitemap.xml and /robots.txt load.

## Security notes
- The browser cannot write scores. `game_scores` has no insert policy. /api/scores checks the user, the game, the integer range and the id, de-duplicates by client id, rate-limits, then writes with the service role.
- Solo scores are computed in the browser, so the server can only check plausibility, not prove them. For strict competitive leaderboards, move scoring server-side.
- Multiplayer rooms are host-authoritative among friends and never feed leaderboards. Quiz answers are in the client bundle.
