'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface HoleEntity {
  holeIndex: number;
  x: number;
  z: number;
  mesh: THREE.Group | null;
  type: 'mole' | 'golden' | 'bomb';
  state: 'rising' | 'waiting' | 'sinking' | 'hidden';
  timer: number;
}

export default function WhackAttack3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    holes: [] as HoleEntity[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    hammerMesh: null as THREE.Group | null,
  });

  const createMoleMesh = (isGolden: boolean): THREE.Group => {
    const group = new THREE.Group();
    const headGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: isGolden ? 0xffb800 : 0x795548,
      metalness: isGolden ? 0.8 : 0.1,
      roughness: isGolden ? 0.2 : 0.8,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    group.add(head);

    // Snout
    const snoutGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xffab91 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, -0.05, 0.45);
    group.add(snout);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.05, 0.65);
    group.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 0.2, 0.45);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 0.2, 0.45);
    group.add(leftEye, rightEye);

    return group;
  };

  const createBombMesh = (): THREE.Group => {
    const group = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0x212121, metalness: 0.8 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    // Fuse
    const fuseGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0xffab00 });
    const fuse = new THREE.Mesh(fuseGeo, fuseMat);
    fuse.position.y = 0.55;
    group.add(fuse);

    // Spark
    const sparkGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.y = 0.72;
    group.add(spark);

    return group;
  };

  const initGame = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    scene.background = new THREE.Color(0x271900);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const spotlight = new THREE.DirectionalLight(0xffb800, 1.3);
    spotlight.position.set(5, 15, 10);
    scene.add(ambient, spotlight);

    // Wooden Arcade Table
    const tableGeo = new THREE.BoxGeometry(9, 1.2, 9);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.6;
    scene.add(table);

    // Setup 3x3 holes
    const holeRadius = 0.75;
    const holePositions: [number, number][] = [];
    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        holePositions.push([col * 2.5, row * 2.5]);
      }
    }

    stateRef.current.holes = holePositions.map(([x, z], idx) => {
      // Dark Hole ring
      const ringGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, 0.1, 24);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.9 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(x, 0.05, z);
      scene.add(ring);

      return {
        holeIndex: idx,
        x,
        z,
        mesh: null,
        type: 'mole',
        state: 'hidden',
        timer: Math.random() * 2,
      };
    });

    // 3D Hammer Mallet
    const hammer = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = 1.2;
    hammer.add(handle);

    const malletHeadGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const malletHeadMat = new THREE.MeshStandardMaterial({ color: 0xffb800, metalness: 0.3 });
    const malletHead = new THREE.Mesh(malletHeadGeo, malletHeadMat);
    malletHead.position.y = 2.4;
    hammer.add(malletHead);

    hammer.position.set(0, 3, 0);
    scene.add(hammer);
    stateRef.current.hammerMesh = hammer;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameOver) return;
    const s = stateRef.current;
    if (!s.camera || !s.scene) return;

    const rect = e.currentTarget.getBoundingClientRect();
    s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    s.raycaster.setFromCamera(s.mouse, s.camera);

    // Move hammer to click position with swing
    if (s.hammerMesh) {
      s.hammerMesh.position.set(s.mouse.x * 4, 1.8, s.mouse.y * -4);
      s.hammerMesh.rotation.x = 0.6;
      setTimeout(() => {
        if (s.hammerMesh) s.hammerMesh.rotation.x = 0;
      }, 120);
    }

    const meshes = s.holes.filter((h) => h.mesh !== null).map((h) => h.mesh!);
    const hits = s.raycaster.intersectObjects(meshes, true);

    if (hits.length > 0) {
      // Find which hole was hit
      for (const h of s.holes) {
        if (h.mesh && hits.some((hit) => hit.object === h.mesh || h.mesh?.children.includes(hit.object))) {
          if (h.state !== 'hidden') {
            h.state = 'hidden';
            s.scene.remove(h.mesh);
            h.mesh = null;

            if (h.type === 'bomb') {
              sound.playHit();
              s.score = Math.max(0, s.score - 150);
              setScore(s.score);
              s.particles.push(createParticleBurst(s.scene, hits[0].point, 0xff1744, 25));
            } else {
              sound.playWhack();
              const pts = h.type === 'golden' ? 300 : 100;
              s.score += pts;
              setScore(s.score);
              s.particles.push(
                createParticleBurst(
                  s.scene,
                  hits[0].point,
                  h.type === 'golden' ? 0xffd700 : 0x8d6e63,
                  18
                )
              );
            }
            break;
          }
        }
      }
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

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Update holes entity logic
    s.holes.forEach((h) => {
      h.timer -= delta;
      if (h.state === 'hidden' && h.timer <= 0) {
        // Pop up new target
        const roll = Math.random();
        h.type = roll < 0.2 ? 'bomb' : roll < 0.4 ? 'golden' : 'mole';
        h.mesh = h.type === 'bomb' ? createBombMesh() : createMoleMesh(h.type === 'golden');
        h.mesh.position.set(h.x, -0.6, h.z);
        s.scene?.add(h.mesh);
        h.state = 'rising';
        h.timer = 0.25;
      } else if (h.state === 'rising') {
        if (h.mesh) {
          h.mesh.position.y += 4.5 * delta;
          if (h.mesh.position.y >= 0.5) {
            h.mesh.position.y = 0.5;
            h.state = 'waiting';
            h.timer = h.type === 'golden' ? 0.75 : 1.1; // Golden stays less time
          }
        }
      } else if (h.state === 'waiting' && h.timer <= 0) {
        h.state = 'sinking';
        h.timer = 0.25;
      } else if (h.state === 'sinking') {
        if (h.mesh) {
          h.mesh.position.y -= 4.5 * delta;
          if (h.mesh.position.y <= -0.6) {
            s.scene?.remove(h.mesh);
            h.mesh = null;
            h.state = 'hidden';
            h.timer = 1.0 + Math.random() * 2.0;
          }
        }
      }
    });

    // Update particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    const s = stateRef.current;
    s.score = 0;

    s.holes.forEach((h) => {
      if (h.mesh) {
        s.scene?.remove(h.mesh);
        h.mesh = null;
      }
      h.state = 'hidden';
      h.timer = Math.random() * 2;
    });
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-pointer"
      onPointerDown={handlePointerDown}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 9, 8.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Time: <span className={timeLeft < 6 ? 'text-red-400 animate-pulse' : 'text-white'}>{timeLeft}s</span>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Whack the moles! Golden moles = 3x points. DO NOT hit the bombs!
        </span>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🔨💥</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Whack Session Over!</h2>
          <p className="text-xl font-bold mt-2">
            Final Score: <span className="text-marigold">{score} pts</span>
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
