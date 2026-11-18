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

interface SumoBrawler {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  isAlive: boolean;
  isPlayer: boolean;
}

export default function MiniBattleArena3D({ onDone, botDifficulty = 'Medium' }: Props) {
  const [knockouts, setKnockouts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);

  const stateRef = useRef({
    brawlers: [] as SumoBrawler[],
    keysDown: { w: false, s: false, a: false, d: false, space: false },
    dashCooldown: 0,
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    arenaRadius: 5.5,
  });

  const createBumperBot = (color: number): THREE.Group => {
    const group = new THREE.Group();
    // Bumper ring
    const ringGeo = new THREE.CylinderGeometry(0.7, 0.75, 0.4, 16);
    const ringMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.2;
    ring.castShadow = true;
    group.add(ring);

    // Glowing dome
    const domeGeo = new THREE.SphereGeometry(0.45, 12, 12);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.8,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.45;
    group.add(dome);

    return group;
  };

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x0f172a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.4);
    dir.position.set(5, 15, 10);
    scene.add(ambient, dir);

    // Floating Circular Sumo Platform
    const platGeo = new THREE.CylinderGeometry(5.5, 5.0, 0.6, 32);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.y = -0.3;
    platform.receiveShadow = true;
    scene.add(platform);

    // Ring Border
    const ringGeo = new THREE.TorusGeometry(5.4, 0.12, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffb800 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    // 1 Player Brawler (Cyan)
    const playerMesh = createBumperBot(0x00e5ff);
    playerMesh.position.set(0, 0, 2.5);
    scene.add(playerMesh);
    stateRef.current.brawlers.push({
      mesh: playerMesh,
      pos: new THREE.Vector3(0, 0, 2.5),
      vel: new THREE.Vector3(),
      isAlive: true,
      isPlayer: true,
    });

    // 3 Bot Opponents (Red, Orange, Purple)
    const botColors = [0xff1744, 0xff9100, 0xa855f7];
    const botStarts = [
      new THREE.Vector3(0, 0, -2.5),
      new THREE.Vector3(-2.5, 0, 0),
      new THREE.Vector3(2.5, 0, 0),
    ];

    botStarts.forEach((pos, idx) => {
      const botMesh = createBumperBot(botColors[idx]);
      botMesh.position.copy(pos);
      scene.add(botMesh);
      stateRef.current.brawlers.push({
        mesh: botMesh,
        pos,
        vel: new THREE.Vector3(),
        isAlive: true,
        isPlayer: false,
      });
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') stateRef.current.keysDown.w = true;
      if (k === 's' || k === 'arrowdown') stateRef.current.keysDown.s = true;
      if (k === 'a' || k === 'arrowleft') stateRef.current.keysDown.a = true;
      if (k === 'd' || k === 'arrowright') stateRef.current.keysDown.d = true;
      if (e.code === 'Space') dashRam();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') stateRef.current.keysDown.w = false;
      if (k === 's' || k === 'arrowdown') stateRef.current.keysDown.s = false;
      if (k === 'a' || k === 'arrowleft') stateRef.current.keysDown.a = false;
      if (k === 'd' || k === 'arrowright') stateRef.current.keysDown.d = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameOver]);

  const dashRam = () => {
    const s = stateRef.current;
    if (s.dashCooldown > 0 || gameOver) return;
    s.dashCooldown = 0.9;
    sound.playTap();

    const player = s.brawlers[0];
    const moveDir = new THREE.Vector3();
    if (s.keysDown.w) moveDir.z -= 1;
    if (s.keysDown.s) moveDir.z += 1;
    if (s.keysDown.a) moveDir.x -= 1;
    if (s.keysDown.d) moveDir.x += 1;

    if (moveDir.lengthSq() === 0) moveDir.z = -1;
    moveDir.normalize();
    player.vel.addScaledVector(moveDir, 16.0); // massive impulse!
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    if (s.dashCooldown > 0) s.dashCooldown -= delta;

    const player = s.brawlers[0];

    // Player Movement Input
    const accel = 14.0 * delta;
    if (s.keysDown.w) player.vel.z -= accel;
    if (s.keysDown.s) player.vel.z += accel;
    if (s.keysDown.a) player.vel.x -= accel;
    if (s.keysDown.d) player.vel.x += accel;

    // AI Bots combat behaviour (seek player and charge)
    for (let i = 1; i < s.brawlers.length; i++) {
      const bot = s.brawlers[i];
      if (!bot.isAlive) continue;

      const target = player.isAlive ? player.pos : new THREE.Vector3(0, 0, 0);
      const toTarget = target.clone().sub(bot.pos).normalize();
      const botAccel = (botDifficulty === 'Easy' ? 8.0 : botDifficulty === 'Hard' ? 14.0 : 11.0) * delta;
      bot.vel.addScaledVector(toTarget, botAccel);
    }

    // Physics Integration & Drag
    s.brawlers.forEach((b) => {
      if (!b.isAlive) {
        b.pos.y -= 14 * delta; // falling into abyss
        b.mesh.position.copy(b.pos);
        return;
      }

      b.vel.multiplyScalar(0.94); // friction
      b.pos.addScaledVector(b.vel, delta);
      b.mesh.position.copy(b.pos);

      // Check fall off edge
      if (Math.hypot(b.pos.x, b.pos.z) > s.arenaRadius) {
        b.isAlive = false;
        sound.playHit();
        if (s.scene) {
          s.particles.push(createParticleBurst(s.scene, b.pos, 0xffb800, 20));
        }

        if (b.isPlayer) {
          setGameOver(true);
          setPlayerWon(false);
          sound.playLose();
          onDone(knockouts * 300);
        } else {
          setKnockouts((k) => {
            const nk = k + 1;
            if (nk === 3) {
              setGameOver(true);
              setPlayerWon(true);
              sound.playWin();
              onDone(1500);
            }
            return nk;
          });
        }
      }
    });

    // Bumper Elastic Collisions between bots
    for (let i = 0; i < s.brawlers.length; i++) {
      for (let j = i + 1; j < s.brawlers.length; j++) {
        const b1 = s.brawlers[i];
        const b2 = s.brawlers[j];
        if (!b1.isAlive || !b2.isAlive) continue;

        const dist = Math.hypot(b1.pos.x - b2.pos.x, b1.pos.z - b2.pos.z);
        if (dist < 1.45) {
          const normal = new THREE.Vector3(
            b1.pos.x - b2.pos.x,
            0,
            b1.pos.z - b2.pos.z
          ).normalize();

          // Elastic bounce impulse
          b1.vel.addScaledVector(normal, 9.5);
          b2.vel.addScaledVector(normal, -9.5);
          sound.playHit();

          if (s.scene) {
            s.particles.push(
              createParticleBurst(
                s.scene,
                b1.pos.clone().add(b2.pos).multiplyScalar(0.5),
                0xffffff,
                10
              )
            );
          }
        }
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    const s = stateRef.current;
    setKnockouts(0);
    setGameOver(false);
    setPlayerWon(false);

    const starts = [
      new THREE.Vector3(0, 0, 2.5),
      new THREE.Vector3(0, 0, -2.5),
      new THREE.Vector3(-2.5, 0, 0),
      new THREE.Vector3(2.5, 0, 0),
    ];

    s.brawlers.forEach((b, idx) => {
      b.isAlive = true;
      b.pos.copy(starts[idx]);
      b.vel.set(0, 0, 0);
      b.mesh.position.copy(starts[idx]);
    });
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 9.5, 8.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Knockouts: <span className="text-marigold">{knockouts} / 3 Bots</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          AI Difficulty: <span className="text-red-400">{botDifficulty}</span>
        </div>
      </div>

      {/* Virtual Controls */}
      <div className="absolute bottom-6 inset-x-6 flex justify-between pointer-events-auto">
        <div className="flex gap-2">
          <button
            onPointerDown={() => (stateRef.current.keysDown.a = true)}
            onPointerUp={() => (stateRef.current.keysDown.a = false)}
            className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur text-white font-black text-xl active:scale-90"
          >
            ◀
          </button>
          <div className="flex flex-col gap-2">
            <button
              onPointerDown={() => (stateRef.current.keysDown.w = true)}
              onPointerUp={() => (stateRef.current.keysDown.w = false)}
              className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur text-white font-black text-xl active:scale-90"
            >
              ▲
            </button>
            <button
              onPointerDown={() => (stateRef.current.keysDown.s = true)}
              onPointerUp={() => (stateRef.current.keysDown.s = false)}
              className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur text-white font-black text-xl active:scale-90"
            >
              ▼
            </button>
          </div>
          <button
            onPointerDown={() => (stateRef.current.keysDown.d = true)}
            onPointerUp={() => (stateRef.current.keysDown.d = false)}
            className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur text-white font-black text-xl active:scale-90"
          >
            ▶
          </button>
        </div>

        <button
          onClick={dashRam}
          className="px-8 py-4 rounded-3xl bg-marigold text-ink font-black text-xl shadow-2xl active:scale-90"
        >
          DASH RAM 💥
        </button>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{playerWon ? '🏆💥' : '🕳️🤖'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {playerWon ? 'Arena Champion! All Bots Ejected!' : 'You Got Pushed Off!'}
          </h2>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Brawl Rematch
          </button>
        </div>
      )}
    </div>
  );
}
