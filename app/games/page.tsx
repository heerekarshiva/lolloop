import { Suspense } from 'react';
import type { Metadata } from 'next';
import GamesExplorer from '@/components/GamesExplorer';

export const metadata: Metadata = {
  title: 'All 50 3D Games',
  description: 'Explore all 50 original 3D LOLLOOP games across Arcade, Puzzle, Multiplayer, Adventure, and Party categories.',
  alternates: { canonical: '/games' },
};

export default function Games() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="py-20 text-center font-bold text-ink/60">Loading 50 3D Games...</div>}>
        <GamesExplorer />
      </Suspense>
    </main>
  );
}
