'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface TrafficCar {
  mesh: THREE.Group;
  lane: number;
  z: number;
  speed: number;
}

export default function TrafficEscape3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [speedMph, setSpeedMph] = useState(80);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    speed: 30.0,
    currentLane: 0, // -1: Left, 0: Center, 1: Right
    targetX: 0,
    playerX: 0,
    playerMesh: null as THREE.Group | null,
    cars: [] as TrafficCar[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    laneWidth: 2.4,
    roadStripes: [] as THREE.Mesh[],
  });

  const createCarMesh = (color: number): THREE.Group => {
    const group = new THREE.Group();
    // Chassis
    const bodyGeo = new THREE.BoxGeometry(1.4, 0.65, 2.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.1, 0.55, 1.4);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.05, -0.2);
    group.add(cabin);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [
      [-0.75, 0.3, 0.9],
      [0.75, 0.3, 0.9],
      [-0.75, 0.3, -0.9],
      [0.75, 0.3, -0.9],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    });

    return group;
  };

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x191c24);
    scene.fog = new THREE.FogExp2(0x191c24, 0.02);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const sun = new THREE.DirectionalLight(0xffb800, 1.3);
    sun.position.set(10, 20, 15);
    scene.add(ambient, sun);

    // 3D Road
    const roadGeo = new THREE.PlaneGeometry(8.5, 200);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x212529, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -40);
    road.receiveShadow = true;
    scene.add(road);

    // Road Stripes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stripeGeo = new THREE.PlaneGeometry(0.18, 3.5);
    for (let i = 0; i < 25; i++) {
      const z = -i * 8;
      [-1.2, 1.2].forEach((sx) => {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(sx, 0.02, z);
        scene.add(stripe);
        stateRef.current.roadStripes.push(stripe);
      });
    }

    // Player Car (Neon Yellow LOLLOOP Hotrod)
    const player = createCarMesh(0xffb800);
    player.position.set(0, 0, 0);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // Initial Traffic
    for (let i = 0; i < 6; i++) {
      spawnTrafficCar(scene, -25 - i * 18);
    }
  };

  const spawnTrafficCar = (scene: THREE.Scene, startZ: number) => {
    const lanes = [-1, 0, 1];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const colors = [0xf44336, 0x2196f3, 0x4caf50, 0x9c27b0, 0x795548];
    const car = createCarMesh(colors[Math.floor(Math.random() * colors.length)]);
    const x = lane * stateRef.current.laneWidth;
    car.position.set(x, 0, startZ);
    scene.add(car);

    stateRef.current.cars.push({
      mesh: car,
      lane,
      z: startZ,
      speed: 12 + Math.random() * 8,
    });
  };

  const changeLane = (dir: -1 | 1) => {
    if (gameOver) return;
    const s = stateRef.current;
    const newLane = Math.max(-1, Math.min(1, s.currentLane + dir));
    if (newLane !== s.currentLane) {
      s.currentLane = newLane;
      s.targetX = newLane * s.laneWidth;
      sound.playTap();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') changeLane(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') changeLane(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver]);

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Speed progression
    s.speed += delta * 0.3;
    const moveZ = s.speed * delta;
    s.score += Math.floor(moveZ * 2);
    setScore(s.score);
    setSpeedMph(Math.floor(s.speed * 2.8));

    // Smooth lane steering
    s.playerX += (s.targetX - s.playerX) * 12 * delta;
    if (s.playerMesh) {
      s.playerMesh.position.x = s.playerX;
      s.playerMesh.rotation.y = (s.targetX - s.playerX) * -0.25; // tilt into turn
      s.playerMesh.rotation.z = (s.targetX - s.playerX) * -0.15;
    }

    // Scroll road stripes
    s.roadStripes.forEach((stripe) => {
      stripe.position.z += moveZ;
      if (stripe.position.z > 15) {
        stripe.position.z -= 200;
      }
    });

    // Move traffic cars
    for (let i = s.cars.length - 1; i >= 0; i--) {
      const c = s.cars[i];
      // Relative speed: road speed minus oncoming car speed
      const relMove = (s.speed - c.speed) * delta;
      c.z += relMove;
      c.mesh.position.z = c.z;

      // Check collision with player
      if (Math.abs(c.z) < 2.5 && Math.abs(c.mesh.position.x - s.playerX) < 1.35) {
        setGameOver(true);
        sound.playHit();
        sound.playLose();
        if (s.scene) {
          s.particles.push(
            createParticleBurst(s.scene, new THREE.Vector3(s.playerX, 0.8, 0), 0xff9800, 30)
          );
        }
        onDone(s.score);
        return;
      }

      // Recycle cars that passed
      if (c.z > 15) {
        s.scene?.remove(c.mesh);
        s.cars.splice(i, 1);
        if (s.scene) {
          spawnTrafficCar(s.scene, -100 - Math.random() * 20);
        }
      }
    }

    // Update particles
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setGameOver(false);
    const s = stateRef.current;
    s.score = 0;
    s.speed = 30.0;
    s.currentLane = 0;
    s.targetX = 0;
    s.playerX = 0;

    if (s.scene) {
      s.cars.forEach((c) => s.scene?.remove(c.mesh));
      s.cars = [];
      for (let i = 0; i < 6; i++) {
        spawnTrafficCar(s.scene, -25 - i * 18);
      }
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 4.5, 6]}
        cameraLookAt={[0, 1, -8]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Speed: <span className="text-orange-400">{speedMph} MPH</span>
        </div>
      </div>

      {/* Touch Control Buttons */}
      <div className="absolute bottom-6 inset-x-6 flex justify-between pointer-events-auto">
        <button
          onClick={() => changeLane(-1)}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white font-black text-2xl flex items-center justify-center active:scale-90"
        >
          ←
        </button>
        <button
          onClick={() => changeLane(1)}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white font-black text-2xl flex items-center justify-center active:scale-90"
        >
          →
        </button>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">💥🏎️</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Highway Crash!</h2>
          <p className="text-xl font-bold mt-2">
            Distance: <span className="text-marigold">{score} meters</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Drive Again
          </button>
        </div>
      )}
    </div>
  );
}
