'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { GameInfo } from '@/lib/games';
import { BotDifficulty } from '@/lib/bots';
import { sound } from '@/lib/sound';

// Dynamic imports for all 50 3D Games to ensure high performance and lazy loading
const JumpRush3D = dynamic(() => import('./games/JumpRush3D'), { ssr: false });
const BrickSmash3D = dynamic(() => import('./games/BrickSmash3D'), { ssr: false });
const BubblePop3D = dynamic(() => import('./games/BubblePop3D'), { ssr: false });
const SliceMaster3D = dynamic(() => import('./games/SliceMaster3D'), { ssr: false });
const BounceMania3D = dynamic(() => import('./games/BounceMania3D'), { ssr: false });
const TrafficEscape3D = dynamic(() => import('./games/TrafficEscape3D'), { ssr: false });
const WhackAttack3D = dynamic(() => import('./games/WhackAttack3D'), { ssr: false });
const BlockDrop3D = dynamic(() => import('./games/BlockDrop3D'), { ssr: false });
const SpaceDefender3D = dynamic(() => import('./games/SpaceDefender3D'), { ssr: false });
const SkyHopper3D = dynamic(() => import('./games/SkyHopper3D'), { ssr: false });

const NumberMerge3D = dynamic(() => import('./games/NumberMerge3D'), { ssr: false });
const SudokuSprint3D = dynamic(() => import('./games/SudokuSprint3D'), { ssr: false });
const MemoryMatch3D = dynamic(() => import('./games/MemoryMatch3D'), { ssr: false });
const SlideIt3D = dynamic(() => import('./games/SlideIt3D'), { ssr: false });
const MazeRunner3D = dynamic(() => import('./games/MazeRunner3D'), { ssr: false });
const ConnectQuest3D = dynamic(() => import('./games/ConnectQuest3D'), { ssr: false });
const MatchMania3D = dynamic(() => import('./games/MatchMania3D'), { ssr: false });
const SpotTheChange3D = dynamic(() => import('./games/SpotTheChange3D'), { ssr: false });
const LogicLock3D = dynamic(() => import('./games/LogicLock3D'), { ssr: false });
const WordHunter3D = dynamic(() => import('./games/WordHunter3D'), { ssr: false });

const TicTacToeBattle3D = dynamic(() => import('./games/TicTacToeBattle3D'), { ssr: false });
const DuoDash3D = dynamic(() => import('./games/DuoDash3D'), { ssr: false });
const QuizRoyale3D = dynamic(() => import('./games/QuizRoyale3D'), { ssr: false });
const TapWar3D = dynamic(() => import('./games/TapWar3D'), { ssr: false });
const RockPaperClash3D = dynamic(() => import('./games/RockPaperClash3D'), { ssr: false });
const FourInARow3D = dynamic(() => import('./games/FourInARow3D'), { ssr: false });
const PongRivals3D = dynamic(() => import('./games/PongRivals3D'), { ssr: false });
const SnakeArena3D = dynamic(() => import('./games/SnakeArena3D'), { ssr: false });
const DrawGuess3D = dynamic(() => import('./games/DrawGuess3D'), { ssr: false });
const MiniBattleArena3D = dynamic(() => import('./games/MiniBattleArena3D'), { ssr: false });

const YouAndMe3D = dynamic(() => import('./games/YouAndMe3D'), { ssr: false });
const EscapeTogether3D = dynamic(() => import('./games/EscapeTogether3D'), { ssr: false });
const JungleQuest3D = dynamic(() => import('./games/JungleQuest3D'), { ssr: false });
const TreasureHunt3D = dynamic(() => import('./games/TreasureHunt3D'), { ssr: false });
const CastleEscape3D = dynamic(() => import('./games/CastleEscape3D'), { ssr: false });
const SpaceBuddies3D = dynamic(() => import('./games/SpaceBuddies3D'), { ssr: false });
const OceanExplorer3D = dynamic(() => import('./games/OceanExplorer3D'), { ssr: false });
const IslandSurvival3D = dynamic(() => import('./games/IslandSurvival3D'), { ssr: false });
const RoboRescue3D = dynamic(() => import('./games/RoboRescue3D'), { ssr: false });
const HauntedEscape3D = dynamic(() => import('./games/HauntedEscape3D'), { ssr: false });

const ReactionMaster3D = dynamic(() => import('./games/ReactionMaster3D'), { ssr: false });
const WrongAnswerWins3D = dynamic(() => import('./games/WrongAnswerWins3D'), { ssr: false });
const DontPressIt3D = dynamic(() => import('./games/DontPressIt3D'), { ssr: false });
const CrazyWheel3D = dynamic(() => import('./games/CrazyWheel3D'), { ssr: false });
const DontFall3D = dynamic(() => import('./games/DontFall3D'), { ssr: false });
const DodgeMaster3D = dynamic(() => import('./games/DodgeMaster3D'), { ssr: false });
const EmojiMystery3D = dynamic(() => import('./games/EmojiMystery3D'), { ssr: false });
const BalloonBurst3D = dynamic(() => import('./games/BalloonBurst3D'), { ssr: false });
const CrazyChef3D = dynamic(() => import('./games/CrazyChef3D'), { ssr: false });
const AnimalRace3D = dynamic(() => import('./games/AnimalRace3D'), { ssr: false });

interface GameRunnerProps {
  game: GameInfo;
  autoStart?: boolean;
  onDone?: (score: number) => void;
}

export default function GameRunner3D({ game, autoStart = false, onDone }: GameRunnerProps) {
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('Medium');
  const [gameMode, setGameMode] = useState<'solo' | 'friends' | 'matchmaking'>('solo');

  const handleFinish = (score: number) => {
    if (onDone) onDone(score);
  };

  const startGame = () => {
    sound.playMusic(game.theme);
    setIsPlaying(true);
  };

  if (!isPlaying) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-ink/10 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="text-6xl inline-block">{game.emoji}</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">{game.name}</h2>
          <p className="text-sm font-semibold text-ink/70 max-w-md mx-auto">{game.description}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <span className="px-3 py-1 rounded-full bg-cream text-ink text-xs font-bold uppercase tracking-wider">
              {game.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-field text-ink text-xs font-bold">
              {game.playerCount}
            </span>
          </div>
        </div>

        {/* Multiplayer Game Mode Selector */}
        {game.isMultiplayer && (
          <div className="space-y-4 pt-2 border-t border-ink/10">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink/80 text-center">
              Choose Game Mode
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => setGameMode('solo')}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  gameMode === 'solo'
                    ? 'border-ink bg-cream ring-2 ring-marigold'
                    : 'border-ink/10 hover:bg-field'
                }`}
              >
                <span className="block font-extrabold text-sm text-ink">1. Play Solo vs AI</span>
                <span className="block text-xs font-semibold text-ink/60 mt-0.5">
                  Play alone with smart bots
                </span>
              </button>

              <Link
                href={`/multiplayer?game=${game.slug}`}
                className="p-3.5 rounded-2xl border border-ink/10 text-left hover:bg-field transition"
              >
                <span className="block font-extrabold text-sm text-ink">2. Play With Friends</span>
                <span className="block text-xs font-semibold text-ink/60 mt-0.5">
                  Create room & send invite link
                </span>
              </Link>

              <Link
                href={`/multiplayer?game=${game.slug}&match=true`}
                className="p-3.5 rounded-2xl border border-ink/10 text-left hover:bg-field transition"
              >
                <span className="block font-extrabold text-sm text-ink">3. Online Match</span>
                <span className="block text-xs font-semibold text-ink/60 mt-0.5">
                  Instant public matchmaking
                </span>
              </Link>
            </div>

            {/* AI Difficulty Selector */}
            {gameMode === 'solo' && (
              <div className="pt-2 text-center">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ink/70 mr-3">
                  AI Difficulty:
                </span>
                <div className="inline-flex rounded-full bg-field p-1 gap-1 border border-ink/10">
                  {(['Easy', 'Medium', 'Hard', 'Expert'] as BotDifficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDifficulty(d)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                        selectedDifficulty === d
                          ? 'bg-ink text-white shadow-sm'
                          : 'text-ink/70 hover:text-ink'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* How to Play Card */}
        <div className="bg-field rounded-2xl p-4 text-xs font-semibold text-ink/80 flex items-start gap-2.5">
          <span className="text-lg">💡</span>
          <div>
            <strong className="block text-ink text-sm">How to Play:</strong>
            {game.instructions}
          </div>
        </div>

        {/* Play Action */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-full bg-marigold text-ink font-extrabold text-lg shadow-lg hover:scale-102 active:scale-98 transition text-center"
          >
            Launch 3D Game 🎮
          </button>
          <button
            onClick={() => sound.toggleMusic(game.theme)}
            className="px-5 py-3.5 rounded-full bg-field text-ink font-bold text-sm hover:bg-cream transition flex items-center justify-center gap-2"
          >
            <span>🎵</span> Add Music
          </button>
        </div>
      </div>
    );
  }

  // Active 3D Game Renderer based on Slug
  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl bg-ink">
      {renderGame(game.slug, handleFinish, selectedDifficulty)}
    </div>
  );
}

function renderGame(slug: string, onDone: (s: number) => void, difficulty: BotDifficulty) {
  switch (slug) {
    // Category A: Arcade (1-10)
    case 'jump-rush': return <JumpRush3D onDone={onDone} />;
    case 'brick-smash': return <BrickSmash3D onDone={onDone} />;
    case 'bubble-pop': return <BubblePop3D onDone={onDone} />;
    case 'slice-master': return <SliceMaster3D onDone={onDone} />;
    case 'bounce-mania': return <BounceMania3D onDone={onDone} />;
    case 'traffic-escape': return <TrafficEscape3D onDone={onDone} />;
    case 'whack-attack': return <WhackAttack3D onDone={onDone} />;
    case 'block-drop': return <BlockDrop3D onDone={onDone} />;
    case 'space-defender': return <SpaceDefender3D onDone={onDone} />;
    case 'sky-hopper': return <SkyHopper3D onDone={onDone} />;

    // Category B: Puzzle & Brain (11-20)
    case 'number-merge': return <NumberMerge3D onDone={onDone} />;
    case 'sudoku-sprint': return <SudokuSprint3D onDone={onDone} />;
    case 'memory-match': return <MemoryMatch3D onDone={onDone} />;
    case 'slide-it': return <SlideIt3D onDone={onDone} />;
    case 'maze-runner': return <MazeRunner3D onDone={onDone} />;
    case 'connect-quest': return <ConnectQuest3D onDone={onDone} />;
    case 'match-mania': return <MatchMania3D onDone={onDone} />;
    case 'spot-the-change': return <SpotTheChange3D onDone={onDone} />;
    case 'logic-lock': return <LogicLock3D onDone={onDone} />;
    case 'word-hunter': return <WordHunter3D onDone={onDone} />;

    // Category C: Multiplayer (21-30)
    case 'tic-tac-toe': return <TicTacToeBattle3D onDone={onDone} botDifficulty={difficulty} />;
    case 'duo-dash': return <DuoDash3D onDone={onDone} botDifficulty={difficulty} />;
    case 'quiz-royale': return <QuizRoyale3D onDone={onDone} botDifficulty={difficulty} />;
    case 'tap-war': return <TapWar3D onDone={onDone} botDifficulty={difficulty} />;
    case 'rock-paper-clash': return <RockPaperClash3D onDone={onDone} botDifficulty={difficulty} />;
    case 'four-in-a-row': return <FourInARow3D onDone={onDone} botDifficulty={difficulty} />;
    case 'pong-rivals': return <PongRivals3D onDone={onDone} botDifficulty={difficulty} />;
    case 'snake-arena': return <SnakeArena3D onDone={onDone} botDifficulty={difficulty} />;
    case 'draw-guess': return <DrawGuess3D onDone={onDone} botDifficulty={difficulty} />;
    case 'mini-battle-arena': return <MiniBattleArena3D onDone={onDone} botDifficulty={difficulty} />;

    // Category D: Adventure & Cooperative (31-40)
    case 'you-and-me': return <YouAndMe3D onDone={onDone} />;
    case 'escape-together': return <EscapeTogether3D onDone={onDone} />;
    case 'jungle-quest': return <JungleQuest3D onDone={onDone} />;
    case 'treasure-hunt': return <TreasureHunt3D onDone={onDone} />;
    case 'castle-escape': return <CastleEscape3D onDone={onDone} />;
    case 'space-buddies': return <SpaceBuddies3D onDone={onDone} />;
    case 'ocean-explorer': return <OceanExplorer3D onDone={onDone} />;
    case 'island-survival': return <IslandSurvival3D onDone={onDone} />;
    case 'robo-rescue': return <RoboRescue3D onDone={onDone} />;
    case 'haunted-escape': return <HauntedEscape3D onDone={onDone} />;

    // Category E: Funny & Party (41-50)
    case 'reaction-master': return <ReactionMaster3D onDone={onDone} />;
    case 'wrong-answer-wins': return <WrongAnswerWins3D onDone={onDone} />;
    case 'dont-press-it': return <DontPressIt3D onDone={onDone} />;
    case 'crazy-wheel': return <CrazyWheel3D onDone={onDone} />;
    case 'dont-fall': return <DontFall3D onDone={onDone} />;
    case 'dodge-master': return <DodgeMaster3D onDone={onDone} />;
    case 'emoji-mystery': return <EmojiMystery3D onDone={onDone} />;
    case 'balloon-burst': return <BalloonBurst3D onDone={onDone} />;
    case 'crazy-chef': return <CrazyChef3D onDone={onDone} />;
    case 'animal-race': return <AnimalRace3D onDone={onDone} />;

    default:
      return <JumpRush3D onDone={onDone} />;
  }
}
