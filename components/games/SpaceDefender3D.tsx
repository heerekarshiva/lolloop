'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface EnemyDrone {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  speed: number;
}

interface Laser {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
}

export default function SpaceDefender3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    shields: 3,
    playerX: 0,
    playerY: 0,
    targetX: 0,
    targetY: 0,
    shipMesh: null as THREE.Group | null,
    lasers: [] as Laser[],
    enemies: [] as EnemyDrone[],
    particles: [] as { update: (dt: number) => boolean }[],
    stars: [] as THREE.Mesh[],
    scene: null as THREE.Scene | null,
    shootCooldown: 0,
  });

  const createStarfighter = (): THREE.Group => {
    const group = new THREE.Group();
    // Fuselage
    const noseGeo = new THREE.ConeGeometry(0.5, 2.2, 4);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8, roughness: 0.2 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    group.add(nose);

    // Wings
    const wingGeo = new THREE.BoxGeometry(2.8, 0.08, 0.9);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0, 0.3);
    group.add(wings);

    // Thruster engines
    const thrusterGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
    const leftT = new THREE.Mesh(thrusterGeo, thrusterMat);
    leftT.rotation.x = Math.PI / 2;
    leftT.position.set(-0.5, 0, 1.1);
    const rightT = new THREE.Mesh(thrusterGeo, thrusterMat);
    rightT.rotation.x = Math.PI / 2;
    rightT.position.set(0.5, 0, 1.1);
    group.add(leftT, rightT);

    return group;
  };

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x050814);
    scene.fog = new THREE.FogExp2(0x050814, 0.015);

    const ambient = new THREE.AmbientLight(0x40c4ff, 0.7);
    const dir = new THREE.DirectionalLight(0xffffff, 1.3);
    dir.position.set(5, 10, 10);
    scene.add(ambient, dir);

    // Stars field
    const starGeo = new THREE.BoxGeometry(0.08, 0.08, 1.5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 80; i++) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        -Math.random() * 80
      );
      scene.add(star);
      stateRef.current.stars.push(star);
    }

    // Player ship
    const ship = createStarfighter();
    ship.position.set(0, 0, 0);
    scene.add(ship);
    stateRef.current.shipMesh = ship;

    // Initial enemies
    for (let i = 0; i < 6; i++) {
      spawnEnemy(scene, -20 - i * 15);
    }
  };

  const spawnEnemy = (scene: THREE.Scene, startZ: number) => {
    const isBoss = Math.random() < 0.2;
    const geo = isBoss ? new THREE.DodecahedronGeometry(0.85) : new THREE.OctahedronGeometry(0.6);
    const mat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0xff1744 : 0xff9100,
      emissive: isBoss ? 0xd50000 : 0xff6d00,
      emissiveIntensity: 0.4,
      metalness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 6;
    mesh.position.set(x, y, startZ);
    scene.add(mesh);

    stateRef.current.enemies.push({
      mesh,
      pos: new THREE.Vector3(x, y, startZ),
      speed: 16 + Math.random() * 8,
    });
  };

  const shootLaser = () => {
    const s = stateRef.current;
    if (!s.scene || gameOver) return;

    sound.playTap();
    [-0.5, 0.5].forEach((offset) => {
      const geo = new THREE.BoxGeometry(0.08, 0.08, 1.2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const laser = new THREE.Mesh(geo, mat);
      laser.position.set(s.playerX + offset, s.playerY, -0.8);
      s.scene!.add(laser);
      s.lasers.push({
        mesh: laser,
        pos: new THREE.Vector3(s.playerX + offset, s.playerY, -0.8),
      });
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    stateRef.current.targetX = nx * 5.0;
    stateRef.current.targetY = ny * 3.0;
  };

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Auto shoot lasers
    s.shootCooldown += delta;
    if (s.shootCooldown > 0.22) {
      s.shootCooldown = 0;
      shootLaser();
    }

    // Ship flight steering
    s.playerX += (s.targetX - s.playerX) * 8 * delta;
    s.playerY += (s.targetY - s.playerY) * 8 * delta;

    if (s.shipMesh) {
      s.shipMesh.position.set(s.playerX, s.playerY, 0);
      s.shipMesh.rotation.z = (s.targetX - s.playerX) * -0.2;
      s.shipMesh.rotation.x = (s.targetY - s.playerY) * 0.15;
    }

    // Warp starfield towards camera
    s.stars.forEach((star) => {
      star.position.z += 40 * delta;
      if (star.position.z > 5) {
        star.position.z = -75;
      }
    });

    // Advance lasers forward
    for (let i = s.lasers.length - 1; i >= 0; i--) {
      const l = s.lasers[i];
      l.pos.z -= 45 * delta;
      l.mesh.position.copy(l.pos);

      // Check hit against enemies
      let hit = false;
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        const en = s.enemies[j];
        if (l.pos.distanceTo(en.pos) < 1.0) {
          hit = true;
          s.scene?.remove(en.mesh);
          en.mesh.geometry.dispose();
          s.enemies.splice(j, 1);

          s.score += 150;
          setScore(s.score);
          sound.playHit();
          if (s.scene) {
            s.particles.push(createParticleBurst(s.scene, en.pos, 0xff9100, 18));
            spawnEnemy(s.scene, -70 - Math.random() * 20);
          }
          break;
        }
      }

      if (hit || l.pos.z < -60) {
        s.scene?.remove(l.mesh);
        l.mesh.geometry.dispose();
        s.lasers.splice(i, 1);
      }
    }

    // Move oncoming enemies
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const en = s.enemies[i];
      en.pos.z += en.speed * delta;
      en.mesh.position.copy(en.pos);
      en.mesh.rotation.x += delta * 2;
      en.mesh.rotation.y += delta * 3;

      // Check collision with player
      if (Math.abs(en.pos.z) < 1.0) {
        const dist = Math.hypot(en.pos.x - s.playerX, en.pos.y - s.playerY);
        if (dist < 1.2) {
          s.shields -= 1;
          setShields(s.shields);
          sound.playHit();

          s.scene?.remove(en.mesh);
          s.enemies.splice(i, 1);
          if (s.scene) {
            s.particles.push(
              createParticleBurst(s.scene, new THREE.Vector3(s.playerX, s.playerY, 0), 0xff1744, 25)
            );
            spawnEnemy(s.scene, -70);
          }

          if (s.shields <= 0) {
            setGameOver(true);
            sound.playLose();
            onDone(s.score);
            return;
          }
        }
      }

      if (en.pos.z > 8) {
        s.scene?.remove(en.mesh);
        s.enemies.splice(i, 1);
        if (s.scene) spawnEnemy(s.scene, -70);
      }
    }

    // Update particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setShields(3);
    setGameOver(false);
    const s = stateRef.current;
    s.score = 0;
    s.shields = 3;

    if (s.scene) {
      s.enemies.forEach((e) => s.scene?.remove(e.mesh));
      s.lasers.forEach((l) => s.scene?.remove(l.mesh));
      s.enemies = [];
      s.lasers = [];
      for (let i = 0; i < 6; i++) {
        spawnEnemy(s.scene, -20 - i * 15);
      }
    }
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-crosshair touch-none"
      onPointerMove={handlePointerMove}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 1.2, 5.5]}
        cameraLookAt={[0, 0, -20]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-cyan-400">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Shields: {'🛡️'.repeat(Math.max(0, shields))}
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Guide ship with cursor/finger. Auto-fires plasma lasers. Blast alien drones!
        </span>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🚀💥</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Vessel Destroyed!</h2>
          <p className="text-xl font-bold mt-2">
            Combat Score: <span className="text-cyan-400">{score} pts</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-cyan-400 text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Launch Again
          </button>
        </div>
      )}
    </div>
  );
}
