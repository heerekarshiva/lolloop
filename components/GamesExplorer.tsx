'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { GAMES, GameCategory, Difficulty } from '@/lib/games';
import GameCard from '@/components/GameCard';

const CATEGORIES: { id: 'all' | GameCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All 50 Games', icon: '✨' },
  { id: 'arcade', label: 'Arcade (1-10)', icon: '⚡' },
  { id: 'puzzle', label: 'Puzzle & Brain (11-20)', icon: '🧩' },
  { id: 'multiplayer', label: 'Multiplayer (21-30)', icon: '⚔️' },
  { id: 'adventure', label: 'Adventure (31-40)', icon: '🗺️' },
  { id: 'funny', label: 'Funny & Party (41-50)', icon: '🎉' },
];

export default function GamesExplorer() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as GameCategory) || 'all';

  const [activeCategory, setActiveCategory] = useState<'all' | GameCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [multiplayerOnly, setMultiplayerOnly] = useState<boolean>(false);

  const filteredGames = useMemo(() => {
    return GAMES.filter((game) => {
      // Category match
      if (activeCategory !== 'all' && game.category !== activeCategory) {
        return false;
      }

      // Difficulty match
      if (selectedDifficulty !== 'all' && game.difficulty !== selectedDifficulty) {
        return false;
      }

      // Multiplayer match
      if (multiplayerOnly && !game.isMultiplayer) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = game.name.toLowerCase().includes(query);
        const matchesDesc = game.description.toLowerCase().includes(query);
        const matchesCategory = game.category.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [activeCategory, selectedDifficulty, multiplayerOnly, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-ink">
          Explore All 50 Games
        </h1>
        <p className="mt-2 text-base font-semibold text-ink/70">
          Real 3D WebGL gameplay with solo AI bots, multiplayer rooms, and procedural audio.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any game by name, category, or keyword..."
            className="w-full h-13 rounded-full bg-field border border-ink/10 px-5 pl-12 text-sm font-bold text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-marigold transition shadow-sm"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-50">
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black rounded-full bg-ink/10 px-2 py-0.5 text-ink/70 hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm ${
                activeCategory === cat.id
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink/80 border border-ink/10 hover:bg-cream'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Sub-Filters: Difficulty & Multiplayer Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-ink/60">Difficulty:</span>
            {['all', 'Easy', 'Medium', 'Hard', 'Expert'].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                className={`px-2.5 py-1 rounded-full font-bold transition ${
                  selectedDifficulty === d
                    ? 'bg-marigold text-ink'
                    : 'bg-field text-ink/70 hover:text-ink'
                }`}
              >
                {d === 'all' ? 'All' : d}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMultiplayerOnly(!multiplayerOnly)}
            className={`px-3 py-1 rounded-full font-bold transition flex items-center gap-1.5 ${
              multiplayerOnly
                ? 'bg-cyan-400 text-ink'
                : 'bg-field text-ink/70 hover:text-ink'
            }`}
          >
            <span>👥</span>
            <span>Multiplayer Only</span>
          </button>
        </div>
      </div>

      {/* Games Count */}
      <div className="flex items-center justify-between text-xs font-bold text-ink/60 border-b border-ink/5 pb-2">
        <span>Showing {filteredGames.length} of {GAMES.length} games</span>
        {activeCategory !== 'all' && (
          <button
            onClick={() => {
              setActiveCategory('all');
              setSelectedDifficulty('all');
              setMultiplayerOnly(false);
              setSearchQuery('');
            }}
            className="text-marigold hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Grid of Game Cards */}
      {filteredGames.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((g) => (
            <GameCard key={g.slug} g={g} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-ink/10 p-8 space-y-3">
          <p className="text-4xl">🤔</p>
          <h3 className="text-xl font-black text-ink">No games match your search</h3>
          <p className="text-xs font-semibold text-ink/60 max-w-sm mx-auto">
            Try adjusting your search terms or clearing your filters to explore all 50 games.
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setSelectedDifficulty('all');
              setMultiplayerOnly(false);
              setSearchQuery('');
            }}
            className="px-5 py-2.5 rounded-full bg-marigold text-ink text-xs font-black hover:bg-amber-400 transition"
          >
            Show All 50 Games
          </button>
        </div>
      )}
    </div>
  );
}
