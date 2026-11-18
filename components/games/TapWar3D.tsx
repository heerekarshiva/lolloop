'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { BotDifficulty, getTapWarIntervalMs } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

export default function TapWar3D({ onDone, botDifficulty = 'Medium' }: Props) {
  // Tension position: 0 is center, -100 is Player win, +100 is Bot win
  const [markerPos, setMarkerPos] = useState(0);
  const [playerTaps, setPlayerTaps] = useState(0);
  const [botTaps, setBotTaps] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);

  const stateRef = useRef({
    markerPos: 0,
    ropeMesh: null as THREE.Mesh | null,
    flagMesh: null as THREE.Mesh | null,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const spotlight = new THREE.DirectionalLight(0xffb800, 1.4);
    spotlight.position.set(0, 12, 10);
    scene.add(ambient, spotlight);

    // Arena Floor
    const floorGeo = new THREE.BoxGeometry(10, 0.4, 4);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Mud Pit in Middle
    const pitGeo = new THREE.BoxGeometry(2.0, 0.42, 4.02);
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const pit = new THREE.Mesh(pitGeo, pitMat);
    pit.position.y = -0.2;
    scene.add(pit);

    // Characters (Left: Player, Right: Bot)
    const playerChar = createCharacter({ color: 0x00e5ff, scale: 0.85 });
    playerChar.position.set(-3.2, 0, 0);
    playerChar.rotation.y = Math.PI / 2;
    scene.add(playerChar);

    const botChar = createCharacter({ color: 0xff1744, scale: 0.85 });
    botChar.position.set(3.2, 0, 0);
    botChar.rotation.y = -Math.PI / 2;
    scene.add(botChar);

    // Rope
    const ropeGeo = new THREE.CylinderGeometry(0.08, 0.08, 6.5, 12);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.rotation.z = Math.PI / 2;
    rope.position.set(0, 0.75, 0);
    scene.add(rope);
    stateRef.current.ropeMesh = rope;

    // Center Ribbon Flag
    const flagGeo = new THREE.BoxGeometry(0.35, 0.5, 0.1);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0, 0.75, 0);
    scene.add(flag);
    stateRef.current.flagMesh = flag;
  };

  const tap = () => {
    if (gameOver) return;
    sound.playTap();
    setPlayerTaps((t) => t + 1);

    const s = stateRef.current;
    s.markerPos = Math.max(-100, Math.min(100, s.markerPos - 4.5));
    setMarkerPos(s.markerPos);

    if (s.flagMesh) {
      s.flagMesh.position.x = (s.markerPos / 100) * 2.2;
    }

    if (s.markerPos <= -100) {
      setGameOver(true);
      setPlayerWon(true);
      sound.playWin();
      if (s.scene) {
        s.particles.push(
          createParticleBurst(s.scene, new THREE.Vector3(-2.2, 1, 0), 0x00e5ff, 30)
        );
      }
      onDone(playerTaps * 25);
    }
  };

  // Bot tapping simulation
  useEffect(() => {
    if (gameOver) return;
    const intervalTime = getTapWarIntervalMs(botDifficulty);

    const interval = setInterval(() => {
      setBotTaps((b) => b + 1);
      const s = stateRef.current;
      s.markerPos = Math.max(-100, Math.min(100, s.markerPos + 3.8));
      setMarkerPos(s.markerPos);

      if (s.flagMesh) {
        s.flagMesh.position.x = (s.markerPos / 100) * 2.2;
      }

      if (s.markerPos >= 100) {
        setGameOver(true);
        setPlayerWon(false);
        sound.playLose();
        clearInterval(interval);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [gameOver, botDifficulty]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    stateRef.current.markerPos = 0;
    if (stateRef.current.flagMesh) stateRef.current.flagMesh.position.x = 0;
    setMarkerPos(0);
    setPlayerTaps(0);
    setBotTaps(0);
    setGameOver(false);
    setPlayerWon(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 4, 6.5]}
        cameraLookAt={[0, 0.8, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          You: <span className="text-cyan-400">{playerTaps} Taps</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Tug Tension Meter
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          AI Bot ({botDifficulty}): <span className="text-red-400">{botTaps} Taps</span>
        </div>
      </div>

      {/* Tension Progress Bar */}
      <div className="absolute top-20 inset-x-12 pointer-events-none">
        <div className="w-full h-4 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex">
          <div
            className="h-full bg-cyan-400 transition-all duration-75"
            style={{ width: `${Math.max(0, 50 - markerPos / 2)}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all duration-75"
            style={{ width: `${Math.max(0, 50 + markerPos / 2)}%` }}
          />
        </div>
      </div>

      {/* Giant Smash Button */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-auto">
        <button
          onClick={tap}
          className="w-44 h-44 rounded-full bg-gradient-to-t from-amber-500 to-yellow-400 text-ink font-black text-3xl shadow-[0_12px_40px_rgba(255,184,0,0.4)] border-4 border-white active:scale-90 transition transform"
        >
          TAP! 👆
        </button>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{playerWon ? '🏆🤼' : '🥈🤖'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {playerWon ? 'You Pulled The Bot Over!' : 'Bot Pulled You Into Mud!'}
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
