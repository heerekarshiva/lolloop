'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface TowerLevel {
  group: THREE.Group;
  y: number;
  segments: { mesh: THREE.Mesh; isHazard: boolean; startAngle: number; endAngle: number }[];
}

export default function BounceMania3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [floorLevel, setFloorLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    floorLevel: 1,
    towerRotation: 0,
    targetRotation: 0,
    ballY: 2.0,
    ballVy: 0,
    ballMesh: null as THREE.Mesh | null,
    levels: [] as TowerLevel[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    pointerDown: false,
    prevPointerX: 0,
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x1a102f);
    scene.fog = new THREE.FogExp2(0x1a102f, 0.035);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const dir = new THREE.DirectionalLight(0xff007f, 1.2);
    dir.position.set(5, 10, 8);
    scene.add(ambient, dir);

    // Central Pillar
    const poleGeo = new THREE.CylinderGeometry(1.2, 1.2, 40, 24);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x241442, roughness: 0.5 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    scene.add(pole);

    // Ball
    const ballGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 2.0, 2.2);
    scene.add(ball);
    stateRef.current.ballMesh = ball;

    // Generate tower levels
    for (let i = 0; i < 20; i++) {
      spawnLevel(scene, -i * 2.5);
    }
  };

  const spawnLevel = (scene: THREE.Scene, y: number) => {
    const group = new THREE.Group();
    group.position.y = y;

    const segmentsCount = 8;
    const levelSegments: { mesh: THREE.Mesh; isHazard: boolean; startAngle: number; endAngle: number }[] = [];
    const openGap = Math.floor(Math.random() * segmentsCount); // Empty gap to fall through
    const hazardIdx = (openGap + 3) % segmentsCount;

    for (let s = 0; s < segmentsCount; s++) {
      if (s === openGap) continue; // leave open gap for ball to drop
      const isHazard = s === hazardIdx;
      const angle = (s / segmentsCount) * Math.PI * 2;
      const segAngle = (Math.PI * 2) / segmentsCount - 0.08;

      const geo = new THREE.CylinderGeometry(2.6, 2.6, 0.2, 8, 1, false, angle, segAngle);
      const mat = new THREE.MeshStandardMaterial({
        color: isHazard ? 0xff1744 : 0x7c4dff,
        emissive: isHazard ? 0xd50000 : 0x311b92,
        emissiveIntensity: 0.2,
        roughness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      levelSegments.push({
        mesh,
        isHazard,
        startAngle: angle,
        endAngle: angle + segAngle,
      });
    }

    scene.add(group);
    stateRef.current.levels.push({ group, y, segments: levelSegments });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stateRef.current.pointerDown = true;
    stateRef.current.prevPointerX = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stateRef.current.pointerDown || gameOver) return;
    const deltaX = e.clientX - stateRef.current.prevPointerX;
    stateRef.current.prevPointerX = e.clientX;
    stateRef.current.targetRotation += deltaX * 0.015;
  };

  const handlePointerUp = () => {
    stateRef.current.pointerDown = false;
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Smooth tower rotation
    s.towerRotation += (s.targetRotation - s.towerRotation) * 0.2;
    s.levels.forEach((lvl) => {
      lvl.group.rotation.y = s.towerRotation;
    });

    // Ball gravity & physics
    s.ballVy -= 16 * delta;
    s.ballY += s.ballVy * delta;

    // Check collision against nearby level
    for (const lvl of s.levels) {
      if (Math.abs(s.ballY - lvl.y) < 0.35 && s.ballVy < 0) {
        // Calculate ball angle relative to current tower rotation
        let angle = (-s.towerRotation) % (Math.PI * 2);
        if (angle < 0) angle += Math.PI * 2;

        let hitSegment = false;
        let hitHazard = false;

        for (const seg of lvl.segments) {
          if (angle >= seg.startAngle && angle <= seg.endAngle) {
            hitSegment = true;
            if (seg.isHazard) hitHazard = true;
            break;
          }
        }

        if (hitHazard) {
          setGameOver(true);
          sound.playHit();
          sound.playLose();
          onDone(s.score);
          return;
        }

        if (hitSegment) {
          s.ballVy = 7.5; // Bounce!
          s.ballY = lvl.y + 0.35;
          sound.playPop();
          if (s.scene) {
            s.particles.push(
              createParticleBurst(s.scene, new THREE.Vector3(0, lvl.y, 2.2), 0x00e5ff, 10)
            );
          }
        } else {
          // Fell through the gap!
          s.score += 150;
          s.floorLevel += 1;
          setScore(s.score);
          setFloorLevel(s.floorLevel);
          sound.playScore();
        }
      }
    }

    // Scroll tower upwards as ball drops
    if (s.ballY < 1.0) {
      const shift = 1.0 - s.ballY;
      s.ballY = 1.0;
      s.levels.forEach((lvl) => {
        lvl.y += shift;
        lvl.group.position.y = lvl.y;
      });

      // Spawn new levels at bottom
      const lowest = s.levels[s.levels.length - 1];
      if (lowest && lowest.y > -25 && s.scene) {
        spawnLevel(s.scene, lowest.y - 2.5);
      }
    }

    // Update ball mesh position
    if (s.ballMesh) {
      s.ballMesh.position.y = s.ballY;
    }

    // Update particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setFloorLevel(1);
    setGameOver(false);
    stateRef.current.score = 0;
    stateRef.current.floorLevel = 1;
    stateRef.current.ballY = 2.0;
    stateRef.current.ballVy = 0;
    stateRef.current.towerRotation = 0;
    stateRef.current.targetRotation = 0;

    if (stateRef.current.scene) {
      stateRef.current.levels.forEach((l) => stateRef.current.scene?.remove(l.group));
      stateRef.current.levels = [];
      for (let i = 0; i < 20; i++) {
        spawnLevel(stateRef.current.scene, -i * 2.5);
      }
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-ew-resize touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 4, 7.5]}
        cameraLookAt={[0, 1.5, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-purple-400">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Floor: <span className="text-marigold">{floorLevel}</span>
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Drag horizontally to rotate tower. Fall through gaps, avoid RED hazard plates!
        </span>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🌀</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Splat!</h2>
          <p className="text-xl font-bold mt-2">
            Reached Floor {floorLevel} · Score: <span className="text-purple-400">{score}</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-purple-500 text-white rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
