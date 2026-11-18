'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function BalloonBurst3D({ onDone }: Props) {
  const [currentPumps, setCurrentPumps] = useState(0);
  const [bankedScore, setBankedScore] = useState(0);
  const [burst, setBurst] = useState(false);

  const stateRef = useRef({
    balloonMesh: null as THREE.Mesh | null,
    burstLimit: Math.floor(10 + Math.random() * 15),
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

    // Helium Air Pump Base
    const pumpGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.5, 16);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.4 });
    const pump = new THREE.Mesh(pumpGeo, pumpMat);
    pump.position.set(0, -1.0, 0);
    scene.add(pump);

    // Shiny Latex 3D Balloon
    const balloonGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const balloonMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xd50000,
      emissiveIntensity: 0.3,
      roughness: 0.15,
      metalness: 0.1,
    });
    const balloon = new THREE.Mesh(balloonGeo, balloonMat);
    balloon.position.set(0, 1.2, 0);
    scene.add(balloon);
    stateRef.current.balloonMesh = balloon;
  };

  const pumpAir = () => {
    if (burst) return;
    const s = stateRef.current;
    sound.playTap();

    const nextPumps = currentPumps + 1;
    setCurrentPumps(nextPumps);

    // Inflate 3D balloon scale
    const scale = 1.0 + nextPumps * 0.12;
    if (s.balloonMesh) {
      s.balloonMesh.scale.set(scale, scale * 1.15, scale);
      s.balloonMesh.position.y = 1.2 + nextPumps * 0.06;
    }

    // Check burst limit
    if (nextPumps >= s.burstLimit) {
      setBurst(true);
      sound.playHit();
      sound.playLose();

      if (s.scene && s.balloonMesh) {
        s.particles.push(
          createParticleBurst(s.scene, s.balloonMesh.position, 0xff1744, 40)
        );
        s.scene.remove(s.balloonMesh);
      }
      onDone(bankedScore);
    }
  };

  const bankPoints = () => {
    if (burst || currentPumps === 0) return;
    sound.playScore();
    sound.playWin();

    const earned = currentPumps * 100;
    const total = bankedScore + earned;
    setBankedScore(total);
    setCurrentPumps(0);

    // Reset balloon for next round with new random burst limit
    stateRef.current.burstLimit = Math.floor(10 + Math.random() * 15);
    if (stateRef.current.balloonMesh) {
      stateRef.current.balloonMesh.scale.set(1, 1.15, 1);
      stateRef.current.balloonMesh.position.y = 1.2;
    }

    onDone(total);
  };

  const onFrame = (dt: number, time: number) => {
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Floating wobble
    if (s.balloonMesh && !burst) {
      s.balloonMesh.rotation.y = time * 0.5;
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setCurrentPumps(0);
    setBankedScore(0);
    setBurst(false);
    stateRef.current.burstLimit = Math.floor(10 + Math.random() * 15);

    if (stateRef.current.scene && stateRef.current.balloonMesh) {
      stateRef.current.balloonMesh.scale.set(1, 1.15, 1);
      stateRef.current.balloonMesh.position.y = 1.2;
      stateRef.current.scene.add(stateRef.current.balloonMesh);
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 2.5, 7.5]}
        cameraLookAt={[0, 1.5, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Banked: <span className="text-emerald-400 font-black">{bankedScore} pts</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          At Risk: <span className="text-marigold font-black">{currentPumps * 100} pts</span>
        </div>
      </div>

      <div className="absolute top-16 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/70 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Pump to multiply points! Bank before the latex violently POPs!
        </span>
      </div>

      {/* Buttons */}
      <div className="absolute bottom-6 inset-x-6 flex justify-center gap-6 pointer-events-auto">
        <button
          onClick={pumpAir}
          disabled={burst}
          className="px-8 py-4 rounded-3xl bg-red-600 text-white font-black text-xl shadow-xl active:scale-95 disabled:opacity-50"
        >
          PUMP AIR 🎈
        </button>
        <button
          onClick={bankPoints}
          disabled={burst || currentPumps === 0}
          className="px-8 py-4 rounded-3xl bg-emerald-500 text-ink font-black text-xl shadow-xl active:scale-95 disabled:opacity-50"
        >
          BANK POINTS 💰
        </button>
      </div>

      {/* Burst Pop Modal */}
      {burst && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🎈💥😱</div>
          <h2 className="text-3xl font-extrabold tracking-tight">POP! Too Greedy!</h2>
          <p className="text-xl font-bold mt-2">
            The balloon burst! Banked Saved: <span className="text-emerald-400">{bankedScore} pts</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Pump Again
          </button>
        </div>
      )}
    </div>
  );
}
