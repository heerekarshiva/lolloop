'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

const TRICK_QUESTIONS = [
  {
    q: 'Why did the tomato blush?',
    correct: 'Because it saw the salad dressing!',
    options: ['Photosynthesis', 'Because it saw the salad dressing!', 'Too much nitrogen', 'Sunburn'],
    winIdx: 1,
  },
  {
    q: 'How many months have 28 days?',
    correct: 'All 12 of them!',
    options: ['Only February', 'Just leap years', 'All 12 of them!', 'None'],
    winIdx: 2,
  },
  {
    q: 'What has keys but cannot open any locks?',
    correct: 'A piano!',
    options: ['A master locksmith', 'A keychain', 'A piano!', 'A computer keyboard'],
    winIdx: 2,
  },
];

export default function WrongAnswerWins3D({ onDone }: Props) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const currQ = TRICK_QUESTIONS[qIndex];

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x311042);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const spotlight = new THREE.SpotLight(0xffb800, 2.5);
    spotlight.position.set(0, 10, 8);
    scene.add(ambient, spotlight);

    // Comedy Stage
    const stageGeo = new THREE.CylinderGeometry(5.0, 5.5, 0.6, 32);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x4a044e, roughness: 0.4 });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -0.3;
    scene.add(stage);

    // Golden Comedy Microphone Stand
    const standGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8);
    const standMat = new THREE.MeshStandardMaterial({ color: 0xffb800, metalness: 0.8 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.set(0, 1.4, 0);
    scene.add(stand);

    const micGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const micMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
    const mic = new THREE.Mesh(micGeo, micMat);
    mic.position.set(0, 2.8, 0);
    scene.add(mic);
  };

  const handlePick = (idx: number) => {
    if (gameOver) return;

    if (idx === currQ.winIdx) {
      sound.playScore();
      sound.playWin();
      setFeedback('Brilliant! Hilariously correct absurd answer! 😂');
      setScore((s) => s + 300);

      if (stateRef.current.scene) {
        stateRef.current.particles.push(
          createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 1.5, 0), 0xffb800, 25)
        );
      }

      setTimeout(() => {
        if (qIndex + 1 < TRICK_QUESTIONS.length) {
          setQIndex((q) => q + 1);
          setFeedback('');
        } else {
          setGameOver(true);
          onDone(score + 300);
        }
      }, 1200);
    } else {
      sound.playHit();
      setFeedback('Too boring & serious! The hilarious trick answer wins! 🤪');
    }
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setQIndex(0);
    setScore(0);
    setFeedback('');
    setGameOver(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 3.5, 6]}
        cameraLookAt={[0, 1.5, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Pick the most hilarious trick answer!
        </div>
      </div>

      {/* Question Card */}
      <div className="absolute top-20 inset-x-6 flex flex-col items-center pointer-events-none">
        <div className="bg-slate-900/90 text-white p-5 rounded-3xl border border-white/15 text-center shadow-2xl max-w-lg w-full">
          <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-400">
            Comedy Trick Question {qIndex + 1}
          </span>
          <h2 className="text-xl font-black mt-1 leading-snug">{currQ.q}</h2>
          {feedback && <p className="text-xs font-bold mt-2 text-cyan-300">{feedback}</p>}
        </div>
      </div>

      {/* 4 Choices */}
      <div className="absolute inset-x-6 bottom-6 flex justify-center pointer-events-auto">
        <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
          {currQ.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handlePick(idx)}
              className="py-4 px-4 rounded-2xl bg-white text-ink hover:bg-cream font-black text-sm shadow-lg active:scale-95 transition"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🏆🤪🎤</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Comedy Champion!</h2>
          <p className="text-xl font-bold mt-2">
            Final Comedy Score: <span className="text-marigold">{score} pts</span>
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
}
