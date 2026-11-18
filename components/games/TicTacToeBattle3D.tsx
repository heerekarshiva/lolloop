'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { getTicTacToeMove, BotDifficulty } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

export default function TicTacToeBattle3D({ onDone, botDifficulty = 'Medium' }: Props) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const stateRef = useRef({
    board: Array(9).fill(null) as (string | null)[],
    turn: 'X' as 'X' | 'O',
    tokenMeshes: [] as THREE.Mesh[],
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x111827);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.3);
    dir.position.set(6, 12, 8);
    scene.add(ambient, dir);

    // Neon 3D Grid Board
    const gridMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.2,
    });

    // 4 Grid Lines
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 0.15), gridMat);
    h1.position.set(0, 0, -1);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 0.15), gridMat);
    h2.position.set(0, 0, 1);
    const v1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 6), gridMat);
    v1.position.set(-1, 0, 0);
    const v2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 6), gridMat);
    v2.position.set(1, 0, 0);

    scene.add(h1, h2, v1, v2);
  };

  const checkWinner = (b: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [x, y, z] of lines) {
      if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
    }
    if (b.every((c) => c !== null)) return 'Draw';
    return null;
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || turn !== 'X') return;
    placeMove(index, 'X');
  };

  const placeMove = (index: number, symbol: 'X' | 'O') => {
    const s = stateRef.current;
    if (s.board[index] || !s.scene) return;

    sound.playTap();
    s.board[index] = symbol;
    setBoard([...s.board]);

    // Spawn 3D Token
    const row = Math.floor(index / 3) - 1;
    const col = (index % 3) - 1;
    const posX = col * 2;
    const posZ = row * 2;

    let tokenMesh: THREE.Mesh;
    if (symbol === 'X') {
      const geo = new THREE.BoxGeometry(1.2, 0.3, 0.3);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00b0ff,
        emissiveIntensity: 0.6,
      });
      tokenMesh = new THREE.Mesh(geo, mat);
      tokenMesh.rotation.y = Math.PI / 4;
      const x2 = new THREE.Mesh(geo, mat);
      x2.rotation.y = -Math.PI / 4;
      tokenMesh.add(x2);
    } else {
      const geo = new THREE.TorusGeometry(0.6, 0.15, 12, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffb800,
        emissive: 0xff9800,
        emissiveIntensity: 0.6,
      });
      tokenMesh = new THREE.Mesh(geo, mat);
      tokenMesh.rotation.x = Math.PI / 2;
    }

    tokenMesh.position.set(posX, 0.3, posZ);
    s.scene.add(tokenMesh);
    s.tokenMeshes.push(tokenMesh);

    // Check game over
    const res = checkWinner(s.board);
    if (res) {
      setWinner(res);
      if (res === 'X') {
        sound.playWin();
        setScore((sc) => sc + 500);
        s.particles.push(createParticleBurst(s.scene, new THREE.Vector3(0, 1, 0), 0x00e5ff, 30));
        onDone(score + 500);
      } else if (res === 'O') {
        sound.playLose();
      }
      return;
    }

    // Switch turn
    const nextTurn = symbol === 'X' ? 'O' : 'X';
    s.turn = nextTurn;
    setTurn(nextTurn);
  };

  // Bot Turn Trigger
  useEffect(() => {
    if (turn === 'O' && !winner) {
      const timer = setTimeout(() => {
        const botMove = getTicTacToeMove(stateRef.current.board, 'O', 'X', botDifficulty);
        if (botMove !== -1) {
          placeMove(botMove, 'O');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, botDifficulty]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    const s = stateRef.current;
    if (s.scene) {
      s.tokenMeshes.forEach((m) => s.scene?.remove(m));
      s.tokenMeshes = [];
    }
    s.board = Array(9).fill(null);
    s.turn = 'X';
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 6.5, 4.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Turn: <span className={turn === 'X' ? 'text-cyan-400' : 'text-marigold'}>{turn === 'X' ? 'Your Turn (X)' : `AI Bot (${botDifficulty})`}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
      </div>

      {/* 3x3 Clickable Grid Overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="grid grid-cols-3 gap-4 max-w-xs w-full">
          {board.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              className={`h-24 rounded-2xl flex items-center justify-center font-black text-4xl transition shadow-lg ${
                cell === 'X'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/40'
                  : cell === 'O'
                  ? 'text-marigold bg-amber-950/40 border border-amber-500/40'
                  : 'bg-white/5 border border-white/10 hover:bg-white/15 active:scale-95'
              }`}
            >
              {cell || ''}
            </button>
          ))}
        </div>
      </div>

      {/* Game Over Modal */}
      {winner && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{winner === 'X' ? '🏆❌' : winner === 'O' ? '🤖⭕' : '🤝'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {winner === 'X' ? 'Victory! You Beat The Bot!' : winner === 'O' ? 'AI Bot Won!' : 'Match Drawn!'}
          </h2>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Rematch
          </button>
        </div>
      )}
    </div>
  );
}
