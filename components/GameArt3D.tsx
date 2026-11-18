'use client';

import React from 'react';
import { GameInfo } from '@/lib/games';

interface GameArtProps {
  game: GameInfo;
  className?: string;
}

export default function GameArt3D({ game, className = '' }: GameArtProps) {
  const getSceneSVG = (slug: string) => {
    switch (slug) {
      // 1. Jump Rush
      case 'jump-rush':
        return (
          <>
            <path d="M40 380 L160 380 L220 480 L0 480 Z" fill="#37474f" />
            <path d="M220 320 L360 320 L400 440 L180 440 Z" fill="#455a64" />
            <circle cx="160" cy="280" r="32" fill="#ff5722" />
            <path d="M140 280 L180 280 M160 260 L160 300" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
            <polygon points="260,320 275,290 290,320" fill="#ff1744" />
          </>
        );
      // 2. Brick Smash
      case 'brick-smash':
        return (
          <>
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3, 4].map((c) => (
                <rect
                  key={`${r}-${c}`}
                  x={60 + c * 58}
                  y={180 + r * 34}
                  width="50"
                  height="26"
                  rx="6"
                  fill={['#e91e63', '#ff5722', '#ffb800', '#00bcd4'][r]}
                />
              ))
            )}
            <circle cx="200" cy="360" r="14" fill="#ffffff" />
            <rect x="140" y="460" width="120" height="20" rx="10" fill="#ffb800" />
          </>
        );
      // 3. Bubble Pop
      case 'bubble-pop':
        return (
          <>
            <circle cx="120" cy="380" r="45" fill="#00e5ff" opacity="0.75" />
            <circle cx="135" cy="365" r="10" fill="#ffffff" opacity="0.6" />
            <circle cx="280" cy="260" r="60" fill="#80d8ff" opacity="0.8" />
            <circle cx="300" cy="240" r="14" fill="#ffffff" opacity="0.6" />
            <circle cx="190" cy="180" r="35" fill="#e040fb" opacity="0.7" />
            <circle cx="240" cy="440" r="28" fill="#69f0ae" opacity="0.7" />
          </>
        );
      // 4. Slice Master
      case 'slice-master':
        return (
          <>
            <circle cx="160" cy="320" r="48" fill="#ff1744" />
            <path d="M80 400 L320 180" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
            <path d="M220 300 Q260 250 300 280" fill="#ff9100" />
          </>
        );
      // 5. Bounce Mania
      case 'bounce-mania':
        return (
          <>
            <rect x="180" y="140" width="40" height="360" rx="8" fill="#241442" />
            <ellipse cx="200" cy="260" rx="120" ry="24" fill="#7c4dff" />
            <ellipse cx="200" cy="360" rx="120" ry="24" fill="#7c4dff" />
            <circle cx="200" cy="220" r="20" fill="#00e5ff" />
          </>
        );
      // 6. Traffic Escape
      case 'traffic-escape':
        return (
          <>
            <path d="M100 500 L180 200 L220 200 L300 500 Z" fill="#212529" />
            <line x1="200" y1="500" x2="200" y2="200" stroke="#ffb800" strokeWidth="6" strokeDasharray="30 20" />
            <rect x="160" y="380" width="80" height="45" rx="12" fill="#ffb800" />
            <rect x="230" y="270" width="55" height="35" rx="8" fill="#f44336" />
          </>
        );
      // 7. Whack Attack
      case 'whack-attack':
        return (
          <>
            <ellipse cx="200" cy="400" rx="110" ry="40" fill="#1a120b" />
            <ellipse cx="200" cy="350" rx="65" ry="60" fill="#795548" />
            <circle cx="180" cy="330" r="8" fill="#111" />
            <circle cx="220" cy="330" r="8" fill="#111" />
            <ellipse cx="200" cy="360" rx="20" ry="12" fill="#ffab91" />
            <rect x="230" y="220" width="120" height="40" rx="10" fill="#ffb800" transform="rotate(-30 230 220)" />
          </>
        );
      // 8. Block Drop
      case 'block-drop':
        return (
          <>
            <rect x="130" y="380" width="40" height="40" rx="6" fill="#00e5ff" />
            <rect x="170" y="380" width="40" height="40" rx="6" fill="#00e5ff" />
            <rect x="210" y="380" width="40" height="40" rx="6" fill="#00e5ff" />
            <rect x="170" y="340" width="40" height="40" rx="6" fill="#00e5ff" />
            <rect x="210" y="420" width="40" height="40" rx="6" fill="#ff9100" />
            <rect x="250" y="420" width="40" height="40" rx="6" fill="#ff9100" />
          </>
        );
      // 9. Space Defender
      case 'space-defender':
        return (
          <>
            <polygon points="200,280 160,380 240,380" fill="#00e5ff" />
            <polygon points="200,300 130,360 270,360" fill="#1e293b" />
            <line x1="170" y1="280" x2="170" y2="180" stroke="#00e5ff" strokeWidth="4" />
            <line x1="230" y1="280" x2="230" y2="180" stroke="#00e5ff" strokeWidth="4" />
            <circle cx="200" cy="180" r="28" fill="#ff1744" />
          </>
        );
      // 10. Sky Hopper
      case 'sky-hopper':
        return (
          <>
            <ellipse cx="140" cy="400" rx="70" ry="25" fill="#ffffff" opacity="0.9" />
            <ellipse cx="260" cy="300" rx="70" ry="25" fill="#ffffff" opacity="0.9" />
            <circle cx="260" cy="230" r="28" fill="#0284c7" />
          </>
        );
      // 21. Tic Tac Toe Battle
      case 'tic-tac-toe':
        return (
          <>
            <line x1="150" y1="200" x2="150" y2="440" stroke="#3b82f6" strokeWidth="8" />
            <line x1="250" y1="200" x2="250" y2="440" stroke="#3b82f6" strokeWidth="8" />
            <line x1="80" y1="280" x2="320" y2="280" stroke="#3b82f6" strokeWidth="8" />
            <line x1="80" y1="360" x2="320" y2="360" stroke="#3b82f6" strokeWidth="8" />
            <circle cx="200" cy="320" r="30" stroke="#ffb800" strokeWidth="12" fill="none" />
            <path d="M95 215 L135 255 M135 215 L95 255" stroke="#00e5ff" strokeWidth="12" strokeLinecap="round" />
          </>
        );
      // 31. You & Me Signature Co-op
      case 'you-and-me':
        return (
          <>
            {/* Split elemental cavern */}
            <path d="M0 250 L200 250 L200 500 L0 500 Z" fill="#451a03" />
            <path d="M200 250 L400 250 L400 500 L200 500 Z" fill="#082f49" />
            {/* Ember (Fire Hero) */}
            <circle cx="120" cy="320" r="34" fill="#ff5722" />
            <polygon points="120,260 105,290 135,290" fill="#ff3d00" />
            {/* Glacio (Ice Hero) */}
            <circle cx="280" cy="320" r="34" fill="#00e5ff" />
            <polygon points="280,260 265,285 295,285" fill="#38bdf8" />
            {/* Central Portal */}
            <circle cx="200" cy="400" r="45" stroke="#ffd700" strokeWidth="8" fill="none" />
            <path d="M120 400 L280 400" stroke="#fff" strokeWidth="4" strokeDasharray="10 10" />
          </>
        );
      // Default 3D geometric scene
      default:
        return (
          <>
            <circle cx="200" cy="320" r="80" fill={game.accentColor} opacity="0.3" />
            <circle cx="200" cy="320" r="50" fill={game.accentColor} />
            <text x="200" y="335" textAnchor="middle" fontSize="48" fill="#ffffff">
              {game.emoji}
            </text>
          </>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full select-none ${className}`}
      role="img"
      aria-label={`${game.name} 3D artwork`}
    >
      <defs>
        <linearGradient id={`bg-${game.slug}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#191b1f" />
          <stop offset="50%" stopColor="#242730" />
          <stop offset="100%" stopColor="#111317" />
        </linearGradient>
      </defs>

      <rect width="400" height="600" fill={`url(#bg-${game.slug})`} />

      {/* Thematic Scene Rendering */}
      {getSceneSVG(game.slug)}

      {/* Top Floating Badge */}
      <g transform="translate(200, 100)">
        <circle cx="0" cy="0" r="46" fill="#ffffff" filter="drop-shadow(0 6px 16px rgba(0,0,0,0.3))" />
        <text x="0" y="14" textAnchor="middle" fontSize="42">
          {game.emoji}
        </text>
      </g>
    </svg>
  );
}
