'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { BotDifficulty, updatePongPaddleAI } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

export default function PongRivals3D({ onDone, botDifficulty = 'Medium' }: Props) {
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);

  const stateRef = useRef({
    playerScore: 0,
    botScore: 0,
    playerY: 0,
    botY: 0,
    ballPos: new THREE.Vector3(0, 0, 0),
    ballVel: new THREE.Vector3(7.5, 3.5, 0),
    playerPaddleMesh: null as THREE.Mesh | null,
    botPaddleMesh: null as THREE.Mesh | null,
    ballMesh: null as THREE.Mesh | null,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x0a0a0f);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0x00e5ff, 1.4);
    dir.position.set(0, 5, 10);
    scene.add(ambient, dir);

    // Neon Cyber Table Board
    const tableGeo = new THREE.BoxGeometry(14, 8, 0.2);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.z = -0.2;
    scene.add(table);

    // Center Net Line
    const netGeo = new THREE.BoxGeometry(0.1, 8, 0.25);
    const netMat = new THREE.MeshBasicMaterial({ color: 0x374151 });
    const net = new THREE.Mesh(netGeo, netMat);
    scene.add(net);

    // Player Paddle (Left - Cyan)
    const padGeo = new THREE.BoxGeometry(0.4, 1.8, 0.4);
    const playerMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.6,
    });
    const playerPaddle = new THREE.Mesh(padGeo, playerMat);
    playerPaddle.position.set(-6.2, 0, 0);
    scene.add(playerPaddle);
    stateRef.current.playerPaddleMesh = playerPaddle;

    // Bot Paddle (Right - Red)
    const botMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xd50000,
      emissiveIntensity: 0.6,
    });
    const botPaddle = new THREE.Mesh(padGeo, botMat);
    botPaddle.position.set(6.2, 0, 0);
    scene.add(botPaddle);
    stateRef.current.botPaddleMesh = botPaddle;

    // Glowing Neon Ball
    const ballGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffb800,
      emissive: 0xff9800,
      emissiveIntensity: 0.8,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    scene.add(ball);
    stateRef.current.ballMesh = ball;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    const targetY = Math.max(-3.1, Math.min(3.1, ny * 3.5));
    stateRef.current.playerY = targetY;
    if (stateRef.current.playerPaddleMesh) {
      stateRef.current.playerPaddleMesh.position.y = targetY;
    }
  };

  const resetBall = (serveToPlayer: boolean) => {
    const s = stateRef.current;
    s.ballPos.set(0, 0, 0);
    const dirX = serveToPlayer ? -1 : 1;
    s.ballVel.set(dirX * 7.5, (Math.random() - 0.5) * 6, 0);
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Ball movement
    s.ballPos.addScaledVector(s.ballVel, delta);
    if (s.ballMesh) s.ballMesh.position.copy(s.ballPos);

    // Top / Bottom wall bounce
    if (s.ballPos.y > 3.6) {
      s.ballPos.y = 3.6;
      s.ballVel.y = -Math.abs(s.ballVel.y);
      sound.playPop();
    } else if (s.ballPos.y < -3.6) {
      s.ballPos.y = -3.6;
      s.ballVel.y = Math.abs(s.ballVel.y);
      sound.playPop();
    }

    // AI Bot Paddle Movement
    s.botY = updatePongPaddleAI(s.botY, s.ballPos.y, s.ballVel.y, botDifficulty);
    s.botY = Math.max(-3.1, Math.min(3.1, s.botY));
    if (s.botPaddleMesh) s.botPaddleMesh.position.y = s.botY;

    // Player Paddle Collision (X = -6.2)
    if (s.ballPos.x <= -5.9 && s.ballPos.x >= -6.5 && s.ballVel.x < 0) {
      if (Math.abs(s.ballPos.y - s.playerY) < 1.1) {
        s.ballVel.x = Math.abs(s.ballVel.x) * 1.05; // speed up
        s.ballVel.y = (s.ballPos.y - s.playerY) * 5.0; // angle deflection
        sound.playHit();
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, s.ballPos, 0x00e5ff, 12));
        }
      }
    }

    // Bot Paddle Collision (X = 6.2)
    if (s.ballPos.x >= 5.9 && s.ballPos.x <= 6.5 && s.ballVel.x > 0) {
      if (Math.abs(s.ballPos.y - s.botY) < 1.1) {
        s.ballVel.x = -Math.abs(s.ballVel.x) * 1.05;
        s.ballVel.y = (s.ballPos.y - s.botY) * 5.0;
        sound.playHit();
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, s.ballPos, 0xff1744, 12));
        }
      }
    }

    // Goal: Player scores (ball passes right side)
    if (s.ballPos.x > 7.5) {
      sound.playScore();
      s.playerScore += 1;
      setPlayerScore(s.playerScore);
      if (s.playerScore >= 5) {
        setGameOver(true);
        setPlayerWon(true);
        sound.playWin();
        onDone(1200);
      } else {
        resetBall(false);
      }
    }

    // Goal: Bot scores (ball passes left side)
    if (s.ballPos.x < -7.5) {
      sound.playLose();
      s.botScore += 1;
      setBotScore(s.botScore);
      if (s.botScore >= 5) {
        setGameOver(true);
        setPlayerWon(false);
        onDone(300);
      } else {
        resetBall(true);
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    stateRef.current.playerScore = 0;
    stateRef.current.botScore = 0;
    setPlayerScore(0);
    setBotScore(0);
    setGameOver(false);
    setPlayerWon(false);
    resetBall(true);
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-ns-resize touch-none"
      onPointerMove={handlePointerMove}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 10.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          You: <span className="text-cyan-400 font-black">{playerScore}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          First to 5 Points Wins
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          AI Bot ({botDifficulty}): <span className="text-red-400 font-black">{botScore}</span>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Move cursor / finger up and down to position your paddle!
        </span>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{playerWon ? '🏆🏓' : '🥈🤖'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {playerWon ? 'You Beat The AI Bot!' : 'AI Bot Won The Match!'}
          </h2>
          <p className="text-xl font-bold mt-2">
            Final Score: {playerScore} - {botScore}
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
