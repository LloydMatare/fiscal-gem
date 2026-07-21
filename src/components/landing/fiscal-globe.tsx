"use client";

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  globe: THREE.Mesh;
  particles: THREE.Points;
  ring: THREE.Mesh;
  ring2: THREE.Mesh;
  nodeGroup: THREE.Group;
}

export function FiscalGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<SceneRefs | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  const animate = useCallback(() => {
    const r = refs.current;
    const renderer = rendererRef.current;
    if (!r || !renderer) return;

    const time = Date.now() * 0.0003;

    r.globe.rotation.y = time * 0.5;
    r.globe.rotation.x = Math.sin(time * 0.3) * 0.1;

    r.particles.rotation.y = time * 0.2;
    r.particles.rotation.x = time * 0.1;

    r.ring.rotation.x = Math.PI / 2 + Math.sin(time) * 0.15;
    r.ring.rotation.z = time * 0.3;

    r.ring2.rotation.x = Math.PI / 3 + Math.cos(time) * 0.1;
    r.ring2.rotation.z = -time * 0.2;

    r.nodeGroup.rotation.y = time * 0.4;
    r.nodeGroup.children.forEach((node, i) => {
      const scale = 0.8 + Math.sin(time * 2 + i) * 0.3;
      node.scale.setScalar(scale);
    });

    renderer.render(r.scene, r.camera);
    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    const primary = new THREE.Color(0x005f02);
    const mid = new THREE.Color(0x427a43);
    const gold = new THREE.Color(0xc0b87a);

    // Globe wireframe
    const globeGeo = new THREE.IcosahedronGeometry(1.8, 4);
    const globeMat = new THREE.MeshBasicMaterial({
      color: mid,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Inner glow sphere
    const innerGeo = new THREE.IcosahedronGeometry(1.7, 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: primary,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(innerGeo, innerMat));

    // Ring 1
    const ringGeo = new THREE.TorusGeometry(2.4, 0.008, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: gold,
      transparent: true,
      opacity: 0.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    scene.add(ring);

    // Ring 2
    const ring2Geo = new THREE.TorusGeometry(2.8, 0.005, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: mid,
      transparent: true,
      opacity: 0.25,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    scene.add(ring2);

    // Connection nodes
    const nodeGroup = new THREE.Group();
    const nodeGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const nodeMat = new THREE.MeshBasicMaterial({ color: gold });
    const nodePositions: [number, number, number][] = [
      [1.8, 0, 0], [-1.8, 0, 0], [0, 1.8, 0], [0, -1.8, 0],
      [1.2, 1.2, 0.5], [-1.2, -1.2, -0.5], [0.5, -1.5, 1], [-0.5, 1.5, -1],
      [1.5, 0.3, -1], [-1.5, -0.3, 1], [0.8, -0.8, 1.5], [-0.8, 0.8, -1.5],
    ];
    nodePositions.forEach(([x, y, z]) => {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(x, y, z);
      nodeGroup.add(node);
    });
    scene.add(nodeGroup);

    // Connection lines between nodes
    const lineMat = new THREE.LineBasicMaterial({
      color: gold,
      transparent: true,
      opacity: 0.2,
    });
    for (let i = 0; i < nodeGroup.children.length - 1; i += 2) {
      const a = nodeGroup.children[i].position;
      const b = nodeGroup.children[i + 1].position;
      const lineGeo = new THREE.BufferGeometry().setFromPoints([a, b]);
      scene.add(new THREE.Line(lineGeo, lineMat));
    }

    // Particles
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: gold,
      size: 0.015,
      transparent: true,
      opacity: 0.5,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    refs.current = { scene, camera, globe, particles, ring, ring2, nodeGroup };
    rendererRef.current = renderer;
    frameRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [animate]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      style={{ pointerEvents: "none" }}
    />
  );
}
