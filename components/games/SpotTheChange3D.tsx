'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

interface Anomaly {
  id: number;
  name: string;
  pos: THREE.Vector3;
  found: boolean;
}

export default function SpotTheChange3D({ onDone }: Props) {
  const [foundCount, setFoundCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    anomalies: [
      { id: 1, name: 'Red Lamp', pos: new THREE.Vector3(2.5, 1.2, -1.0), found: false },
      { id: 2, name: 'Golden Cup', pos: new THREE.Vector3(3.2, 0.8, 1.2), found: false },
      { id: 3, name: 'Tilted Painting', pos: new THREE.Vector3(1.8, 2.2, -2.2), found: false },
    ] as Anomaly[],
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    particles: [] as { update: (dt: number) => boolean }[],
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
  });

  const initGame = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera }) => {
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    scene.background = new THREE.Color(0x18181b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.2);
    dir.position.set(5, 15, 10);
    scene.add(ambient, dir);

    // Divider Line
    const divGeo = new THREE.BoxGeometry(0.1, 4, 8);
    const divMat = new THREE.MeshBasicMaterial({ color: 0x3f3f46 });
    const div = new THREE.Mesh(divGeo, divMat);
    div.position.set(0, 1, 0);
    scene.add(div);

    // Left Diorama (Original Room)
    buildRoomDiorama(scene, -2.8, false);

    // Right Diorama (Altered Room with anomalies)
    buildRoomDiorama(scene, 2.8, true);
  };

  const buildRoomDiorama = (scene: THREE.Scene, offsetX: number, isAltered: boolean) => {
    // Floor
    const floorGeo = new THREE.BoxGeometry(5, 0.2, 5);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(offsetX, 0, 0);
    scene.add(floor);

    // Table
    const tableGeo = new THREE.BoxGeometry(2, 0.8, 1.5);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(offsetX, 0.4, 0);
    scene.add(table);

    // Lamp on Table (Anomaly 1: Blue on left, Red on right)
    const lampGeo = new THREE.ConeGeometry(0.3, 0.6, 12);
    const lampMat = new THREE.MeshStandardMaterial({
      color: isAltered ? 0xff1744 : 0x00e5ff,
      emissive: isAltered ? 0xd50000 : 0x00b0ff,
      emissiveIntensity: 0.4,
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(offsetX - 0.3, 1.1, -1.0);
    scene.add(lamp);

    // Cup on Table (Anomaly 2: Present only on right)
    if (isAltered) {
      const cupGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.35, 12);
      const cupMat = new THREE.MeshStandardMaterial({ color: 0xffb800, metalness: 0.8 });
      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.position.set(offsetX + 0.4, 0.95, 1.2);
      scene.add(cup);
    }

    // Wall Painting (Anomaly 3: Tilted on right)
    const paintGeo = new THREE.BoxGeometry(1.2, 0.8, 0.08);
    const paintMat = new THREE.MeshStandardMaterial({ color: 0xa855f7 });
    const paint = new THREE.Mesh(paintGeo, paintMat);
    paint.position.set(offsetX - 1.0, 2.2, -2.2);
    if (isAltered) {
      paint.rotation.z = 0.35; // tilted!
    }
    scene.add(paint);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameWon) return;
    const s = stateRef.current;
    if (!s.camera || !s.scene) return;

    const rect = e.currentTarget.getBoundingClientRect();
    s.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    s.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Check hit near anomalies
    s.raycaster.setFromCamera(s.mouse, s.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hitPoint = new THREE.Vector3();
    s.raycaster.ray.intersectPlane(plane, hitPoint);

    for (const an of s.anomalies) {
      if (!an.found && hitPoint.distanceTo(an.pos) < 1.4) {
        an.found = true;
        sound.playScore();
        s.particles.push(createParticleBurst(s.scene, an.pos, 0xffb800, 20));

        const newCount = s.anomalies.filter((a) => a.found).length;
        setFoundCount(newCount);

        if (newCount === 3) {
          setGameWon(true);
          sound.playWin();
          onDone(1200);
        }
        return;
      }
    }

    sound.playTap();
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    stateRef.current.anomalies.forEach((a) => (a.found = false));
    setFoundCount(0);
    setGameWon(false);
  };

  return (
    <div
      className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none cursor-crosshair"
      onPointerDown={handlePointerDown}
    >
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 4.5, 7.5]}
        cameraLookAt={[0, 1.2, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Differences: <span className="text-marigold">{foundCount} / 3 Found</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Spot differences in the right room!
        </div>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/60 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Inspect left vs right diorama. Click on 3 differences on the right side!
        </span>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🔍✨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Eagle Eye!</h2>
          <p className="text-xl font-bold mt-2">
            Found all 3 anomalies! Score: <span className="text-marigold">1200 pts</span>
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
