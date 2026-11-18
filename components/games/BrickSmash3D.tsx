'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function BrickSmash3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    score: 0,
    lives: 3,
    paddleX: 0,
    paddleMesh: null as THREE.Mesh | null,
    ballMesh: null as THREE.Mesh | null,
    ballPos: new THREE.Vector3(0, -3.5, 0),
    ballVel: new THREE.Vector3(4.5, 6.5, 0),
    ballActive: false,
    bricks: [] as { mesh: THREE.Mesh; x: number; y: number; active: boolean; hp: number; color: number }[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    arenaWidth: 10,
    arenaHeight: 12,
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x15161a);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const pointLight = new THREE.PointLight(0xffb800, 1.5, 30);
    pointLight.position.set(0, 0, 8);
    scene.add(ambient, pointLight);

    // Frame Borders
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.3 });
    const topWall = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 1), borderMat);
    topWall.position.set(0, 5.8, 0);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 1), borderMat);
    leftWall.position.set(-5.3, 0, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 1), borderMat);
    rightWall.position.set(5.3, 0, 0);
    scene.add(topWall, leftWall, rightWall);

    // Paddle
    const paddleGeo = new THREE.BoxGeometry(2.4, 0.45, 0.8);
    const paddleMat = new THREE.MeshStandardMaterial({
      color: 0xffb800,
      roughness: 0.2,
      metalness: 0.5,
    });
    const paddle = new THREE.Mesh(paddleGeo, paddleMat);
    paddle.position.set(0, -4.5, 0);
    scene.add(paddle);
    stateRef.current.paddleMesh = paddle;

    // Ball
    const ballGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.8,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, -3.5, 0);
    scene.add(ball);
    stateRef.current.ballMesh = ball;

    // Spawn 3D Bricks (5 rows, 7 columns)
    const rows = 5;
    const cols = 7;
    const brickW = 1.25;
    const brickH = 0.5;
    const colors = [0xe91e63, 0xff5722, 0xffb800, 0x4caf50, 0x00bcd4];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * (brickW + 0.15);
        const y = 4.5 - r * (brickH + 0.2);
        const geo = new THREE.BoxGeometry(brickW, brickH, 0.6);
        const mat = new THREE.MeshStandardMaterial({
          color: colors[r % colors.length],
          roughness: 0.3,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, 0);
        scene.add(mesh);
        stateRef.current.bricks.push({
          mesh,
          x,
          y,
          active: true,
          hp: 1,
          color: colors[r % colors.length],
        });
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const targetX = Math.max(-4, Math.min(4, relX * 5));
    stateRef.current.paddleX = targetX;
    if (stateRef.current.paddleMesh) {
      stateRef.current.paddleMesh.position.x = targetX;
    }
    if (!stateRef.current.ballActive && stateRef.current.ballMesh) {
      stateRef.current.ballMesh.position.x = targetX;
      stateRef.current.ballPos.x = targetX;
    }
  };

  const launchBall = () => {
    if (!stateRef.current.ballActive && !gameOver && !gameWon) {
      stateRef.current.ballActive = true;
      stateRef.current.ballVel.set((Math.random() - 0.5) * 4, 7.5, 0);
      sound.playTap();
    }
  };

  const onFrame = (dt: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    if (s.ballActive && s.ballMesh) {
      s.ballPos.addScaledVector(s.ballVel, delta);
      s.ballMesh.position.copy(s.ballPos);

      // Bounce off walls
      if (s.ballPos.x > 4.8) {
        s.ballPos.x = 4.8;
        s.ballVel.x = -Math.abs(s.ballVel.x);
        sound.playPop();
      } else if (s.ballPos.x < -4.8) {
        s.ballPos.x = -4.8;
        s.ballVel.x = Math.abs(s.ballVel.x);
        sound.playPop();
      }
      if (s.ballPos.y > 5.3) {
        s.ballPos.y = 5.3;
        s.ballVel.y = -Math.abs(s.ballVel.y);
        sound.playPop();
      }

      // Paddle Collision
      if (s.paddleMesh && s.ballPos.y <= -4.2 && s.ballPos.y >= -4.6 && s.ballVel.y < 0) {
        const diffX = s.ballPos.x - s.paddleMesh.position.x;
        if (Math.abs(diffX) < 1.35) {
          s.ballVel.y = Math.abs(s.ballVel.y);
          s.ballVel.x = diffX * 6.5; // angle modulation
          sound.playHit();
        }
      }

      // Brick Collision
      for (const b of s.bricks) {
        if (!b.active) continue;
        if (
          Math.abs(s.ballPos.x - b.x) < 0.75 &&
          Math.abs(s.ballPos.y - b.y) < 0.45
        ) {
          b.active = false;
          s.scene?.remove(b.mesh);
          b.mesh.geometry.dispose();

          s.ballVel.y *= -1;
          s.score += 100;
          setScore(s.score);
          sound.playScore();

          if (s.scene) {
            s.particles.push(
              createParticleBurst(s.scene, new THREE.Vector3(b.x, b.y, 0), b.color, 14)
            );
          }

          // Check Win Condition
          if (s.bricks.every((br) => !br.active)) {
            setGameWon(true);
            sound.playWin();
            onDone(s.score + s.lives * 500);
          }
          break;
        }
      }

      // Ball Fell Past Paddle
      if (s.ballPos.y < -6) {
        s.lives -= 1;
        setLives(s.lives);
        sound.playLose();

        if (s.lives <= 0) {
          setGameOver(true);
          onDone(s.score);
        } else {
          // Reset ball to paddle
          s.ballActive = false;
          s.ballPos.set(s.paddleX, -3.5, 0);
          s.ballMesh.position.copy(s.ballPos);
        }
      }
    }

    // Update Particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    setGameWon(false);

    const s = stateRef.current;
    s.score = 0;
    s.lives = 3;
    s.ballActive = false;
    s.ballPos.set(0, -3.5, 0);
    if (s.ballMesh) s.ballMesh.position.copy(s.ballPos);

    // Rebuild bricks
    s.bricks.forEach((b) => s.scene?.remove(b.mesh));
    s.bricks = [];

    const rows = 5;
    const cols = 7;
    const brickW = 1.25;
    const brickH = 0.5;
    const colors = [0xe91e63, 0xff5722, 0xffb800, 0x4caf50, 0x00bcd4];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * (brickW + 0.15);
        const y = 4.5 - r * (brickH + 0.2);
        const geo = new THREE.BoxGeometry(brickW, brickH, 0.6);
        const mat = new THREE.MeshStandardMaterial({
          color: colors[r % colors.length],
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, 0);
        s.scene?.add(mesh);
        s.bricks.push({ mesh, x, y, active: true, hp: 1, color: colors[r % colors.length] });
      }
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-crosshair"
      onPointerMove={onPointerMove}
      onClick={launchBall}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 14]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Lives: {'❤️'.repeat(Math.max(0, lives))}
        </div>
      </div>

      {!stateRef.current.ballActive && !gameOver && !gameWon && (
        <div className="absolute bottom-16 inset-x-0 text-center pointer-events-none">
          <span className="bg-ink/90 text-white text-sm font-extrabold px-5 py-2.5 rounded-full border border-marigold/40 animate-pulse">
            Click / Tap to Launch Ball
          </span>
        </div>
      )}

      {/* Game Over / Won overlay */}
      {(gameOver || gameWon) && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{gameWon ? '🏆' : '💥'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {gameWon ? 'Stage Cleared!' : 'Game Over'}
          </h2>
          <p className="text-xl font-bold mt-2">
            Final Score: <span className="text-marigold">{score}</span>
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
