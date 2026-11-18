'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createCharacter, createCrystal, createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { updateYouAndMeCoOpAI } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  isMultiplayer?: boolean;
}

const WORLDS = [
  { name: 'Lava Cavern', bg: 0x2d0a00, groundColor: 0x451a03, hazardColor: 0xff3d00, hazardName: 'Lava' },
  { name: 'Crystal Glacier', bg: 0x082f49, groundColor: 0x0e7490, hazardColor: 0x00e5ff, hazardName: 'Ice Frost' },
  { name: 'Mystical Forest', bg: 0x052e16, groundColor: 0x14532d, hazardColor: 0x84cc16, hazardName: 'Spore Fog' },
  { name: 'Water Temple', bg: 0x083344, groundColor: 0x155e75, hazardColor: 0x38bdf8, hazardName: 'Water Sluice' },
  { name: 'Celestial Citadel', bg: 0x1e1b4b, groundColor: 0x312e81, hazardColor: 0xfacc15, hazardName: 'Energy Beam' },
];

export default function YouAndMe3D({ onDone }: Props) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [gemsCollected, setGemsCollected] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const [aiMode, setAiMode] = useState(true); // Solo with AI companion by default
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    player1Pos: new THREE.Vector3(-3.5, 0, 2.5),
    player2Pos: new THREE.Vector3(-3.5, 0, 1.0),
    player1Mesh: null as THREE.Group | null,
    player2Mesh: null as THREE.Group | null,
    switchPressed: false,
    leverPulled: false,
    gateMesh: null as THREE.Mesh | null,
    switchMesh: null as THREE.Mesh | null,
    gems: [] as { mesh: THREE.Mesh; pos: THREE.Vector3; collected: boolean }[],
    keysDown: {} as Record<string, boolean>,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const world = WORLDS[currentLevel % WORLDS.length];

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    setupWorldLevel(scene, currentLevel);
  };

  const setupWorldLevel = (scene: THREE.Scene, lvl: number) => {
    // Clear old children
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }

    const w = WORLDS[lvl % WORLDS.length];
    scene.background = new THREE.Color(w.bg);
    scene.fog = new THREE.FogExp2(w.bg, 0.02);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const sun = new THREE.DirectionalLight(0xffb800, 1.4);
    sun.position.set(8, 16, 12);
    sun.castShadow = true;
    scene.add(ambient, sun);

    // Main Island Floor
    const floorGeo = new THREE.BoxGeometry(12, 0.6, 8);
    const floorMat = new THREE.MeshStandardMaterial({ color: w.groundColor, roughness: 0.7 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.3;
    floor.receiveShadow = true;
    scene.add(floor);

    // Hazard Trench in Middle (Ember immune to Lava, Glacio immune to Frost/Water)
    const hazardGeo = new THREE.BoxGeometry(2.5, 0.4, 8);
    const hazardMat = new THREE.MeshStandardMaterial({
      color: w.hazardColor,
      emissive: w.hazardColor,
      emissiveIntensity: 0.6,
    });
    const hazard = new THREE.Mesh(hazardGeo, hazardMat);
    hazard.position.set(0, -0.2, 0);
    scene.add(hazard);

    // Interactive Pressure Plate Switch (Left chamber)
    const switchGeo = new THREE.CylinderGeometry(0.8, 0.85, 0.15, 24);
    const switchMat = new THREE.MeshStandardMaterial({ color: 0xffb800, metalness: 0.5 });
    const sw = new THREE.Mesh(switchGeo, switchMat);
    sw.position.set(-2.0, 0.05, -2.0);
    scene.add(sw);
    stateRef.current.switchMesh = sw;

    // Exit Gate (Right chamber)
    const gateGeo = new THREE.BoxGeometry(0.3, 2.5, 2.5);
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.5,
    });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.set(2.5, 1.25, 0);
    scene.add(gate);
    stateRef.current.gateMesh = gate;

    // Exit Portal Goal (Behind gate)
    const portalGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.1, 24);
    const portalMat = new THREE.MeshBasicMaterial({ color: 0x76ff03 });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(4.5, 0.05, 0);
    scene.add(portal);

    // Collectible Gems
    stateRef.current.gems = [];
    [new THREE.Vector3(-1.0, 0.8, 1.5), new THREE.Vector3(3.8, 0.8, -2.0)].forEach((gPos) => {
      const gem = createCrystal(0xffd700, 0.9);
      gem.position.copy(gPos);
      scene.add(gem);
      stateRef.current.gems.push({ mesh: gem, pos: gPos, collected: false });
    });

    // Ember (Player 1 - Fire/Lava hero with flame crest)
    const p1 = createCharacter({ color: 0xff5722, accessory: 'fire', scale: 0.75 });
    p1.position.copy(stateRef.current.player1Pos);
    scene.add(p1);
    stateRef.current.player1Mesh = p1;

    // Glacio (Player 2 or AI Teammate - Ice/Water hero with crystal crest)
    const p2 = createCharacter({ color: 0x00e5ff, accessory: 'ice', scale: 0.75 });
    p2.position.copy(stateRef.current.player2Pos);
    scene.add(p2);
    stateRef.current.player2Mesh = p2;

    stateRef.current.switchPressed = false;
    setGateOpen(false);
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      stateRef.current.keysDown[e.key.toLowerCase()] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      stateRef.current.keysDown[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const onFrame = (dt: number) => {
    if (gameOver || gameWon) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);
    const speed = 4.5 * delta;

    // 1. Control Player 1 (Ember) with WASD
    if (s.keysDown['w']) s.player1Pos.z -= speed;
    if (s.keysDown['s']) s.player1Pos.z += speed;
    if (s.keysDown['a']) s.player1Pos.x -= speed;
    if (s.keysDown['d']) s.player1Pos.x += speed;

    // Clamp P1 boundaries
    s.player1Pos.x = Math.max(-5.5, Math.min(5.5, s.player1Pos.x));
    s.player1Pos.z = Math.max(-3.5, Math.min(3.5, s.player1Pos.z));

    // Gate collision: if gate closed, cannot pass X > 2.3
    if (!s.switchPressed && s.player1Pos.x > 2.2) {
      s.player1Pos.x = 2.2;
    }

    if (s.player1Mesh) s.player1Mesh.position.copy(s.player1Pos);

    // 2. Control Player 2 (Glacio): Arrow keys OR AI Companion!
    if (aiMode) {
      // AI Teammate automates cooperative puzzle solving!
      const aiResult = updateYouAndMeCoOpAI(
        { x: s.player2Pos.x, z: s.player2Pos.z },
        { x: s.player1Pos.x, z: s.player1Pos.z },
        { x: -2.0, z: -2.0, isPressed: s.switchPressed },
        { x: 4.5, z: 0 },
        s.switchPressed,
        delta
      );
      s.player2Pos.x = aiResult.x;
      s.player2Pos.z = aiResult.z;
    } else {
      // 2-player keyboard mode (Arrow keys)
      if (s.keysDown['arrowup']) s.player2Pos.z -= speed;
      if (s.keysDown['arrowdown']) s.player2Pos.z += speed;
      if (s.keysDown['arrowleft']) s.player2Pos.x -= speed;
      if (s.keysDown['arrowright']) s.player2Pos.x += speed;
    }

    if (!s.switchPressed && s.player2Pos.x > 2.2) {
      s.player2Pos.x = 2.2;
    }
    if (s.player2Mesh) s.player2Mesh.position.copy(s.player2Pos);

    // Check Pressure Switch: either player stepping on switch opens gate
    const d1 = Math.hypot(s.player1Pos.x - (-2.0), s.player1Pos.z - (-2.0));
    const d2 = Math.hypot(s.player2Pos.x - (-2.0), s.player2Pos.z - (-2.0));
    const isStep = d1 < 1.0 || d2 < 1.0;

    if (isStep !== s.switchPressed) {
      s.switchPressed = isStep;
      setGateOpen(isStep);
      sound.playTap();
      if (s.switchMesh) {
        s.switchMesh.position.y = isStep ? -0.05 : 0.05;
      }
      if (s.gateMesh) {
        s.gateMesh.position.y = isStep ? -2.0 : 1.25; // drop gate into floor
      }
    }

    // Gem Collection
    s.gems.forEach((g) => {
      if (!g.collected) {
        g.mesh.rotation.y += delta * 3;
        if (g.pos.distanceTo(s.player1Pos) < 1.0 || g.pos.distanceTo(s.player2Pos) < 1.0) {
          g.collected = true;
          s.scene?.remove(g.mesh);
          sound.playScore();
          setGemsCollected((c) => c + 1);
          if (s.scene) {
            s.particles.push(createParticleBurst(s.scene, g.pos, 0xffd700, 16));
          }
        }
      }
    });

    // Check Both Reaching Exit Portal (Goal at X = 4.5, Z = 0)
    const goalDist1 = Math.hypot(s.player1Pos.x - 4.5, s.player1Pos.z - 0);
    const goalDist2 = Math.hypot(s.player2Pos.x - 4.5, s.player2Pos.z - 0);

    if (goalDist1 < 1.2 && goalDist2 < 1.2) {
      sound.playWin();
      if (currentLevel + 1 < WORLDS.length) {
        // Next World level!
        const nextLvl = currentLevel + 1;
        setCurrentLevel(nextLvl);
        s.player1Pos.set(-3.5, 0, 2.5);
        s.player2Pos.set(-3.5, 0, 1.0);
        if (s.scene) setupWorldLevel(s.scene, nextLvl);
      } else {
        setGameWon(true);
        onDone(2500);
      }
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setCurrentLevel(0);
    setGemsCollected(0);
    setGateOpen(false);
    setGameWon(false);
    setGameOver(false);
    stateRef.current.player1Pos.set(-3.5, 0, 2.5);
    stateRef.current.player2Pos.set(-3.5, 0, 1.0);
    if (stateRef.current.scene) setupWorldLevel(stateRef.current.scene, 0);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 8.5, 7.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          World: <span className="text-marigold">{world.name} ({currentLevel + 1} / 5)</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Gems: <span className="text-yellow-400">💎 {gemsCollected}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-xs">
          Gate: <span className={gateOpen ? 'text-emerald-400' : 'text-red-400'}>{gateOpen ? 'OPEN' : 'LOCKED'}</span>
        </div>
      </div>

      {/* Mode Switch & Instructions */}
      <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-auto">
        <button
          onClick={() => setAiMode(!aiMode)}
          className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-xs font-bold border border-white/30 hover:bg-white/30"
        >
          Partner Mode: <strong className="text-marigold">{aiMode ? 'AI Teammate (Glacio)' : '2-Player Shared Keyboard (WASD + Arrows)'}</strong>
        </button>
      </div>

      <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
        <span className="text-xs font-bold text-white/70 bg-ink/70 px-4 py-1.5 rounded-full border border-white/10">
          Ember (WASD) & Glacio cooperate! One stands on yellow plate to open gate, both reach green portal!
        </span>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🔥❄️🏆</div>
          <h2 className="text-3xl font-extrabold tracking-tight">All 5 Worlds Cleared!</h2>
          <p className="text-xl font-bold mt-2">
            You & Me Signature Adventure Complete! Gems: <span className="text-marigold">{gemsCollected}</span>
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
