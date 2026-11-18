'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeCanvasProps {
  onInit: (params: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    container: HTMLDivElement;
  }) => void;
  onFrame?: (delta: number, time: number) => void;
  onResize?: (width: number, height: number) => void;
  className?: string;
  cameraFov?: number;
  cameraPos?: [number, number, number];
  cameraLookAt?: [number, number, number];
  shadows?: boolean;
}

export function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as any).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  });
}

export default function ThreeCanvas({
  onInit,
  onFrame,
  onResize,
  className = 'w-full h-full min-h-[350px]',
  cameraFov = 50,
  cameraPos = [0, 5, 10],
  cameraLookAt = [0, 0, 0],
  shadows = true,
}: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(cameraFov, width / height, 0.1, 1000);
    camera.position.set(...cameraPos);
    camera.lookAt(new THREE.Vector3(...cameraLookAt));

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    if (shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Call init hook
    onInit({ scene, camera, renderer, container });

    // Render loop
    const clock = new THREE.Clock();
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (onFrame) {
        onFrame(delta, time);
      }

      renderer.render(scene, camera);
      animFrameId.current = requestAnimationFrame(render);
    };
    animFrameId.current = requestAnimationFrame(render);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          if (onResize) onResize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      isRunning = false;
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      resizeObserver.disconnect();
      disposeHierarchy(scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={`relative overflow-hidden select-none ${className}`} />;
}
