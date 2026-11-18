'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { GAMES, GameInfo } from '@/lib/games';
import GameArt3D from '@/components/GameArt3D';
import GameRunner3D from '@/components/GameRunner3D';
import { sound } from '@/lib/sound';

export default function Feed() {
  const [items, setItems] = useState<GameInfo[]>([]);
  const [active, setActive] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [likes, setLikes] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize feed with shuffled games
  useEffect(() => {
    const shuffled = [...GAMES].sort(() => Math.random() - 0.5);
    setItems(shuffled);

    try {
      const savedLikes = JSON.parse(localStorage.getItem('lolloop:likes') || '[]');
      setLikes(savedLikes);
    } catch {}
  }, []);

  // Intersection observer to track active full-screen card
  const observe = useCallback((el: HTMLElement | null, index: number) => {
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(index);
          setPlayingIndex(null);
          // Auto switch music soundtrack to matching game theme
          sound.playMusic(items[index]?.theme || 'arcade');
        }
      },
      { root: containerRef.current, threshold: 0.6 }
    );
    obs.observe(el);
  }, [items]);

  const toggleLike = (slug: string) => {
    const isLiked = likes.includes(slug);
    const updated = isLiked ? likes.filter((s) => s !== slug) : [...likes, slug];
    setLikes(updated);
    try {
      localStorage.setItem('lolloop:likes', JSON.stringify(updated));
    } catch {}
    sound.playScore();
  };

  const shareGame = async (game: GameInfo) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/games/${game.slug}`;
    const text = `Play ${game.name} on LOLLOOP 3D! ${game.description}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: game.name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        sound.playScore();
      }
    } catch {}
  };

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain bg-ink select-none"
      style={{ scrollBehavior: 'smooth' }}
    >
      {items.map((game, idx) => (
        <section
          key={`${game.slug}-${idx}`}
          ref={(el) => observe(el, idx)}
          className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden flex flex-col justify-end"
        >
          {/* Background 3D Artwork (Rendered for active card and neighbor cards) */}
          {Math.abs(idx - active) <= 1 && (
            <div className="absolute inset-0 z-0">
              <GameArt3D game={game} />
            </div>
          )}

          {/* Gradients */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

          {/* Active In-Feed 3D Gameplay Overlay */}
          {playingIndex === idx ? (
            <div className="absolute inset-0 z-30 bg-ink/95 flex flex-col justify-center items-center p-4">
              <div className="w-full max-w-xl">
                <GameRunner3D game={game} autoStart />
              </div>
              <button
                onClick={() => setPlayingIndex(null)}
                className="fixed top-6 right-6 z-40 px-5 py-2.5 rounded-full bg-white text-ink font-black text-sm shadow-xl active:scale-95"
              >
                Close Game ✕
              </button>
            </div>
          ) : (
            /* Bottom Card Metadata & Actions */
            <div className="relative z-20 flex items-end justify-between p-6 pb-12 max-w-4xl mx-auto w-full gap-4 text-white">
              <div className="space-y-2 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-marigold text-ink text-xs font-black uppercase tracking-wider">
                    {game.category}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white text-xs font-bold">
                    {game.playerCount}
                  </span>
                  {game.isMultiplayer && (
                    <span className="px-3 py-1 rounded-full bg-cyan-400 text-ink text-xs font-black">
                      MULTIPLAYER
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">
                  {game.name}
                </h1>
                <p className="text-sm font-semibold text-white/80 line-clamp-2">
                  {game.description}
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setPlayingIndex(idx)}
                    className="px-8 py-3.5 rounded-full bg-marigold text-ink font-extrabold text-base shadow-xl hover:scale-105 active:scale-95 transition"
                  >
                    Play 3D 🎮
                  </button>

                  <Link
                    href={`/games/${game.slug}`}
                    className="px-6 py-3.5 rounded-full bg-white/20 backdrop-blur text-white font-bold text-sm hover:bg-white/30 transition"
                  >
                    Details ℹ️
                  </Link>
                </div>
              </div>

              {/* Action Buttons Column */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => toggleLike(game.slug)}
                  aria-label="Like game"
                  className={`w-13 h-13 rounded-full flex flex-col items-center justify-center p-3 backdrop-blur shadow-lg transition active:scale-90 ${
                    likes.includes(game.slug)
                      ? 'bg-red-500 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <span className="text-xl">{likes.includes(game.slug) ? '❤️' : '🤍'}</span>
                </button>

                <button
                  onClick={() => shareGame(game)}
                  aria-label="Share game"
                  className="w-13 h-13 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center p-3 text-white shadow-lg active:scale-90 transition"
                >
                  <span className="text-xl">↗</span>
                </button>

                <button
                  onClick={() => sound.toggleMusic(game.theme)}
                  aria-label="Toggle music"
                  className="w-13 h-13 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center p-3 text-white shadow-lg active:scale-90 transition"
                >
                  <span className="text-xl">🎵</span>
                </button>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
