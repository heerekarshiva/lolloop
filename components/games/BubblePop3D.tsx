'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface Bubble {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  speed: number;
  radius: number;
  color: number;
  wobbleSpeed: number;
  wobbleOffset: number;
}

export default function BubblePop3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    combo: 0,
    timeLeft: 30,
    bubbles: [] as Bubble[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    spawnTimer: 0,
  });

  const initGame = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    scene.background = new THREE.Color(0x061e38);
    scene.fog = new THREE.FogExp2(0x061e38, 0.03);

    // Underwater Lighting
    const ambient = new THREE.AmbientLight(0x40c4ff, 0.7);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(0, 15, 5);
    scene.add(ambient, sunLight);

    // Initial bubbles
    for (let i = 0; i < 15; i++) {
      spawnBubble(scene, Math.random() * 8 - 4);
    }
  };

  const spawnBubble = (scene: THREE.Scene, startY = -6) => {
    const radius = 0.45 + Math.random() * 0.45;
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const colors = [0x00e5ff, 0x80d8ff, 0xe040fb, 0x69f0ae, 0xffd740];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75,
      emissive: color,
      emissiveIntensity: 0.25,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const x = (Math.random() - 0.5) * 8;
    const z = (Math.random() - 0.5) * 4;
    mesh.position.set(x, startY, z);
    scene.add(mesh);

    stateRef.current.bubbles.push({
      mesh,
      x,
      y: startY,
      z,
      speed: 1.8 + Math.random() * 2.2,
      radius,
      color,
      wobbleSpeed: 2 + Math.random() * 4,
      wobbleOffset: Math.random() * Math.PI * 2,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameOver) return;
    const s = stateRef.current;
    if (!s.camera || !s.scene) return;

    const rect = e.currentTarget.getBoundingClientRect();
    s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    s.raycaster.setFromCamera(s.mouse, s.camera);
    const meshes = s.bubbles.map((b) => b.mesh);
    const hits = s.raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const bIdx = s.bubbles.findIndex((b) => b.mesh === hitMesh);
      if (bIdx !== -1) {
        const b = s.bubbles[bIdx];
        s.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        s.bubbles.splice(bIdx, 1);

        s.combo += 1;
        const pts = 50 * s.combo;
        s.score += pts;
        setScore(s.score);
        setCombo(s.combo);

        sound.playPop();
        s.particles.push(createParticleBurst(s.scene, hits[0].point, b.color, 16));

        // Immediately spawn replacement
        spawnBubble(s.scene, -6);
      }
    } else {
      // Miss breaks combo
      s.combo = 0;
      setCombo(0);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameOver(true);
          sound.playWin();
          onDone(stateRef.current.score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver]);

  const onFrame = (dt: number, time: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Float bubbles upwards
    s.bubbles.forEach((b) => {
      b.y += b.speed * delta;
      b.mesh.position.y = b.y;
      b.mesh.position.x = b.x + Math.sin(time * b.wobbleSpeed + b.wobbleOffset) * 0.25;

      // Reset to bottom if floated past screen
      if (b.y > 6.5) {
        b.y = -6;
        b.x = (Math.random() - 0.5) * 8;
        b.mesh.position.x = b.x;
      }
    });

    // Update Particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setCombo(0);
    setTimeLeft(30);
    setGameOver(false);
    stateRef.current.score = 0;
    stateRef.current.combo = 0;

    if (stateRef.current.scene) {
      stateRef.current.bubbles.forEach((b) => stateRef.current.scene?.remove(b.mesh));
      stateRef.current.bubbles = [];
      for (let i = 0; i < 15; i++) {
        spawnBubble(stateRef.current.scene, Math.random() * 8 - 4);
      }
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-pointer"
      onPointerDown={handlePointerDown}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 10]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-cyan-400">{score}</span>
          {combo > 1 && (
            <span className="ml-2 text-xs bg-marigold text-ink px-2 py-0.5 rounded-full font-black animate-bounce inline-block">
              {combo}x COMBO!
            </span>
          )}
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Time: <span className={timeLeft < 6 ? 'text-red-400 animate-pulse' : 'text-white'}>{timeLeft}s</span>
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🫧</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Time Up!</h2>
          <p className="text-xl font-bold mt-2">
            Final Score: <span className="text-cyan-400">{score} pts</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-cyan-400 text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
