'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

const WEDGES = [
  { label: '100 Pts', val: 100, color: 0xffb800 },
  { label: '500 Pts', val: 500, color: 0x00e5ff },
  { label: 'Double 2x', val: 1000, color: 0xff1744 },
  { label: '50 Pts', val: 50, color: 0xa855f7 },
  { label: 'JACKPOT', val: 2500, color: 0x22c55e },
  { label: '250 Pts', val: 250, color: 0xff9100 },
  { label: 'Bonus Spin', val: 750, color: 0x3b82f6 },
  { label: '150 Pts', val: 150, color: 0xec4899 },
];

export default function CrazyWheel3D({ onDone }: Props) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [lastPrize, setLastPrize] = useState<string | null>(null);

  const stateRef = useRef({
    wheelAngle: 0,
    wheelVel: 0,
    wheelMesh: null as THREE.Group | null,
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

    // 3D Stand
    const standGeo = new THREE.CylinderGeometry(0.25, 0.35, 4.5, 12);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 0.5;
    scene.add(stand);

    // 3D Wheel Group
    const wheel = new THREE.Group();
    wheel.position.set(0, 2.5, 0);

    // 8 Wedges
    const count = WEDGES.length;
    WEDGES.forEach((w, idx) => {
      const startAngle = (idx / count) * Math.PI * 2;
      const wedgeAngle = (Math.PI * 2) / count;
      const geo = new THREE.CylinderGeometry(2.8, 2.8, 0.3, 16, 1, false, startAngle, wedgeAngle);
      const mat = new THREE.MeshStandardMaterial({
        color: w.color,
        roughness: 0.3,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      wheel.add(mesh);
    });

    // Center Hub
    const hubGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.45, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);

    scene.add(wheel);
    stateRef.current.wheelMesh = wheel;

    // Pointer Ticker at Top
    const pointerGeo = new THREE.ConeGeometry(0.25, 0.7, 8);
    const pointerMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const pointer = new THREE.Mesh(pointerGeo, pointerMat);
    pointer.position.set(0, 5.4, 0.3);
    pointer.rotation.z = Math.PI;
    scene.add(pointer);
  };

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    sound.playTap();

    // High velocity impulse
    stateRef.current.wheelVel = 18.0 + Math.random() * 12.0;
  };

  const onFrame = (dt: number) => {
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    if (s.wheelVel > 0) {
      s.wheelVel *= 0.985; // friction slow down
      s.wheelAngle += s.wheelVel * delta;

      if (s.wheelMesh) {
        s.wheelMesh.rotation.z = s.wheelAngle;
      }

      if (s.wheelVel < 0.15) {
        s.wheelVel = 0;
        setIsSpinning(false);

        // Calculate winning wedge
        const normAngle = (s.wheelAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const wedgeSize = (Math.PI * 2) / WEDGES.length;
        const winIdx = Math.floor(normAngle / wedgeSize) % WEDGES.length;
        const prize = WEDGES[winIdx];

        sound.playScore();
        sound.playWin();
        setLastPrize(prize.label);
        setTotalScore((sc) => sc + prize.val);

        if (s.scene) {
          s.particles.push(
            createParticleBurst(s.scene, new THREE.Vector3(0, 2.5, 0), prize.color, 30)
          );
        }
        onDone(totalScore + prize.val);
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 2.6, 7.5]}
        cameraLookAt={[0, 2.6, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Total Won: <span className="text-marigold">{totalScore} pts</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Prize: <span className="text-cyan-400 font-black">{lastPrize || 'Ready to Spin'}</span>
        </div>
      </div>

      {/* Spin Button */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-auto">
        <button
          onClick={spinWheel}
          disabled={isSpinning}
          className="px-12 py-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-ink font-black text-2xl rounded-full shadow-[0_10px_35px_rgba(255,184,0,0.4)] active:scale-95 disabled:opacity-50 transition"
        >
          {isSpinning ? 'SPINNING... 🎡' : 'SPIN THE WHEEL! 🎡'}
        </button>
      </div>
    </div>
  );
}
