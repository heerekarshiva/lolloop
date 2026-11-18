create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, username text unique not null check (username ~ '^[A-Za-z0-9_]{3,20}$'), avatar_url text, created_at timestamptz not null default now());
create table public.games (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, category text not null, description text, is_active boolean not null default true, created_at timestamptz not null default now());
create table public.game_scores (id uuid primary key default gen_random_uuid(), client_id uuid unique, user_id uuid not null references auth.users(id) on delete cascade, game_id uuid not null references public.games(id), score integer not null check (score >= 0), duration_seconds integer check (duration_seconds >= 0), played_at timestamptz not null default now(), metadata jsonb not null default '{}');
create index on public.game_scores (game_id, score desc, played_at desc);
create index on public.game_scores (user_id, played_at desc);
create table public.daily_challenges (id uuid primary key default gen_random_uuid(), challenge_date date unique not null, game_id uuid not null references public.games(id), challenge_data jsonb not null default '{}', created_at timestamptz not null default now());
create table public.user_streaks (user_id uuid primary key references auth.users(id) on delete cascade, current_streak integer not null default 0, longest_streak integer not null default 0, last_played_date date);

alter table public.profiles enable row level security; alter table public.games enable row level security; alter table public.game_scores enable row level security;
alter table public.daily_challenges enable row level security; alter table public.user_streaks enable row level security;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "games public" on public.games for select using (true);
create policy "daily public" on public.daily_challenges for select using (true);
create policy "own scores read" on public.game_scores for select using (auth.uid() = user_id);   -- no insert/update/delete policy: writes only via server (service role)
create policy "own streak read" on public.user_streaks for select using (auth.uid() = user_id);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, username) values (new.id, 'player_' || substr(replace(new.id::text,'-',''),1,8)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.leaderboard(game_slug text, period text default 'all', lim int default 20, off int default 0)
returns table (rank bigint, username text, score int, played_at timestamptz) language sql security definer set search_path = public stable as $$
  select row_number() over (order by s.score desc, s.played_at asc), p.username, s.score, s.played_at
  from (select distinct on (user_id) * from game_scores gs where gs.game_id = (select id from games where slug = game_slug)
          and (period = 'all' or (period = 'daily' and gs.played_at > now() - interval '1 day') or (period = 'weekly' and gs.played_at > now() - interval '7 days'))
        order by user_id, score desc) s join profiles p on p.id = s.user_id
  order by 1 limit least(lim, 50) offset greatest(off, 0) $$;
grant execute on function public.leaderboard to anon, authenticated;

insert into public.games (slug, name, category, description) values
 ('tap-like-crazy','Tap Like Crazy','quick','10 seconds. Tap as fast as you can.'),
 ('wrong-answer-wins','The Wrong Answer Wins','puzzle','Trick questions with sneaky answers.'),
 ('dont-press-the-button','Don''t Press the Button','funny','Resist the button for 30 seconds.');
