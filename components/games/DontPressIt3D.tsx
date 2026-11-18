'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

const TAUNTS = [
  "Don't you dare touch me!",
  'I see your cursor hovering. Step back!',
  'Press me and the universe restarts!',
  'Seriously, it is just a red button. Boring!',
  'Look away! Think about puppies!',
  'Almost there... resist the temptation!',
];

export default function DontPressIt3D({ onDone }: Props) {
  const [secondsResisted, setSecondsResisted] = useState(0);
  const [tauntIndex, setTauntIndex] = useState(0);
  const [wasPressed, setWasPressed] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    buttonMesh: null as THREE.Mesh | null,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.4);
    dir.position.set(5, 12, 10);
    scene.add(ambient, dir);

    // Marble Pedestal Stand
    const standGeo = new THREE.CylinderGeometry(2.0, 2.5, 3.5, 24);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = -1.2;
    scene.add(stand);

    // Giant Shiny Red Forbidden Button
    const btnGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.6, 32);
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0xd50000,
      emissive: 0xff1744,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.2,
    });
    const btn = new THREE.Mesh(btnGeo, btnMat);
    btn.position.y = 0.8;
    scene.add(btn);
    stateRef.current.buttonMesh = btn;
  };

  const pressButton = () => {
    if (wasPressed || gameWon) return;
    setWasPressed(true);
    sound.playHit();
    sound.playLose();

    if (stateRef.current.scene) {
      stateRef.current.particles.push(
        createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 0.8, 0), 0xd50000, 35)
      );
    }
    onDone(secondsResisted * 50);
  };

  // 30 seconds resistance countdown
  useEffect(() => {
    if (wasPressed || gameWon) return;
    const interval = setInterval(() => {
      setSecondsResisted((s) => {
        const nextSec = s + 1;
        setTauntIndex(Math.floor(nextSec / 5) % TAUNTS.length);

        if (nextSec >= 30) {
          setGameWon(true);
          sound.playWin();
          clearInterval(interval);
          onDone(1500);
        }
        return nextSec;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [wasPressed, gameWon]);

  const onFrame = (dt: number, time: number) => {
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Button personality wiggle & pulse
    if (s.buttonMesh && !wasPressed) {
      s.buttonMesh.position.y = 0.8 + Math.sin(time * 6) * 0.05;
      s.buttonMesh.rotation.z = Math.sin(time * 4) * 0.04;
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setSecondsResisted(0);
    setTauntIndex(0);
    setWasPressed(false);
    setGameWon(false);
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
          Resistance Timer: <span className="text-marigold font-black">{secondsResisted}s / 30s</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          DO NOT PRESS THE BUTTON!
        </div>
      </div>

      {/* Button Whispers Dialogue */}
      <div className="absolute top-20 inset-x-6 flex flex-col items-center pointer-events-none">
        <div className="bg-zinc-900/90 text-white px-6 py-3 rounded-2xl border border-white/15 text-center shadow-xl max-w-sm w-full">
          <p className="text-xs uppercase font-bold text-red-400 tracking-widest">The Button Whispers</p>
          <p className="text-base font-black text-white mt-0.5">{TAUNTS[tauntIndex]}</p>
        </div>
      </div>

      {/* The Forbidden Press Zone */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center pointer-events-auto">
        <button
          onClick={pressButton}
          className="px-8 py-3.5 rounded-full bg-red-600/80 hover:bg-red-500 text-white font-black text-base shadow-lg border border-red-400 active:scale-95 transition"
        >
          I CAN'T RESIST... (PRESS ME) 🔴
        </button>
      </div>

      {/* Pressed Chaos Modal */}
      {wasPressed && (
        <div
          className="absolute inset-0 bg-ink/90 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">💥🔴🚨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">YOU PRESSED IT!</h2>
          <p className="text-xl font-bold mt-2">
            You lasted <span className="text-marigold">{secondsResisted} seconds</span> before cracking!
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Try Resisting Again
          </button>
        </div>
      )}

      {/* Won Modal */}
      {gameWon && (
        <div
          className="absolute inset-0 bg-ink/90 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🧘‍♂️🏆✨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Iron Will!</h2>
          <p className="text-xl font-bold mt-2">
            You resisted the forbidden button for 30 full seconds!
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
