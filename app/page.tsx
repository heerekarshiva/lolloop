import Link from 'next/link';
import GameCard from '@/components/GameCard';
import ContinuePlaying from '@/components/ContinuePlaying';
import GameArt3D from '@/components/GameArt3D';
import Ad from '@/components/Ad';
import { GAMES, bySlug, dailyGame } from '@/lib/games';

const btn = 'rounded-full px-7 py-3.5 font-extrabold text-sm transition active:scale-95 duration-150 inline-flex items-center justify-center gap-2';

export default function Home() {
  const daily = dailyGame();
  const signatureGame = bySlug('you-and-me') || GAMES[30]; // 31. You & Me

  // Segment games for home sections
  const trendingGames = [
    bySlug('jump-rush'),
    bySlug('brick-smash'),
    bySlug('slice-master'),
    bySlug('traffic-escape'),
    bySlug('bounce-mania'),
    bySlug('bubble-pop'),
  ].filter(Boolean) as typeof GAMES;

  const multiplayerBattles = [
    bySlug('tic-tac-toe'),
    bySlug('duo-dash'),
    bySlug('pong-rivals'),
    bySlug('four-in-a-row'),
    bySlug('tap-war'),
    bySlug('snake-arena'),
  ].filter(Boolean) as typeof GAMES;

  const newReleases = [
    bySlug('jungle-quest'),
    bySlug('castle-escape'),
    bySlug('treasure-hunt'),
    bySlug('space-buddies'),
    bySlug('ocean-explorer'),
    bySlug('haunted-escape'),
  ].filter(Boolean) as typeof GAMES;

  const puzzlePicks = [
    bySlug('number-merge'),
    bySlug('maze-runner'),
    bySlug('sudoku-sprint'),
    bySlug('memory-match'),
    bySlug('connect-quest'),
    bySlug('logic-lock'),
  ].filter(Boolean) as typeof GAMES;

  return (
    <main className="mx-auto max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cream via-white to-amber-50/60 p-6 sm:p-10 border border-ink/5 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 border border-ink/10 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-ink/70">
              50 Original 3D Games Live
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black leading-[1.08] tracking-tight text-ink">
            One more game. <br />
            <span className="text-marigold drop-shadow-sm">One more laugh.</span>
          </h1>

          <p className="text-base sm:text-lg font-medium text-ink/75 max-w-xl">
            Welcome to the LOLLOOP 3D universe. Real 3D physics, original characters, 
            instant WebGL gameplay, solo AI bots, and real-time multiplayer. No downloads, no installs.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link href="/feed" className={`${btn} bg-marigold text-ink shadow-md hover:bg-amber-400`}>
              <span>⚡</span> Infinite 3D Feed
            </Link>
            <Link href="/games" className={`${btn} bg-ink text-white hover:bg-ink/90 shadow-sm`}>
              <span>🎮</span> Explore All 50 Games
            </Link>
            <Link href="/multiplayer" className={`${btn} bg-white text-ink border border-ink/15 hover:bg-cream`}>
              <span>👥</span> Multiplayer Battles
            </Link>
          </div>
        </div>
      </section>

      {/* Continue Playing / Device Saved Resumes */}
      <ContinuePlaying />

      {/* Featured 3D Signature Game: YOU & ME */}
      <section className="rounded-3xl bg-ink text-white p-6 sm:p-10 relative overflow-hidden shadow-2xl border border-ink/20">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-marigold text-ink px-3 py-1 text-xs font-black uppercase tracking-wider">
                Signature LOLLOOP 3D Game
              </span>
              <span className="rounded-full bg-white/20 text-white px-3 py-1 text-xs font-bold">
                Cooperative Adventure
              </span>
              <span className="rounded-full bg-white/20 text-white px-3 py-1 text-xs font-bold">
                Solo AI Bot + 2-Player
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {signatureGame.name}
            </h2>

            <p className="text-sm sm:text-base text-white/80 leading-relaxed">
              Meet Ember (Fire) and Glacio (Ice)! Traverse 5 handcrafted 3D realms:
              Lava Cavern, Crystal Glacier, Mystical Forest, Water Temple, and Celestial Citadel. 
              Step on pressure plates, open gates, collect gems, and escape together!
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-bold text-white/70">
              <div className="bg-white/10 rounded-xl p-2 text-center">🔥 Ember: Lava Proof</div>
              <div className="bg-white/10 rounded-xl p-2 text-center">❄️ Glacio: Water Walk</div>
              <div className="bg-white/10 rounded-xl p-2 text-center">🤖 Intelligent AI Buddy</div>
              <div className="bg-white/10 rounded-xl p-2 text-center">💎 5 Adventure Worlds</div>
            </div>

            <div className="pt-3 flex flex-wrap gap-3">
              <Link
                href={`/games/${signatureGame.slug}`}
                className={`${btn} bg-marigold text-ink font-black text-base shadow-lg hover:bg-amber-400`}
              >
                Play You & Me 3D 🎮
              </Link>
              <Link
                href="/feed"
                className={`${btn} bg-white/15 text-white hover:bg-white/25`}
              >
                Watch in Feed →
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative h-72 sm:h-80 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black/40">
            <GameArt3D game={signatureGame} />
          </div>
        </div>
      </section>

      {/* Daily Challenge Highlight */}
      <section className="grid sm:grid-cols-12 gap-6 items-center rounded-3xl bg-cream border border-marigold/30 p-6 sm:p-8">
        <div className="sm:col-span-8 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <span className="text-xs font-black uppercase tracking-wider text-ink/70">
              Today's Daily Challenge
            </span>
          </div>
          <h2 className="text-3xl font-black text-ink">{daily.name}</h2>
          <p className="text-sm font-semibold text-ink/75">{daily.description}</p>
          <div className="pt-2 flex items-center gap-4">
            <Link
              href={`/games/${daily.slug}`}
              className={`${btn} bg-marigold text-ink shadow-sm hover:bg-amber-400`}
            >
              Play Challenge 🏆
            </Link>
            <span className="text-xs font-bold text-ink/60">
              Difficulty: {daily.difficulty} • Mode: {daily.playerCount}
            </span>
          </div>
        </div>
        <div className="sm:col-span-4 flex justify-center">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white shadow-md border border-ink/5 flex items-center justify-center text-6xl">
            {daily.emoji}
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="space-y-4">
        <h2 className="text-2xl font-black tracking-tight text-ink">Browse 5 Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: 'arcade', label: 'Arcade', icon: '⚡', count: '10 Games', color: 'bg-orange-50 hover:bg-orange-100 text-orange-950 border-orange-200' },
            { id: 'puzzle', label: 'Puzzle & Brain', icon: '🧩', count: '10 Games', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-indigo-200' },
            { id: 'multiplayer', label: 'Multiplayer', icon: '⚔️', count: '10 Games', color: 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200' },
            { id: 'adventure', label: 'Adventure', icon: '🗺️', count: '10 Games', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-200' },
            { id: 'funny', label: 'Funny & Party', icon: '🎉', count: '10 Games', color: 'bg-pink-50 hover:bg-pink-100 text-pink-950 border-pink-200' },
          ].map((cat) => (
            <Link
              key={cat.id}
              href={`/games?category=${cat.id}`}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition ${cat.color}`}
            >
              <span className="text-3xl mb-1">{cat.icon}</span>
              <span className="font-extrabold text-sm">{cat.label}</span>
              <span className="text-[11px] font-bold opacity-60">{cat.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Games */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="text-2xl font-black tracking-tight text-ink">Trending 3D Games</h2>
          </div>
          <Link href="/games?category=arcade" className="text-xs font-black text-marigold hover:underline">
            View All Arcade →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trendingGames.map((g) => (
            <GameCard key={g.slug} g={g} />
          ))}
        </div>
      </section>

      {/* Multiplayer Battles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <h2 className="text-2xl font-black tracking-tight text-ink">Multiplayer Battles & AI Duel</h2>
          </div>
          <Link href="/multiplayer" className="text-xs font-black text-marigold hover:underline">
            Multiplayer Lobby →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {multiplayerBattles.map((g) => (
            <GameCard key={g.slug} g={g} />
          ))}
        </div>
      </section>

      {/* Adventure & Cooperative Worlds */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <h2 className="text-2xl font-black tracking-tight text-ink">3D Adventure & Co-Op Quests</h2>
          </div>
          <Link href="/games?category=adventure" className="text-xs font-black text-marigold hover:underline">
            View All Adventure →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newReleases.map((g) => (
            <GameCard key={g.slug} g={g} />
          ))}
        </div>
      </section>

      {/* Puzzle & Brain Training */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧩</span>
            <h2 className="text-2xl font-black tracking-tight text-ink">Puzzle & Brain Games</h2>
          </div>
          <Link href="/games?category=puzzle" className="text-xs font-black text-marigold hover:underline">
            View All Puzzles →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {puzzlePicks.map((g) => (
            <GameCard key={g.slug} g={g} />
          ))}
        </div>
      </section>

      {/* Optional Ad Banner */}
      <Ad slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} />

      {/* Why LOLLOOP Feature Grid */}
      <section className="rounded-3xl border border-ink/10 bg-white p-8 space-y-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-ink">Why LOLLOOP?</h2>
          <p className="text-sm font-semibold text-ink/70">
            Engineered for pure, unadulterated web gaming fun.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-semibold text-sm">
          <div className="rounded-2xl bg-field p-5 space-y-2 border border-ink/5">
            <span className="text-2xl">✨</span>
            <h3 className="font-extrabold text-ink">Real 3D WebGL</h3>
            <p className="text-xs text-ink/70">
              Built on Three.js with realistic lighting, procedural avatars, and dynamic physics.
            </p>
          </div>
          <div className="rounded-2xl bg-field p-5 space-y-2 border border-ink/5">
            <span className="text-2xl">🤖</span>
            <h3 className="font-extrabold text-ink">Solo Mode & AI Bots</h3>
            <p className="text-xs text-ink/70">
              Play every multiplayer and co-op game alone against smart bots from Easy to Expert.
            </p>
          </div>
          <div className="rounded-2xl bg-field p-5 space-y-2 border border-ink/5">
            <span className="text-2xl">🎵</span>
            <h3 className="font-extrabold text-ink">Procedural Audio</h3>
            <p className="text-xs text-ink/70">
              Zero audio downloads. Real-time synthesized chiptunes, retro chords, and SFX.
            </p>
          </div>
          <div className="rounded-2xl bg-field p-5 space-y-2 border border-ink/5">
            <span className="text-2xl">⚡</span>
            <h3 className="font-extrabold text-ink">Zero Setup Required</h3>
            <p className="text-xs text-ink/70">
              No account needed to start. Scores save to your device and sync when you sign up.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
