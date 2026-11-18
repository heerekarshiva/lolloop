import type { GameInfo } from '@/lib/games';
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
/** Original procedural SVG artwork: unique per game (palette from slug), scene by theme. */
export default function GameArt({ g, className = '' }: { g: GameInfo; className?: string }) {
  const h = hue(g.slug), a = `hsl(${h} 85% 58%)`, b = `hsl(${(h + 40) % 360} 90% 70%)`, id = `g-${g.slug}`;
  const scene = {
    racing: <><path d="M120 600 L190 250 H210 L280 600Z" fill="#191B1F" /><path d="M200 600V250" stroke="#FFB800" strokeWidth="6" strokeDasharray="30 24" /><g transform="translate(150 430)"><rect width="100" height="46" rx="14" fill={a} /><rect x="22" y="-16" width="56" height="24" rx="10" fill="#fff" /><circle cx="22" cy="48" r="10" fill="#191B1F" /><circle cx="78" cy="48" r="10" fill="#191B1F" /></g><path d="M20 300h80M300 340h80M40 400h60" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".7" /></>,
    arcade: <><g fill="#191B1F">{Array.from({ length: 24 }).map((_, i) => <rect key={i} x={70 + (i % 6) * 48} y={180 + Math.floor(i / 6) * 48} width="34" height="34" rx="6" fill={i % 3 ? '#191B1F' : '#FFB800'} />)}</g><rect x="170" y="470" width="60" height="30" rx="8" fill="#fff" /><rect x="196" y="440" width="8" height="30" fill="#fff" /></>,
    puzzle: <>{[[80, 200, a], [200, 200, '#FFB800'], [80, 320, '#fff'], [200, 320, '#191B1F'], [140, 440, b]].map(([x, y, c], i) => <rect key={i} x={x as number} y={y as number} width="110" height="110" rx="26" fill={c as string} transform={`rotate(${i * 7 - 10} ${(x as number) + 55} ${(y as number) + 55})`} />)}</>,
    adventure: <><circle cx="300" cy="130" r="44" fill="#fff" opacity=".9" /><path d="M0 420 120 230 210 360 290 270 400 420V600H0Z" fill="#191B1F" opacity=".85" /><path d="M0 500 140 400 260 490 400 410V600H0Z" fill={a} /><g transform="translate(180 360)"><circle cx="20" cy="10" r="14" fill="#FFB800" /><rect x="6" y="24" width="28" height="40" rx="10" fill="#fff" /></g></>,
    multiplayer: <><g transform="translate(70 380)"><circle cx="40" cy="20" r="34" fill="#FFB800" /><rect x="6" y="56" width="68" height="90" rx="26" fill="#FFB800" /><circle cx="28" cy="18" r="5" fill="#191B1F" /><circle cx="52" cy="18" r="5" fill="#191B1F" /></g><g transform="translate(250 380)"><circle cx="40" cy="20" r="34" fill="#191B1F" /><rect x="6" y="56" width="68" height="90" rx="26" fill="#191B1F" /><circle cx="28" cy="18" r="5" fill="#fff" /><circle cx="52" cy="18" r="5" fill="#fff" /></g><path d="M150 450Q200 400 250 450" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" /></>,
    funny: <><circle cx="200" cy="340" r="120" fill="#191B1F" /><circle cx="200" cy="320" r="100" fill="#FFB800" /><text x="200" y="345" textAnchor="middle" fontSize="28" fontWeight="800" fill="#191B1F">DON'T</text></>,
  }[g.theme];
  return (
    <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={`${g.name} artwork`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={b} /><stop offset="1" stopColor="#FFF5D6" /></linearGradient></defs>
      <rect width="400" height="600" fill={`url(#${id})`} />{scene}
      <text x="200" y="110" textAnchor="middle" fontSize="64">{g.emoji}</text>
    </svg>
  );
}
