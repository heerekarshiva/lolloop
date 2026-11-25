import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

export interface GameComponentProps {
  onScore?: (n: number) => void;
  onEnd?: (score: number) => void;
  mode?: 'solo' | 'multiplayer';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

function lazy(importFn: () => Promise<{ default: AnyComponent }>): AnyComponent {
  return dynamic(importFn, { ssr: false });
}

const REGISTRY: Record<string, AnyComponent> = {
  'jump-rush':          lazy(() => import('@/components/games/JumpRush3D')),
  'brick-smash':        lazy(() => import('@/components/games/BrickSmash3D')),
  'bubble-pop':         lazy(() => import('@/components/games/BubblePop3D')),
  'slice-master':       lazy(() => import('@/components/games/SliceMaster3D')),
  'bounce-mania':       lazy(() => import('@/components/games/BounceMania3D')),
  'traffic-escape':     lazy(() => import('@/components/games/TrafficEscape3D')),
  'whack-attack':       lazy(() => import('@/components/games/WhackAttack3D')),
  'block-drop':         lazy(() => import('@/components/games/BlockDrop3D')),
  'space-defender':     lazy(() => import('@/components/games/SpaceDefender3D')),
  'sky-hopper':         lazy(() => import('@/components/games/SkyHopper3D')),
  'number-merge':       lazy(() => import('@/components/games/NumberMerge3D')),
  'sudoku-sprint':      lazy(() => import('@/components/games/SudokuSprint3D')),
  'memory-match':       lazy(() => import('@/components/games/MemoryMatch3D')),
  'slide-it':           lazy(() => import('@/components/games/SlideIt3D')),
  'maze-runner':        lazy(() => import('@/components/games/MazeRunner3D')),
  'connect-quest':      lazy(() => import('@/components/games/ConnectQuest3D')),
  'match-mania':        lazy(() => import('@/components/games/MatchMania3D')),
  'spot-the-change':    lazy(() => import('@/components/games/SpotTheChange3D')),
  'logic-lock':         lazy(() => import('@/components/games/LogicLock3D')),
  'word-hunter':        lazy(() => import('@/components/games/WordHunter3D')),
  'tic-tac-toe-battle': lazy(() => import('@/components/games/TicTacToeBattle3D')),
  'duo-dash':           lazy(() => import('@/components/games/DuoDash3D')),
  'quiz-royale':        lazy(() => import('@/components/games/QuizRoyale3D')),
  'tap-war':            lazy(() => import('@/components/games/TapWar3D')),
  'rock-paper-clash':   lazy(() => import('@/components/games/RockPaperClash3D')),
  'four-in-a-row':      lazy(() => import('@/components/games/FourInARow3D')),
  'pong-rivals':        lazy(() => import('@/components/games/PongRivals3D')),
  'snake-arena':        lazy(() => import('@/components/games/SnakeArena3D')),
  'draw-and-guess':     lazy(() => import('@/components/games/DrawGuess3D')),
  'mini-battle-arena':  lazy(() => import('@/components/games/MiniBattleArena3D')),
  'you-and-me':         lazy(() => import('@/components/games/YouAndMe3D')),
  'escape-together':    lazy(() => import('@/components/games/EscapeTogether3D')),
  'jungle-quest':       lazy(() => import('@/components/games/JungleQuest3D')),
  'treasure-hunt':      lazy(() => import('@/components/games/TreasureHunt3D')),
  'castle-escape':      lazy(() => import('@/components/games/CastleEscape3D')),
  'space-buddies':      lazy(() => import('@/components/games/SpaceBuddies3D')),
  'ocean-explorer':     lazy(() => import('@/components/games/OceanExplorer3D')),
  'island-survival':    lazy(() => import('@/components/games/IslandSurvival3D')),
  'robo-rescue':        lazy(() => import('@/components/games/RoboRescue3D')),
  'haunted-escape':     lazy(() => import('@/components/games/HauntedEscape3D')),
  'reaction-master':    lazy(() => import('@/components/games/ReactionMaster3D')),
  'wrong-answer-wins':  lazy(() => import('@/components/games/WrongAnswerWins3D')),
  'dont-press-it':      lazy(() => import('@/components/games/DontPressIt3D')),
  'crazy-wheel':        lazy(() => import('@/components/games/CrazyWheel3D')),
  'dont-fall':          lazy(() => import('@/components/games/DontFall3D')),
  'dodge-master':       lazy(() => import('@/components/games/DodgeMaster3D')),
  'emoji-mystery':      lazy(() => import('@/components/games/EmojiMystery3D')),
  'balloon-burst':      lazy(() => import('@/components/games/BalloonBurst3D')),
  'crazy-chef':         lazy(() => import('@/components/games/CrazyChef3D')),
  'animal-race':        lazy(() => import('@/components/games/AnimalRace3D')),
};

export function isValidSlug(slug: string): boolean {
  return slug in REGISTRY;
}

export function getAllSlugs(): string[] {
  return Object.keys(REGISTRY);
}

export function loadGame(slug: string): AnyComponent | null {
  return REGISTRY[slug] ?? null;
}
