import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props {
  className?: string;
  size?: number;
}

export const ThreeShieldScene: React.FC<Props> = ({ className = '', size = 200 }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const width = size;
    const height = size;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);
    } catch {
      setHasWebGL(false);
      return;
    }

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Sleek Translucent Purple Glass Shield / Core Orb
    const orbGeo = new THREE.SphereGeometry(1.4, 48, 48);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x804A8A,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.45,
      thickness: 1.5,
      transparent: true,
      opacity: 0.92
    });
    const orbMesh = new THREE.Mesh(orbGeo, glassMat);
    mainGroup.add(orbMesh);

    // 2. Delicate Peach Glowing Ring
    const ringGeo = new THREE.TorusGeometry(1.9, 0.045, 24, 80);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xF59E51,
      emissive: 0xF59E51,
      emissiveIntensity: 0.5,
      roughness: 0.2
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3.2;
    ringMesh.rotation.y = Math.PI / 7;
    mainGroup.add(ringMesh);

    // 3. Central 3D Envelope Icon
    const envGroup = new THREE.Group();
    const envBodyGeo = new THREE.BoxGeometry(1.15, 0.75, 0.12);
    const envMat = new THREE.MeshStandardMaterial({
      color: 0xFFF8FF,
      roughness: 0.25,
      metalness: 0.2
    });
    const envBody = new THREE.Mesh(envBodyGeo, envMat);
    envGroup.add(envBody);

    const flapGeo = new THREE.ConeGeometry(0.55, 0.38, 3);
    const flapMat = new THREE.MeshStandardMaterial({
      color: 0xF8D299,
      emissive: 0xF59E51,
      emissiveIntensity: 0.3,
      roughness: 0.3
    });
    const flap = new THREE.Mesh(flapGeo, flapMat);
    flap.rotation.z = Math.PI;
    flap.position.set(0, 0.12, 0.07);
    envGroup.add(flap);

    mainGroup.add(envGroup);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x3A0353, 2.0);
    scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0x804A8A, 3.5, 20);
    keyLight.position.set(-3, 2, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xF59E51, 4.0, 20);
    rimLight.position.set(3, 1.5, 3);
    scene.add(rimLight);

    // Subtle gentle float animation
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mainGroup.position.y = Math.sin(t * 1.2) * 0.12;
      mainGroup.rotation.y = t * 0.28;
      ringMesh.rotation.z = t * 0.18;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      orbGeo.dispose();
      glassMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      envBodyGeo.dispose();
      envMat.dispose();
      flapGeo.dispose();
      flapMat.dispose();
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Soft Purple Glow Disc Underneath */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          width: '120px',
          height: '24px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(128,74,138,0.55) 0%, rgba(245,158,81,0.15) 50%, transparent 75%)',
          filter: 'blur(10px)',
          pointerEvents: 'none'
        }}
      />

      {/* Fallback if WebGL unavailable */}
      {!hasWebGL && (
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #804A8A 0%, #3A0353 60%, #F59E51 100%)',
            boxShadow: '0 0 30px rgba(128, 74, 138, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(248, 210, 153, 0.4)'
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFF8FF" strokeWidth="1.8">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(128,74,138,0.4)" />
            <path d="M4 8l8 5 8-5" stroke="#F8D299" strokeWidth="2" />
          </svg>
        </div>
      )}
    </div>
  );
};
