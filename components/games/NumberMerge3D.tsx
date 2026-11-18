'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface Die {
  mesh: THREE.Mesh;
  val: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  merged: boolean;
}

const DIE_COLORS: Record<number, number> = {
  2: 0xeeeeee,
  4: 0xffe082,
  8: 0xffb74d,
  16: 0xff8a65,
  32: 0xff5252,
  64: 0xff1744,
  128: 0xffd54f,
  256: 0xffca28,
  512: 0xffc107,
  1024: 0x00e676,
  2048: 0x00e5ff,
};

export default function NumberMerge3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [highest, setHighest] = useState(2);
  const [nextVal, setNextVal] = useState(2);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    highest: 2,
    nextVal: 2,
    aimX: 0,
    dice: [] as Die[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    aimMesh: null as THREE.Mesh | null,
    trayWidth: 7,
    trayDepth: 10,
  });

  const createDieMesh = (val: number): THREE.Mesh => {
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const color = DIE_COLORS[val] || 0xffb800;
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x27272a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const dir = new THREE.DirectionalLight(0xffb800, 1.2);
    dir.position.set(5, 15, 10);
    dir.castShadow = true;
    scene.add(ambient, dir);

    // 3D Wooden Tray Floor & Borders
    const floorGeo = new THREE.BoxGeometry(7, 0.4, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.2, -1);
    floor.receiveShadow = true;
    scene.add(floor);

    // Border walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4 });
    const leftW = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 10), wallMat);
    leftW.position.set(-3.7, 0.4, -1);
    const rightW = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 10), wallMat);
    rightW.position.set(3.7, 0.4, -1);
    const backW = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.2, 0.4), wallMat);
    backW.position.set(0, 0.4, -6.2);
    scene.add(leftW, rightW, backW);

    // Aim Indicator Die
    const aim = createDieMesh(2);
    aim.position.set(0, 0.45, 3.2);
    scene.add(aim);
    stateRef.current.aimMesh = aim;
  };

  const fireDie = () => {
    const s = stateRef.current;
    if (!s.scene || gameOver) return;

    sound.playTap();
    const dieMesh = createDieMesh(s.nextVal);
    dieMesh.position.set(s.aimX, 0.45, 3.2);
    s.scene.add(dieMesh);

    s.dice.push({
      mesh: dieMesh,
      val: s.nextVal,
      pos: new THREE.Vector3(s.aimX, 0.45, 3.2),
      vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, -18),
      rotVel: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
      merged: false,
    });

    // Roll next value (2, 4, or 8)
    const options = [2, 2, 4, 4, 8];
    const nxt = options[Math.floor(Math.random() * options.length)];
    s.nextVal = nxt;
    setNextVal(nxt);

    if (s.aimMesh) {
      (s.aimMesh.material as THREE.MeshStandardMaterial).color.setHex(DIE_COLORS[nxt] || 0xffb800);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const clampedX = Math.max(-2.8, Math.min(2.8, nx * 3.2));
    stateRef.current.aimX = clampedX;
    if (stateRef.current.aimMesh) {
      stateRef.current.aimMesh.position.x = clampedX;
    }
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Physics integration
    s.dice.forEach((d) => {
      d.vel.multiplyScalar(0.96); // drag friction
      d.rotVel.multiplyScalar(0.95);

      d.pos.addScaledVector(d.vel, delta);
      d.mesh.position.copy(d.pos);

      d.mesh.rotation.x += d.rotVel.x * delta;
      d.mesh.rotation.y += d.rotVel.y * delta;

      // Bounce off walls
      if (d.pos.x > 2.9) {
        d.pos.x = 2.9;
        d.vel.x = -Math.abs(d.vel.x) * 0.7;
      } else if (d.pos.x < -2.9) {
        d.pos.x = -2.9;
        d.vel.x = Math.abs(d.vel.x) * 0.7;
      }
      if (d.pos.z < -5.4) {
        d.pos.z = -5.4;
        d.vel.z = Math.abs(d.vel.z) * 0.7;
      }
      if (d.pos.z > 2.8) {
        d.pos.z = 2.8;
        d.vel.z = -Math.abs(d.vel.z) * 0.7;
      }
    });

    // Check Dice Collisions & Merges
    for (let i = 0; i < s.dice.length; i++) {
      for (let j = i + 1; j < s.dice.length; j++) {
        const d1 = s.dice[i];
        const d2 = s.dice[j];
        if (d1.merged || d2.merged) continue;

        const dist = d1.pos.distanceTo(d2.pos);
        if (dist < 0.95) {
          // Check if identical value -> MERGE!
          if (d1.val === d2.val) {
            d1.merged = true;
            d2.val *= 2; // double value!
            (d2.mesh.material as THREE.MeshStandardMaterial).color.setHex(
              DIE_COLORS[d2.val] || 0xffb800
            );

            s.score += d2.val;
            setScore(s.score);
            if (d2.val > s.highest) {
              s.highest = d2.val;
              setHighest(d2.val);
            }

            sound.playScore();
            if (s.scene) {
              s.particles.push(createParticleBurst(s.scene, d2.pos, DIE_COLORS[d2.val] || 0xffb800, 16));
            }

            s.scene?.remove(d1.mesh);
            d1.mesh.geometry.dispose();
          } else {
            // Elastic collision bounce
            const normal = d1.pos.clone().sub(d2.pos).normalize();
            d1.vel.addScaledVector(normal, 4);
            d2.vel.addScaledVector(normal, -4);
            sound.playHit();
          }
        }
      }
    }

    // Clean merged dice
    s.dice = s.dice.filter((d) => !d.merged);

    // Update particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setHighest(2);
    setGameOver(false);
    const s = stateRef.current;
    s.score = 0;
    s.highest = 2;

    if (s.scene) {
      s.dice.forEach((d) => s.scene?.remove(d.mesh));
      s.dice = [];
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-pointer"
      onPointerMove={handlePointerMove}
      onClick={fireDie}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 9.5, 6.5]}
        cameraLookAt={[0, 0, -1]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Highest: <span className="text-cyan-400 font-black">{highest}</span>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Aim with cursor, Click to launch dice! Match 2+2=4, 4+4=8 up to 2048!
        </span>
      </div>

      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🎲</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Tray Filled!</h2>
          <p className="text-xl font-bold mt-2">
            Highest Die: <span className="text-cyan-400">{highest}</span> · Score: <span className="text-marigold">{score}</span>
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
