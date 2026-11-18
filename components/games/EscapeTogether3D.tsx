'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function EscapeTogether3D({ onDone }: Props) {
  const [playerLever, setPlayerLever] = useState(false);
  const [botLever, setBotLever] = useState(false);
  const [roomNum, setRoomNum] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.4);
    dir.position.set(5, 12, 8);
    scene.add(ambient, dir);

    // Bunker Room Floor
    const floorGeo = new THREE.BoxGeometry(8, 0.4, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    scene.add(floor);

    // Security Blast Door in Back
    const doorGeo = new THREE.BoxGeometry(3.5, 3.2, 0.4);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.6, -2.8);
    scene.add(door);
  };

  const pullPlayerLever = () => {
    if (gameWon) return;
    sound.playTap();
    setPlayerLever(true);

    // AI teammate notices and synchronizes within 600ms!
    setTimeout(() => {
      setBotLever(true);
      sound.playScore();

      setTimeout(() => {
        sound.playWin();
        if (roomNum < 3) {
          setRoomNum((r) => r + 1);
          setPlayerLever(false);
          setBotLever(false);
          setTimeLeft(30);
        } else {
          setGameWon(true);
          onDone(1500);
        }
      }, 500);
    }, 450);
  };

  useEffect(() => {
    if (gameWon) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 1 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameWon]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setRoomNum(1);
    setPlayerLever(false);
    setBotLever(false);
    setTimeLeft(30);
    setGameWon(false);
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
          Chamber: <span className="text-marigold">{roomNum} / 3</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Time: <span className="text-cyan-400">{timeLeft}s</span>
        </div>
      </div>

      {/* Lever Status Showcase */}
      <div className="absolute top-20 inset-x-6 flex justify-center gap-6 pointer-events-none">
        <div className={`px-6 py-3 rounded-2xl border text-center ${playerLever ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400' : 'bg-zinc-900/80 border-white/10 text-white'}`}>
          <p className="text-xs font-bold uppercase">Your Lever (Console A)</p>
          <p className="text-2xl font-black">{playerLever ? 'PULLED ⚡' : 'READY'}</p>
        </div>
        <div className={`px-6 py-3 rounded-2xl border text-center ${botLever ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400' : 'bg-zinc-900/80 border-white/10 text-white'}`}>
          <p className="text-xs font-bold uppercase">AI Partner (Console B)</p>
          <p className="text-2xl font-black">{botLever ? 'PULLED ⚡' : 'WAITING'}</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="absolute bottom-8 inset-x-0 flex justify-center pointer-events-auto">
        <button
          onClick={pullPlayerLever}
          disabled={playerLever}
          className="px-10 py-4 bg-marigold text-ink rounded-full font-black text-xl shadow-2xl active:scale-95 disabled:opacity-50"
        >
          PULL SECURITY LEVER 🕹️
        </button>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🤝🚪✨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Facility Escaped!</h2>
          <p className="text-xl font-bold mt-2">
            All 3 security blast doors breached cooperatively!
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Escape Again
          </button>
        </div>
      )}
    </div>
  );
}
