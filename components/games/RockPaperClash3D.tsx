'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { BotDifficulty, getRockPaperClashChoice } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

type Choice = 'rock' | 'paper' | 'scissors';

export default function RockPaperClash3D({ onDone, botDifficulty = 'Medium' }: Props) {
  const [playerWins, setPlayerWins] = useState(0);
  const [botWins, setBotWins] = useState(0);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [botChoice, setBotChoice] = useState<Choice | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    history: [] as Choice[],
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.4);
    dir.position.set(5, 12, 10);
    scene.add(ambient, dir);

    // Battle Arena
    const arenaGeo = new THREE.CylinderGeometry(5.0, 5.5, 0.5, 32);
    const arenaMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5 });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.position.y = -0.25;
    scene.add(arena);
  };

  const playRound = (choice: Choice) => {
    if (gameOver) return;
    sound.playTap();
    setPlayerChoice(choice);
    stateRef.current.history.push(choice);

    // AI bot picks choice using pattern prediction
    const botPick = getRockPaperClashChoice(stateRef.current.history, botDifficulty);
    setBotChoice(botPick);

    // Evaluate clash
    if (choice === botPick) {
      setRoundWinner('Tie!');
    } else if (
      (choice === 'rock' && botPick === 'scissors') ||
      (choice === 'paper' && botPick === 'rock') ||
      (choice === 'scissors' && botPick === 'paper')
    ) {
      sound.playScore();
      setRoundWinner('You win the clash!');
      if (stateRef.current.scene) {
        stateRef.current.particles.push(
          createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 1, 0), 0x00e5ff, 25)
        );
      }
      setPlayerWins((w) => {
        const nw = w + 1;
        if (nw >= 3) {
          setGameOver(true);
          sound.playWin();
          onDone(1000);
        }
        return nw;
      });
    } else {
      sound.playHit();
      setRoundWinner('AI Bot wins the clash!');
      setBotWins((w) => {
        const nw = w + 1;
        if (nw >= 3) {
          setGameOver(true);
          sound.playLose();
          onDone(200);
        }
        return nw;
      });
    }
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setPlayerWins(0);
    setBotWins(0);
    setRoundWinner(null);
    setPlayerChoice(null);
    setBotChoice(null);
    setGameOver(false);
    stateRef.current.history = [];
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 5.5, 6.5]}
        cameraLookAt={[0, 0.5, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          You: <span className="text-cyan-400">{playerWins} Wins</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Best of 5 Clash
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          AI Bot ({botDifficulty}): <span className="text-red-400">{botWins} Wins</span>
        </div>
      </div>

      {/* Clash Result Showcase */}
      {playerChoice && botChoice && (
        <div className="absolute top-24 inset-x-0 flex flex-col items-center pointer-events-none">
          <div className="bg-zinc-900/90 text-white px-8 py-3 rounded-2xl border border-white/15 text-center shadow-xl">
            <div className="text-3xl font-black flex items-center justify-center gap-6">
              <span>{playerChoice === 'rock' ? '✊' : playerChoice === 'paper' ? '✋' : '✌️'}</span>
              <span className="text-sm font-bold text-marigold">VS</span>
              <span>{botChoice === 'rock' ? '✊' : botChoice === 'paper' ? '✋' : '✌️'}</span>
            </div>
            <p className="text-sm font-bold mt-1 text-cyan-300">{roundWinner}</p>
          </div>
        </div>
      )}

      {/* 3 Choice Buttons */}
      <div className="absolute bottom-6 inset-x-6 flex justify-center gap-4 pointer-events-auto">
        <button
          onClick={() => playRound('rock')}
          className="px-6 py-4 rounded-3xl bg-white/20 backdrop-blur text-white font-black text-xl hover:bg-white hover:text-ink active:scale-95 transition"
        >
          ✊ Rock
        </button>
        <button
          onClick={() => playRound('paper')}
          className="px-6 py-4 rounded-3xl bg-white/20 backdrop-blur text-white font-black text-xl hover:bg-white hover:text-ink active:scale-95 transition"
        >
          ✋ Paper
        </button>
        <button
          onClick={() => playRound('scissors')}
          className="px-6 py-4 rounded-3xl bg-white/20 backdrop-blur text-white font-black text-xl hover:bg-white hover:text-ink active:scale-95 transition"
        >
          ✌️ Scissors
        </button>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{playerWins >= 3 ? '🏆✊' : '🥈🤖'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {playerWins >= 3 ? 'You Won The Tournament!' : 'Bot Claimed The Match!'}
          </h2>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Rematch
          </button>
        </div>
      )}
    </div>
  );
}
