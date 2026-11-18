'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { BotDifficulty, getQuizBotAnswer } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

interface Question {
  q: string;
  options: string[];
  correct: number;
}

const TRIVIA: Question[] = [
  { q: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], correct: 1 },
  { q: 'What is the speed of sound in dry air?', options: ['343 m/s', '150 m/s', '800 m/s', '1200 m/s'], correct: 0 },
  { q: 'How many bones are in the adult human body?', options: ['180', '206', '240', '300'], correct: 1 },
  { q: 'Which element has the chemical symbol "Au"?', options: ['Silver', 'Gold', 'Iron', 'Copper'], correct: 1 },
  { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], correct: 2 },
];

export default function QuizRoyale3D({ onDone, botDifficulty = 'Medium' }: Props) {
  const [qIndex, setQIndex] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [botAnswered, setBotAnswered] = useState<number | null>(null);
  const [questionTimer, setQuestionTimer] = useState(10);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const currQ = TRIVIA[qIndex];

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x1e1b4b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const spotlight = new THREE.SpotLight(0xffb800, 2.5);
    spotlight.position.set(0, 15, 8);
    spotlight.angle = Math.PI / 4;
    scene.add(ambient, spotlight);

    // Stage Platform
    const stageGeo = new THREE.CylinderGeometry(5.5, 6.0, 0.6, 32);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x312e81, metalness: 0.5, roughness: 0.3 });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -0.3;
    scene.add(stage);

    // Two Podiums (Left = Player, Right = AI Bot)
    [-2.2, 2.2].forEach((x, idx) => {
      const podGeo = new THREE.BoxGeometry(1.4, 1.8, 1.2);
      const podMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x00e5ff : 0xff1744,
        roughness: 0.2,
      });
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(x, 0.9, 0);
      scene.add(pod);

      // Buzzer button on top
      const buzzGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16);
      const buzzMat = new THREE.MeshStandardMaterial({ color: 0xffb800, metalness: 0.8 });
      const buzz = new THREE.Mesh(buzzGeo, buzzMat);
      buzz.position.set(x, 1.85, 0);
      scene.add(buzz);
    });
  };

  const handleAnswer = (choiceIdx: number) => {
    if (selectedOption !== null || gameOver) return;
    setSelectedOption(choiceIdx);

    if (choiceIdx === currQ.correct) {
      sound.playScore();
      setPlayerScore((s) => s + questionTimer * 30);
      if (stateRef.current.scene) {
        stateRef.current.particles.push(
          createParticleBurst(stateRef.current.scene, new THREE.Vector3(-2.2, 2.2, 0), 0x00e5ff, 20)
        );
      }
    } else {
      sound.playHit();
    }
  };

  // Bot intelligence logic
  useEffect(() => {
    if (gameOver || selectedOption !== null) return;
    const { choice, delayMs } = getQuizBotAnswer(currQ.correct, 4, botDifficulty);

    const timer = setTimeout(() => {
      setBotAnswered(choice);
      if (choice === currQ.correct) {
        setBotScore((s) => s + 250);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [qIndex, gameOver]);

  // Question countdown
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setQuestionTimer((t) => {
        if (t <= 1) {
          // Advance question
          nextQuestion();
          return 10;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qIndex, gameOver]);

  const nextQuestion = () => {
    setSelectedOption(null);
    setBotAnswered(null);
    setQuestionTimer(10);

    if (qIndex + 1 < TRIVIA.length) {
      setQIndex((q) => q + 1);
    } else {
      setGameOver(true);
      sound.playWin();
      onDone(playerScore);
    }
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setQIndex(0);
    setPlayerScore(0);
    setBotScore(0);
    setSelectedOption(null);
    setBotAnswered(null);
    setQuestionTimer(10);
    setGameOver(false);
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
          You: <span className="text-cyan-400">{playerScore} pts</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Timer: <span className={questionTimer < 4 ? 'text-red-400 animate-pulse' : 'text-white'}>{questionTimer}s</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          AI Bot ({botDifficulty}): <span className="text-red-400">{botScore} pts</span>
        </div>
      </div>

      {/* Question Card Overlay */}
      <div className="absolute inset-x-6 top-20 flex flex-col items-center pointer-events-none">
        <div className="bg-slate-900/90 text-white p-5 rounded-3xl border border-white/15 text-center shadow-2xl max-w-lg w-full">
          <span className="text-xs font-bold uppercase tracking-widest text-marigold">
            Question {qIndex + 1} of {TRIVIA.length}
          </span>
          <h2 className="text-xl font-black mt-1 leading-snug">{currQ.q}</h2>
        </div>
      </div>

      {/* 4 Choices Buttons */}
      <div className="absolute inset-x-6 bottom-6 flex justify-center pointer-events-auto">
        <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
          {currQ.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currQ.correct;
            const isRevealed = selectedOption !== null || botAnswered !== null;

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={`py-4 px-4 rounded-2xl font-black text-base shadow-lg transition-all ${
                  isRevealed
                    ? isCorrect
                      ? 'bg-emerald-500 text-ink scale-102 ring-4 ring-emerald-300'
                      : isSelected
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-white/50'
                    : 'bg-white text-ink hover:bg-cream active:scale-95'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{playerScore >= botScore ? '🏆🎙️' : '🥈🤖'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {playerScore >= botScore ? 'You Won Quiz Royale!' : 'AI Bot Outscored You!'}
          </h2>
          <p className="text-xl font-bold mt-2">
            Final Score: <span className="text-cyan-400">{playerScore}</span> vs Bot{' '}
            <span className="text-red-400">{botScore}</span>
          </p>
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
