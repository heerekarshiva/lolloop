'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createParticleBurst, createTree } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function JungleQuest3D({ onDone }: Props) {
  const [relics, setRelics] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    playerPos: new THREE.Vector3(0, 0, 4),
    playerMesh: null as THREE.Group | null,
    boulders: [] as { mesh: THREE.Mesh; pos: THREE.Vector3; speed: number }[],
    relicMesh: null as THREE.Mesh | null,
    relicPos: new THREE.Vector3(0, 0.6, -14),
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x064e3b);
    scene.fog = new THREE.FogExp2(0x064e3b, 0.025);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const sun = new THREE.DirectionalLight(0xffd54f, 1.4);
    sun.position.set(5, 15, 10);
    scene.add(ambient, sun);

    // Lush Jungle Ruins Path
    const pathGeo = new THREE.BoxGeometry(6, 0.4, 30);
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.8 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.position.set(0, -0.2, -5);
    scene.add(path);

    // Flanking jungle palm trees
    for (let z = 5; z > -20; z -= 4) {
      [-3.8, 3.8].forEach((x) => {
        const tree = createTree(1.2);
        tree.position.set(x, 0, z);
        scene.add(tree);
      });
    }

    // Player Explorer
    const player = createCharacter({ color: 0x16a34a, accessory: 'none', scale: 0.8 });
    player.position.set(0, 0, 4);
    scene.add(player);
    stateRef.current.playerMesh = player;

    // Golden Temple Idol at End
    const idolGeo = new THREE.OctahedronGeometry(0.7);
    const idolMat = new THREE.MeshStandardMaterial({
      color: 0xffb800,
      emissive: 0xff9800,
      emissiveIntensity: 0.5,
      metalness: 0.8,
    });
    const idol = new THREE.Mesh(idolGeo, idolMat);
    idol.position.copy(stateRef.current.relicPos);
    scene.add(idol);
    stateRef.current.relicMesh = idol;

    // Rolling Boulders
    for (let i = 0; i < 3; i++) {
      spawnBoulder(scene, -6 - i * 6);
    }
  };

  const spawnBoulder = (scene: THREE.Scene, startZ: number) => {
    const geo = new THREE.DodecahedronGeometry(0.75);
    const mat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    const x = (Math.random() - 0.5) * 4.2;
    mesh.position.set(x, 0.75, startZ);
    scene.add(mesh);

    stateRef.current.boulders.push({
      mesh,
      pos: new THREE.Vector3(x, 0.75, startZ),
      speed: 6.5 + Math.random() * 4,
    });
  };

  const movePlayer = (dx: number, dz: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    s.playerPos.x = Math.max(-2.4, Math.min(2.4, s.playerPos.x + dx));
    s.playerPos.z = Math.max(-14, Math.min(6, s.playerPos.z + dz));
    sound.playTap();
    if (s.playerMesh) s.playerMesh.position.copy(s.playerPos);

    // Check relic reached
    if (s.playerPos.distanceTo(s.relicPos) < 1.4) {
      sound.playWin();
      setGameWon(true);
      setRelics(1);
      if (s.scene) {
        s.particles.push(createParticleBurst(s.scene, s.relicPos, 0xffd700, 30));
      }
      onDone(1200);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayer(0, -1.2);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayer(0, 1.2);
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1.2, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(1.2, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver, gameWon]);

  const onFrame = (dt: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    // Roll boulders towards player
    s.boulders.forEach((b) => {
      b.pos.z += b.speed * delta;
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.x += delta * 4;

      // Check collision with player
      if (b.pos.distanceTo(s.playerPos) < 1.2) {
        setGameOver(true);
        sound.playHit();
        sound.playLose();
        onDone(200);
        return;
      }

      // Reset boulder to temple top
      if (b.pos.z > 7) {
        b.pos.z = -16;
        b.pos.x = (Math.random() - 0.5) * 4.2;
      }
    });

    if (s.relicMesh) s.relicMesh.rotation.y += delta * 2;
    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    stateRef.current.playerPos.set(0, 0, 4);
    if (stateRef.current.playerMesh) stateRef.current.playerMesh.position.set(0, 0, 4);
    setGameOver(false);
    setGameWon(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 6.5, 9]}
        cameraLookAt={[0, 1, -4]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Idols: <span className="text-marigold">{relics} / 1 Golden Idol</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Dodge rolling boulders to reach the Temple!
        </div>
      </div>

      {/* Virtual D-pad */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => movePlayer(0, -1.2)}
          className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => movePlayer(-1.2, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(0, 1.2)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▼
          </button>
          <button
            onClick={() => movePlayer(1.2, 0)}
            className="w-14 h-14 bg-white/20 backdrop-blur text-white font-black text-2xl rounded-2xl active:scale-90"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Win/Loss Modal */}
      {(gameOver || gameWon) && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{gameWon ? '🏆🌴' : '🪨💥'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {gameWon ? 'Ancient Relic Secured!' : 'Crushed by Giant Boulder!'}
          </h2>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Quest Again
          </button>
        </div>
      )}
    </div>
  );
}
