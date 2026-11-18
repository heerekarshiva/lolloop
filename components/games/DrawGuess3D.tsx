'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { BotDifficulty } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

const PUZZLE_SCULPTURES = [
  {
    name: 'SWORD',
    blocks: [
      { x: 0, y: 0, z: 0, c: 0x78350f }, // hilt
      { x: 0, y: 0.8, z: 0, c: 0xffb800 }, // crossguard
      { x: -0.8, y: 0.8, z: 0, c: 0xffb800 },
      { x: 0.8, y: 0.8, z: 0, c: 0xffb800 },
      { x: 0, y: 1.6, z: 0, c: 0x00e5ff }, // blade
      { x: 0, y: 2.4, z: 0, c: 0x00e5ff },
      { x: 0, y: 3.2, z: 0, c: 0xffffff }, // tip
    ],
    hint: 'A medieval knight weapon (5 letters)',
  },
  {
    name: 'TREE',
    blocks: [
      { x: 0, y: 0, z: 0, c: 0x5d4037 }, // trunk
      { x: 0, y: 0.8, z: 0, c: 0x5d4037 },
      { x: 0, y: 1.6, z: 0, c: 0x22c55e }, // foliage
      { x: -0.8, y: 1.6, z: 0, c: 0x22c55e },
      { x: 0.8, y: 1.6, z: 0, c: 0x22c55e },
      { x: 0, y: 1.6, z: -0.8, c: 0x22c55e },
      { x: 0, y: 1.6, z: 0.8, c: 0x22c55e },
      { x: 0, y: 2.4, z: 0, c: 0x16a34a },
    ],
    hint: 'Grows leaves in nature (4 letters)',
  },
  {
    name: 'HEART',
    blocks: [
      { x: 0, y: 0, z: 0, c: 0xff1744 },
      { x: -0.8, y: 0.8, z: 0, c: 0xff1744 },
      { x: 0.8, y: 0.8, z: 0, c: 0xff1744 },
      { x: -0.8, y: 1.6, z: 0, c: 0xff1744 },
      { x: 0.8, y: 1.6, z: 0, c: 0xff1744 },
      { x: 0, y: 1.2, z: 0, c: 0xff1744 },
    ],
    hint: 'Symbol of love (5 letters)',
  },
];

export default function DrawGuess3D({ onDone, botDifficulty = 'Medium' }: Props) {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [guessInput, setGuessInput] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Watch AI sculpt the 3D voxel item block-by-block!');
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    sculptMesh: new THREE.Group(),
    scene: null as THREE.Scene | null,
    placedBlocks: 0,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const currPuzzle = PUZZLE_SCULPTURES[puzzleIndex];

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.3);
    dir.position.set(5, 12, 8);
    scene.add(ambient, dir);

    // Sculpting Turntable Pedestal
    const turnGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.4, 32);
    const turnMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5 });
    const turntable = new THREE.Mesh(turnGeo, turnMat);
    turntable.position.y = -0.2;
    scene.add(turntable);

    scene.add(stateRef.current.sculptMesh);
  };

  // AI Block Placement Animation
  useEffect(() => {
    stateRef.current.placedBlocks = 0;
    stateRef.current.sculptMesh.clear();

    const interval = setInterval(() => {
      const s = stateRef.current;
      if (s.placedBlocks < currPuzzle.blocks.length) {
        const blk = currPuzzle.blocks[s.placedBlocks];
        const geo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
        const mat = new THREE.MeshStandardMaterial({
          color: blk.c,
          roughness: 0.2,
          metalness: 0.2,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(blk.x, blk.y + 0.38, blk.z);
        s.sculptMesh.add(mesh);

        sound.playTap();
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, mesh.position, blk.c, 8));
        }
        s.placedBlocks++;
      }
    }, 750);

    return () => clearInterval(interval);
  }, [puzzleIndex]);

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameWon) return;

    const cleaned = guessInput.trim().toUpperCase();
    if (cleaned === currPuzzle.name) {
      sound.playScore();
      sound.playWin();
      setFeedback(`Correct! It's a ${currPuzzle.name}! 🎉`);
      setScore((s) => s + 500);

      if (stateRef.current.scene) {
        stateRef.current.particles.push(
          createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 1.5, 0), 0x00e5ff, 25)
        );
      }

      if (puzzleIndex + 1 < PUZZLE_SCULPTURES.length) {
        setTimeout(() => {
          setPuzzleIndex((p) => p + 1);
          setGuessInput('');
          setFeedback('Watch AI sculpt the 3D voxel item block-by-block!');
        }, 1500);
      } else {
        setGameWon(true);
        onDone(score + 1000);
      }
    } else {
      sound.playHit();
      setFeedback(`"${cleaned}" is not it. Look closer at the 3D shape!`);
    }
  };

  const onFrame = (dt: number, time: number) => {
    const delta = Math.min(dt, 0.05);
    // Slowly rotate sculpture turntable in 3D
    stateRef.current.sculptMesh.rotation.y = time * 0.5;
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setPuzzleIndex(0);
    setScore(0);
    setGuessInput('');
    setGameWon(false);
    setFeedback('Watch AI sculpt the 3D voxel item block-by-block!');
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 4.5, 6.5]}
        cameraLookAt={[0, 1.2, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Sculpture: <span className="text-cyan-400">{puzzleIndex + 1} / {PUZZLE_SCULPTURES.length}</span>
        </div>
      </div>

      {/* Hint & Feedback Banner */}
      <div className="absolute top-20 inset-x-6 flex flex-col items-center pointer-events-none">
        <div className="bg-zinc-900/90 text-white px-6 py-2.5 rounded-2xl border border-white/15 text-center shadow-lg max-w-md w-full">
          <p className="text-xs uppercase font-bold text-marigold tracking-widest">Hint: {currQHint()}</p>
          <p className="text-sm font-semibold text-white/90 mt-0.5">{feedback}</p>
        </div>
      </div>

      {/* Guess Input Form */}
      <div className="absolute bottom-6 inset-x-6 flex justify-center pointer-events-auto">
        <form onSubmit={submitGuess} className="flex gap-2 max-w-md w-full">
          <input
            type="text"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder="Type your guess (e.g. SWORD)..."
            className="flex-1 bg-white/20 backdrop-blur text-white placeholder-white/50 px-5 py-3 rounded-2xl border border-white/30 font-bold outline-none focus:ring-2 focus:ring-marigold"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-marigold text-ink rounded-2xl font-black text-base shadow-xl active:scale-95"
          >
            Guess 🎨
          </button>
        </form>
      </div>

      {/* Win Screen */}
      {gameWon && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🏆🎨✨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Master Guesser!</h2>
          <p className="text-xl font-bold mt-2">
            Final Score: <span className="text-marigold">{score} pts</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );

  function currQHint() {
    return currPuzzle.hint;
  }
}
