'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { BotDifficulty } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

export default function DuoDash3D({ onDone, botDifficulty = 'Medium' }: Props) {
  const [playerDist, setPlayerDist] = useState(0);
  const [botDist, setBotDist] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);

  const stateRef = useRef({
    playerZ: 0,
    botZ: 0,
    playerX: -1.2,
    playerY: 0,
    playerVy: 0,
    isGrounded: true,
    playerMesh: null as THREE.Group | null,
    botMesh: null as THREE.Group | null,
    hurdles: [] as { mesh: THREE.Mesh; z: number; lane: number }[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    targetTrackZ: 150,
  });

  const jump = () => {
    const s = stateRef.current;
    if (s.isGrounded && !gameOver) {
      s.playerVy = 9.0;
      s.isGrounded = false;
      sound.playJump();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp') jump();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver]);

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const sun = new THREE.DirectionalLight(0xffb800, 1.3);
    sun.position.set(10, 20, 15);
    scene.add(ambient, sun);

    // Dual Tracks (Lane 1: Player at X = -1.2, Lane 2: Bot at X = 1.2)
    const trackGeo = new THREE.PlaneGeometry(6, 200);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0, -80);
    track.receiveShadow = true;
    scene.add(track);

    // Track divider
    const divGeo = new THREE.PlaneGeometry(0.15, 200);
    const divMat = new THREE.MeshBasicMaterial({ color: 0xffb800 });
    const div = new THREE.Mesh(divGeo, divMat);
    div.rotation.x = -Math.PI / 2;
    div.position.set(0, 0.02, -80);
    scene.add(div);

    // Player Avatar (Left Lane)
    const player = createCharacter({ color: 0x00e5ff, accessory: 'none', scale: 0.75 });
    player.position.set(-1.2, 0, 0);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // AI Bot Avatar (Right Lane)
    const bot = createCharacter({ color: 0xff1744, accessory: 'none', scale: 0.75 });
    bot.position.set(1.2, 0, 0);
    scene.add(bot);
    stateRef.current.botMesh = bot;

    // Spawn Hurdles along track
    for (let z = -15; z > -140; z -= 14 + Math.random() * 8) {
      const hurdleGeo = new THREE.BoxGeometry(1.6, 0.6, 0.2);
      const hurdleMat = new THREE.MeshStandardMaterial({ color: 0xff9100, roughness: 0.3 });

      // Player lane hurdle
      if (Math.random() < 0.7) {
        const hPlayer = new THREE.Mesh(hurdleGeo, hurdleMat);
        hPlayer.position.set(-1.2, 0.3, z);
        scene.add(hPlayer);
        stateRef.current.hurdles.push({ mesh: hPlayer, z, lane: -1 });
      }

      // Bot lane hurdle
      if (Math.random() < 0.7) {
        const hBot = new THREE.Mesh(hurdleGeo, hurdleMat);
        hBot.position.set(1.2, 0.3, z);
        scene.add(hBot);
        stateRef.current.hurdles.push({ mesh: hBot, z, lane: 1 });
      }
    }
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Player running progression
    const playerSpeed = 16.0;
    s.playerZ -= playerSpeed * delta;
    setPlayerDist(Math.floor(-s.playerZ));

    // Player Jump Physics
    s.playerVy -= 22 * delta;
    s.playerY += s.playerVy * delta;
    if (s.playerY <= 0) {
      s.playerY = 0;
      s.playerVy = 0;
      s.isGrounded = true;
    }

    if (s.playerMesh) {
      s.playerMesh.position.set(-1.2, s.playerY, s.playerZ);
      s.playerMesh.rotation.x = s.isGrounded ? Math.sin(Date.now() * 0.02) * 0.1 : -0.2;
    }

    // Bot AI Running & Jumping Behavior
    let botSpeed = 15.5;
    if (botDifficulty === 'Easy') botSpeed = 13.5;
    if (botDifficulty === 'Hard') botSpeed = 16.5;
    if (botDifficulty === 'Expert') botSpeed = 17.5;

    s.botZ -= botSpeed * delta;
    setBotDist(Math.floor(-s.botZ));

    // Bot hurdle jump logic
    const nextBotHurdle = s.hurdles.find((h) => h.lane === 1 && h.z < s.botZ && h.z > s.botZ - 4);
    let botY = 0;
    if (nextBotHurdle) {
      botY = Math.sin(((s.botZ - nextBotHurdle.z) / 4) * Math.PI) * 1.2;
    }

    if (s.botMesh) {
      s.botMesh.position.set(1.2, Math.max(0, botY), s.botZ);
    }

    // Check player hurdle collisions
    for (const h of s.hurdles) {
      if (h.lane === -1 && Math.abs(h.z - s.playerZ) < 0.6) {
        if (s.playerY < 0.5) {
          // Hit hurdle: stumble and slow down!
          sound.playHit();
          s.playerZ += 2.5; // push back
          if (s.scene) {
            s.particles.push(
              createParticleBurst(s.scene, new THREE.Vector3(-1.2, 0.5, s.playerZ), 0xff9100, 10)
            );
          }
        }
      }
    }

    // Check Finish Line (150m)
    if (-s.playerZ >= s.targetTrackZ || -s.botZ >= s.targetTrackZ) {
      const won = -s.playerZ >= -s.botZ;
      setGameOver(true);
      setPlayerWon(won);
      if (won) {
        sound.playWin();
        onDone(1500);
      } else {
        sound.playLose();
        onDone(500);
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    const s = stateRef.current;
    s.playerZ = 0;
    s.botZ = 0;
    s.playerY = 0;
    s.playerVy = 0;
    s.isGrounded = true;
    setPlayerDist(0);
    setBotDist(0);
    setGameOver(false);
    setPlayerWon(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none" onClick={jump}>
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 4.5, 6]}
        cameraLookAt={[0, 1, -12]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          You: <span className="text-cyan-400">{playerDist}m / 150m</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          AI Bot ({botDifficulty}): <span className="text-red-400">{botDist}m / 150m</span>
        </div>
      </div>

      <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-auto">
        <button
          onClick={jump}
          className="px-10 py-4 bg-cyan-400 text-ink font-black text-xl rounded-full shadow-2xl active:scale-95"
        >
          TAP TO LEAP HURDLE 🏃‍♂️
        </button>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{playerWon ? '🏆🏎️' : '🥈🤖'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {playerWon ? 'You Won The Dash!' : 'AI Bot Crossed First!'}
          </h2>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Race Rematch
          </button>
        </div>
      )}
    </div>
  );
}
