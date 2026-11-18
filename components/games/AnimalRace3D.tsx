'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface Racer {
  name: string;
  color: number;
  mesh: THREE.Group;
  posZ: number;
  speed: number;
  laneX: number;
}

export default function AnimalRace3D({ onDone }: Props) {
  const [playerDist, setPlayerDist] = useState(0);
  const [rank, setRank] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    playerZ: 0,
    playerSpeed: 10.0,
    racers: [] as Racer[],
    scene: null as THREE.Scene | null,
    finishZ: -120,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0x38bdf8, 0.02);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const sun = new THREE.DirectionalLight(0xfff5d6, 1.4);
    sun.position.set(10, 20, 15);
    scene.add(ambient, sun);

    // Derby Race Track (4 lanes)
    const trackGeo = new THREE.PlaneGeometry(10, 160);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, -0.01, -60);
    scene.add(track);

    // 4 Wacky Animal Racers
    const racersData = [
      { name: 'Penguin (You)', color: 0x0284c7, laneX: -3.0, isPlayer: true },
      { name: 'Froggy', color: 0x22c55e, laneX: -1.0, isPlayer: false },
      { name: 'Panda', color: 0x18181b, laneX: 1.0, isPlayer: false },
      { name: 'Puppy', color: 0xd97706, laneX: 3.0, isPlayer: false },
    ];

    racersData.forEach((r) => {
      const mesh = createCharacter({ color: r.color, accessory: 'ears', scale: 0.75 });
      mesh.position.set(r.laneX, 0, 0);
      scene.add(mesh);

      stateRef.current.racers.push({
        name: r.name,
        color: r.color,
        mesh,
        posZ: 0,
        speed: 10 + Math.random() * 2,
        laneX: r.laneX,
      });
    });

    // Finish Line Banner at -120
    const bannerGeo = new THREE.BoxGeometry(10, 0.8, 0.2);
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 3, -120);
    scene.add(banner);
  };

  const boostSpeed = () => {
    if (gameOver) return;
    sound.playTap();
    stateRef.current.playerSpeed = Math.min(22.0, stateRef.current.playerSpeed + 2.5);

    if (stateRef.current.scene) {
      stateRef.current.particles.push(
        createParticleBurst(
          stateRef.current.scene,
          new THREE.Vector3(-3.0, 0.4, stateRef.current.playerZ),
          0x00e5ff,
          8
        )
      );
    }
  };

  const onFrame = (dt: number, time: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Player speed decay
    s.playerSpeed = Math.max(9.0, s.playerSpeed - 4.5 * delta);
    s.playerZ -= s.playerSpeed * delta;
    setPlayerDist(Math.floor(-s.playerZ));

    // Update Player Mesh (Racer 0)
    const player = s.racers[0];
    player.posZ = s.playerZ;
    player.mesh.position.z = s.playerZ;
    // Waddling penguin animation
    player.mesh.rotation.z = Math.sin(time * 12) * 0.2;
    player.mesh.position.y = Math.abs(Math.sin(time * 12)) * 0.2;

    // AI Opponent Racers Movement
    for (let i = 1; i < s.racers.length; i++) {
      const bot = s.racers[i];
      bot.posZ -= bot.speed * delta;
      bot.mesh.position.z = bot.posZ;
      bot.mesh.position.y = Math.abs(Math.sin(time * 10 + i)) * 0.3; // hopping!
    }

    // Calculate current live rank
    const sorted = [...s.racers].sort((a, b) => a.posZ - b.posZ); // lower Z is ahead
    const currentRank = sorted.findIndex((r) => r.name.includes('You')) + 1;
    setRank(currentRank);

    // Check finish line
    if (s.playerZ <= s.finishZ || s.racers.some((r) => r.posZ <= s.finishZ)) {
      setGameOver(true);
      if (currentRank === 1) {
        sound.playWin();
        onDone(1500);
      } else {
        sound.playLose();
        onDone(Math.max(200, 1500 - currentRank * 300));
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    stateRef.current.playerZ = 0;
    stateRef.current.playerSpeed = 10.0;
    stateRef.current.racers.forEach((r) => {
      r.posZ = 0;
      r.mesh.position.z = 0;
    });
    setPlayerDist(0);
    setRank(1);
    setGameOver(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-sky-200 select-none" onClick={boostSpeed}>
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[-1, 4.5, 7]}
        cameraLookAt={[-1, 1, -8]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Distance: <span className="text-marigold">{playerDist}m / 120m</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Rank: <span className={rank === 1 ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>#{rank}</span>
        </div>
      </div>

      <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-auto">
        <button
          onClick={boostSpeed}
          className="px-10 py-4 bg-marigold text-ink rounded-full font-black text-xl shadow-2xl active:scale-95 transition"
        >
          TAP RAPIDLY TO SPRINT! 🐾💨
        </button>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{rank === 1 ? '🏆🐧🥇' : '🥈🐾'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {rank === 1 ? '1st Place! You Won Animal Derby!' : `Finished in #${rank} Place!`}
          </h2>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Race Again
          </button>
        </div>
      )}
    </div>
  );
}
