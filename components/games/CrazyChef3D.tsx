'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface Ingredient {
  mesh: THREE.Mesh;
  isBad: boolean;
  color: number;
  pos: THREE.Vector3;
  speed: number;
}

export default function CrazyChef3D({ onDone }: Props) {
  const [burgersStacked, setBurgersStacked] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    plateX: 0,
    plateMesh: null as THREE.Mesh | null,
    stackHeight: 0,
    ingredients: [] as Ingredient[],
    spawnTimer: 0,
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

    // Kitchen Cutting Board Counter
    const counterGeo = new THREE.BoxGeometry(10, 0.5, 4);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, -4.5, 0);
    scene.add(counter);

    // Chef Plate (Player)
    const plateGeo = new THREE.CylinderGeometry(1.4, 1.1, 0.2, 24);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, -4.0, 0);
    scene.add(plate);
    stateRef.current.plateMesh = plate;
  };

  const spawnIngredient = (scene: THREE.Scene) => {
    const isBad = Math.random() < 0.25;
    const colors = [0x78350f, 0xfacc15, 0xef4444, 0x22c55e, 0xd97706]; // patty, cheese, tomato, lettuce, bun
    const color = isBad ? 0x222222 : colors[Math.floor(Math.random() * colors.length)];

    const geo = isBad ? new THREE.DodecahedronGeometry(0.35) : new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);

    const startX = (Math.random() - 0.5) * 6.5;
    mesh.position.set(startX, 6.0, 0);
    scene.add(mesh);

    stateRef.current.ingredients.push({
      mesh,
      isBad,
      color,
      pos: new THREE.Vector3(startX, 6.0, 0),
      speed: 4.5 + Math.random() * 2.5,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const targetX = Math.max(-3.5, Math.min(3.5, nx * 4.5));
    stateRef.current.plateX = targetX;
    if (stateRef.current.plateMesh) {
      stateRef.current.plateMesh.position.x = targetX;
    }
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Spawn timer
    s.spawnTimer += delta;
    if (s.spawnTimer > 0.8 && s.scene) {
      s.spawnTimer = 0;
      spawnIngredient(s.scene);
    }

    // Move falling food
    for (let i = s.ingredients.length - 1; i >= 0; i--) {
      const item = s.ingredients[i];
      item.pos.y -= item.speed * delta;
      item.mesh.position.copy(item.pos);

      // Check collision with plate
      const catchY = -4.0 + s.stackHeight * 0.15;
      if (Math.abs(item.pos.y - catchY) < 0.45 && Math.abs(item.pos.x - s.plateX) < 1.1) {
        s.scene?.remove(item.mesh);
        s.ingredients.splice(i, 1);

        if (item.isBad) {
          // Bad rotten item caught!
          sound.playHit();
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0) {
              setGameOver(true);
              sound.playLose();
              onDone(burgersStacked * 100);
            }
            return nl;
          });
        } else {
          // Fresh ingredient stacked!
          sound.playPop();
          sound.playScore();
          s.stackHeight = Math.min(10, s.stackHeight + 1);
          setBurgersStacked((b) => b + 1);

          if (s.scene) {
            s.particles.push(createParticleBurst(s.scene, item.pos, item.color, 12));
          }
        }
        continue;
      }

      // Fell past floor
      if (item.pos.y < -5.5) {
        s.scene?.remove(item.mesh);
        s.ingredients.splice(i, 1);
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setBurgersStacked(0);
    setLives(3);
    setGameOver(false);
    stateRef.current.stackHeight = 0;
    if (stateRef.current.scene) {
      stateRef.current.ingredients.forEach((i) => stateRef.current.scene?.remove(i.mesh));
      stateRef.current.ingredients = [];
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-ew-resize touch-none"
      onPointerMove={handlePointerMove}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 10.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Stacked: <span className="text-marigold">{burgersStacked} Ingredients</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Lives: {'❤️'.repeat(Math.max(0, lives))}
        </div>
      </div>

      <div className="absolute top-16 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/70 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Catch tasty ingredients on your plate! AVOID the rotten black items!
        </span>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">👨‍🍳🍔💥</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Kitchen Shift Ended!</h2>
          <p className="text-xl font-bold mt-2">
            Burger Stack: <span className="text-marigold">{burgersStacked} layers</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Cook Again
          </button>
        </div>
      )}
    </div>
  );
}
