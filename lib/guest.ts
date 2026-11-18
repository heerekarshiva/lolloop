export interface GuestScore { id: string; slug: string; score: number; at: number; synced?: boolean }
const K = 'lolloop:scores';
export const readScores = (): GuestScore[] => { try { return JSON.parse(localStorage.getItem(K) || '[]'); } catch { return []; } };
export const writeScores = (l: GuestScore[]) => { try { localStorage.setItem(K, JSON.stringify(l.slice(-200))); } catch { /* storage full/blocked */ } };
export function addScore(slug: string, score: number): GuestScore { const s = { id: crypto.randomUUID(), slug, score, at: Date.now() }; writeScores([...readScores(), s]); return s; }
export const best = (slug: string) => Math.max(0, ...readScores().filter((s) => s.slug === slug).map((s) => s.score));
