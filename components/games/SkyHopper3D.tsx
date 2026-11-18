'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createCoin, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface TileNode {
  mesh: THREE.Mesh;
  gridX: number;
  gridZ: number;
  worldX: number;
  worldZ: number;
  hasStar: boolean;
  starMesh?: THREE.Mesh;
  crumbleTimer: number;
  isCrumbling: boolean;
}

export default function SkyHopper3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    playerGridX: 0,
    playerGridZ: 0,
    playerMesh: null as THREE.Group | null,
    tiles: [] as TileNode[],
    particles: [] as { update: (dt: number) => boolean }[],
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    isHopping: false,
    hopProgress: 0,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
  });

  const initGame = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    scene.background = new THREE.Color(0x7dd3fc);
    scene.fog = new THREE.FogExp2(0x7dd3fc, 0.02);

    // Sky Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const sun = new THREE.DirectionalLight(0xfff5d6, 1.3);
    sun.position.set(10, 25, 15);
    sun.castShadow = true;
    scene.add(ambient, sun);

    // Cute Player Hopper
    const player = createCharacter({ color: 0x0284c7, accessory: 'ears', scale: 0.75 });
    player.position.set(0, 0.35, 0);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // Generate starter tiles grid
    generateTilePath(scene);
  };

  const generateTilePath = (scene: THREE.Scene) => {
    const s = stateRef.current;
    // Clear old
    s.tiles.forEach((t) => {
      scene.remove(t.mesh);
      if (t.starMesh) scene.remove(t.starMesh);
    });
    s.tiles = [];

    // Starter origin tile
    spawnTile(scene, 0, 0, false);

    // Generate zigzagging pathway forward
    let currX = 0;
    let currZ = 0;
    for (let i = 0; i < 40; i++) {
      // Pick left or right diagonal step
      if (Math.random() < 0.5) {
        currX -= 1;
      } else {
        currX += 1;
      }
      currZ += 1;
      spawnTile(scene, currX, currZ, Math.random() < 0.4);
    }
  };

  const spawnTile = (scene: THREE.Scene, gx: number, gz: number, withStar: boolean) => {
    const wx = gx * 1.5;
    const wz = -gz * 1.5;

    const geo = new THREE.CylinderGeometry(0.85, 0.75, 0.4, 6);
    const colors = [0xffffff, 0xf1f5f9, 0xe2e8f0];
    const mat = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(wx, 0, wz);
    mesh.receiveShadow = true;
    scene.add(mesh);

    let starMesh: THREE.Mesh | undefined;
    if (withStar && gz > 0) {
      starMesh = createCoin(0.6);
      starMesh.position.set(wx, 0.9, wz);
      scene.add(starMesh);
    }

    stateRef.current.tiles.push({
      mesh,
      gridX: gx,
      gridZ: gz,
      worldX: wx,
      worldZ: wz,
      hasStar: withStar,
      starMesh,
      crumbleTimer: 2.2,
      isCrumbling: false,
    });
  };

  const hop = (dir: -1 | 1) => {
    const s = stateRef.current;
    if (gameOver || s.isHopping) return;

    const nextGx = s.playerGridX + dir;
    const nextGz = s.playerGridZ + 1;

    // Find if destination tile exists
    const nextTile = s.tiles.find((t) => t.gridX === nextGx && t.gridZ === nextGz);

    s.isHopping = true;
    s.hopProgress = 0;
    s.startPos.copy(s.playerMesh!.position);

    const targetWx = nextGx * 1.5;
    const targetWz = -nextGz * 1.5;
    s.targetPos.set(targetWx, 0.35, targetWz);

    sound.playJump();

    if (nextTile) {
      s.playerGridX = nextGx;
      s.playerGridZ = nextGz;
      s.score += 10;
      setScore(s.score);

      // Collect star if present
      if (nextTile.hasStar && nextTile.starMesh && s.scene) {
        nextTile.hasStar = false;
        s.scene.remove(nextTile.starMesh);
        s.score += 50;
        setScore(s.score);
        sound.playScore();
        s.particles.push(
          createParticleBurst(s.scene, new THREE.Vector3(targetWx, 0.9, targetWz), 0xffb800, 14)
        );
      }

      // Mark tile as crumbling
      nextTile.isCrumbling = true;

      // Extend forward path
      if (nextGz > s.tiles[s.tiles.length - 1].gridZ - 15 && s.scene) {
        const last = s.tiles[s.tiles.length - 1];
        let ex = last.gridX;
        let ez = last.gridZ;
        for (let k = 0; k < 10; k++) {
          ex += Math.random() < 0.5 ? -1 : 1;
          ez += 1;
          spawnTile(s.scene, ex, ez, Math.random() < 0.4);
        }
      }
    } else {
      // Missed tile! Jumped into empty air!
      setTimeout(() => {
        setGameOver(true);
        sound.playLose();
        onDone(s.score);
      }, 400);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') hop(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') hop(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver]);

  const onFrame = (dt: number) => {
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Hop arc animation
    if (s.isHopping && s.playerMesh) {
      s.hopProgress += delta * 4.5;
      if (s.hopProgress >= 1) {
        s.hopProgress = 1;
        s.isHopping = false;
        s.playerMesh.position.copy(s.targetPos);
      } else {
        s.playerMesh.position.lerpVectors(s.startPos, s.targetPos, s.hopProgress);
        // Parabolic arc jump
        s.playerMesh.position.y = 0.35 + Math.sin(s.hopProgress * Math.PI) * 1.2;
      }
    }

    // Follow camera smoothly
    if (s.camera && s.playerMesh) {
      const camTargetX = s.playerMesh.position.x;
      const camTargetZ = s.playerMesh.position.z + 7.5;
      s.camera.position.x += (camTargetX - s.camera.position.x) * 4 * delta;
      s.camera.position.z += (camTargetZ - s.camera.position.z) * 4 * delta;
    }

    // Spin stars
    s.tiles.forEach((t) => {
      if (t.starMesh) t.starMesh.rotation.z += delta * 3;

      // Crumble tiles under player
      if (t.isCrumbling && !gameOver) {
        t.crumbleTimer -= delta;
        if (t.crumbleTimer < 0.8) {
          t.mesh.position.y -= delta * 3;
          if (t.crumbleTimer <= 0) {
            s.scene?.remove(t.mesh);
            // If player was standing on this crumbled tile
            if (s.playerGridX === t.gridX && s.playerGridZ === t.gridZ && !s.isHopping) {
              setGameOver(true);
              sound.playLose();
              onDone(s.score);
            }
          }
        }
      }
    });

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setGameOver(false);
    const s = stateRef.current;
    s.score = 0;
    s.playerGridX = 0;
    s.playerGridZ = 0;
    s.isHopping = false;

    if (s.playerMesh) s.playerMesh.position.set(0, 0.35, 0);
    if (s.camera) s.camera.position.set(0, 7.5, 7.5);
    if (s.scene) generateTilePath(s.scene);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 7.5, 7.5]}
        cameraLookAt={[0, 1.5, -4]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-sky-400">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Tiles: <span className="text-marigold">{stateRef.current.playerGridZ}</span>
        </div>
      </div>

      {/* Touch Buttons */}
      <div className="absolute bottom-6 inset-x-6 flex justify-between pointer-events-auto">
        <button
          onClick={() => hop(-1)}
          className="px-8 py-4 rounded-3xl bg-white/30 backdrop-blur border border-white/40 text-ink font-black text-xl shadow-lg active:scale-95"
        >
          ↖ Hop Left
        </button>
        <button
          onClick={() => hop(1)}
          className="px-8 py-4 rounded-3xl bg-marigold text-ink font-black text-xl shadow-lg active:scale-95"
        >
          Hop Right ↗
        </button>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">☁️🕳️</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Fell Through Clouds!</h2>
          <p className="text-xl font-bold mt-2">
            Final Score: <span className="text-sky-400">{score}</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Hop Again
          </button>
        </div>
      )}
    </div>
  );
}
