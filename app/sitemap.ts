import type { MetadataRoute } from 'next';
import { GAMES } from '@/lib/games';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return ['', '/feed', '/games', '/games/funny', '/games/quick', '/games/puzzle', '/daily-challenge', '/leaderboard', '/multiplayer', '/about', '/contact', '/privacy', '/terms', ...GAMES.map((g) => `/games/${g.slug}`)].map((p) => ({ url: `${base}${p}` }));
}
