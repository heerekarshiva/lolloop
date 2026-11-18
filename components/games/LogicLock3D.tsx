'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function LogicLock3D({ onDone }: Props) {
  // Secret combination: 3 numbers between 0 and 9
  const [combo] = useState<number[]>([3, 7, 2]);
  const [currentDial, setCurrentDial] = useState(0);
  const [unlockedDials, setUnlockedDials] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [clueText, setClueText] = useState('Rotate dial to match first number (Clue: Odd number < 5)');
  const [vaultOpen, setVaultOpen] = useState(false);

  const stateRef = useRef({
    dialAngle: 0,
    dialMesh: null as THREE.Group | null,
    vaultDoorMesh: null as THREE.Group | null,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const spotlight = new THREE.DirectionalLight(0xffb800, 1.4);
    spotlight.position.set(5, 12, 10);
    scene.add(ambient, spotlight);

    // Vault Safe Body
    const vault = new THREE.Group();
    const frameGeo = new THREE.BoxGeometry(6.5, 6.5, 2.5);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8, roughness: 0.3 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    vault.add(frame);

    // Vault Door
    const doorGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.4, 32);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.9, roughness: 0.2 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.rotation.x = Math.PI / 2;
    door.position.z = 1.3;
    vault.add(door);

    // Central Tumbler Dial
    const dial = new THREE.Group();
    const knobGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.5, 24);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xffb800, metalness: 0.9, roughness: 0.1 });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.rotation.x = Math.PI / 2;
    dial.add(knob);

    // Dial Pointer Mark
    const markGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
    const markMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const mark = new THREE.Mesh(markGeo, markMat);
    mark.position.set(0, 1.1, 0.2);
    dial.add(mark);

    dial.position.set(0, 0, 1.6);
    vault.add(dial);

    scene.add(vault);
    stateRef.current.dialMesh = dial;
    stateRef.current.vaultDoorMesh = vault;
  };

  const rotateDial = (dir: -1 | 1) => {
    if (vaultOpen) return;
    sound.playTap();
    const nextVal = (currentDial + dir + 10) % 10;
    setCurrentDial(nextVal);

    if (stateRef.current.dialMesh) {
      stateRef.current.dialAngle += dir * (Math.PI / 5);
      stateRef.current.dialMesh.rotation.z = -stateRef.current.dialAngle;
    }
  };

  const submitDigit = () => {
    if (vaultOpen) return;
    setAttempts((a) => a + 1);

    const step = unlockedDials.length;
    if (currentDial === combo[step]) {
      sound.playScore();
      const updated = [...unlockedDials, currentDial];
      setUnlockedDials(updated);

      if (updated.length === 1) {
        setClueText('Number 1 unlocked! Clue 2: Lucky prime between 6 and 8');
      } else if (updated.length === 2) {
        setClueText('Number 2 unlocked! Clue 3: Smallest even prime number');
      } else if (updated.length === 3) {
        setVaultOpen(true);
        sound.playWin();
        if (stateRef.current.scene) {
          stateRef.current.particles.push(
            createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 0, 2), 0xffd700, 35)
          );
        }
        onDone(Math.max(200, 2000 - attempts * 50));
      }
    } else {
      sound.playHit();
      setClueText(currentDial > combo[step] ? 'Too high! Turn counter-clockwise.' : 'Too low! Turn clockwise.');
    }
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setCurrentDial(0);
    setUnlockedDials([]);
    setAttempts(0);
    setVaultOpen(false);
    setClueText('Rotate dial to match first number (Clue: Odd number < 5)');
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 6.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Vault Status: <span className={vaultOpen ? 'text-emerald-400 font-black' : 'text-amber-400'}>{vaultOpen ? 'OPEN 🔓' : 'LOCKED 🔒'}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Unlocked: <span className="text-marigold">{unlockedDials.length} / 3</span>
        </div>
      </div>

      {/* Dial Value Display & Clue */}
      <div className="absolute top-20 inset-x-0 flex flex-col items-center pointer-events-none">
        <div className="bg-zinc-900/90 text-white px-6 py-2 rounded-2xl border border-white/10 text-center shadow-lg">
          <p className="text-xs uppercase font-bold tracking-wider text-white/50">Current Digit</p>
          <p className="text-4xl font-black text-marigold">{currentDial}</p>
          <p className="text-xs font-semibold mt-1 text-cyan-300 max-w-xs">{clueText}</p>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="absolute bottom-6 inset-x-6 flex justify-center gap-4 pointer-events-auto">
        <button
          onClick={() => rotateDial(-1)}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur text-white font-black text-2xl active:scale-90"
        >
          ↺
        </button>
        <button
          onClick={submitDigit}
          className="px-8 py-4 rounded-full bg-marigold text-ink font-black text-lg shadow-xl active:scale-95"
        >
          Check Digit 🔐
        </button>
        <button
          onClick={() => rotateDial(1)}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur text-white font-black text-2xl active:scale-90"
        >
          ↻
        </button>
      </div>

      {/* Win Modal */}
      {vaultOpen && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">💰🔓💎</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Vault Cracked!</h2>
          <p className="text-xl font-bold mt-2">
            Combination: <span className="text-marigold">3 - 7 - 2</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Crack Another
          </button>
        </div>
      )}
    </div>
  );
}
