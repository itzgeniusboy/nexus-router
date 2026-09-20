import '../lib/three-setup';
import React, { useRef, useState, useEffect, createContext, useContext } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { Timer } from 'three';

// Shared Timer Context for synchronous frame updates across all 3D mesh instances
const ThreeTimerContext = createContext<Timer | null>(null);

/**
 * TimerProvider instantiates a single shared THREE.Timer instance,
 * connects it to the Document Page Visibility API, and updates it exactly
 * once per animation frame to supply a consistent delta and elapsed time.
 */
const ThreeTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const timerRef = useRef<Timer | null>(null);

  if (!timerRef.current) {
    timerRef.current = new Timer();
    if (typeof document !== 'undefined') {
      timerRef.current.connect(document);
    }
  }

  useEffect(() => {
    const timer = timerRef.current;
    return () => {
      timer?.disconnect();
      timer?.dispose();
    };
  }, []);

  useFrame(() => {
    // Single authoritative frame update for the entire scene
    timerRef.current?.update();
  });

  return (
    <ThreeTimerContext.Provider value={timerRef.current}>
      {children}
    </ThreeTimerContext.Provider>
  );
};

/**
 * Hook providing access to the scene-wide THREE.Timer instance.
 */
function useThreeTimer(): Timer {
  const timer = useContext(ThreeTimerContext);
  if (!timer) {
    // Fallback if rendered outside provider
    const fallbackRef = useRef<Timer | null>(null);
    if (!fallbackRef.current) {
      fallbackRef.current = new Timer();
    }
    return fallbackRef.current;
  }
  return timer;
}

// Floating glass geometric prism
const GlassFacet: React.FC<{
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
  geometryType?: 'octahedron' | 'icosahedron' | 'box';
}> = ({ position, rotation, scale = 1, geometryType = 'octahedron' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timer = useThreeTimer();

  useFrame(() => {
    if (!meshRef.current) return;
    const delta = timer.getDelta();
    meshRef.current.rotation.x += delta * 0.15;
    meshRef.current.rotation.y += delta * 0.2;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.6} floatIntensity={0.8}>
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        {geometryType === 'octahedron' && <octahedronGeometry args={[1, 0]} />}
        {geometryType === 'icosahedron' && <icosahedronGeometry args={[1, 0]} />}
        {geometryType === 'box' && <boxGeometry args={[1.2, 1.2, 1.2]} />}
        <meshPhysicalMaterial
          color="#8C9BFF"
          emissive="#1E2340"
          emissiveIntensity={0.15}
          roughness={0.25}
          metalness={0.1}
          transmission={0.6}
          thickness={0.8}
          transparent
          opacity={0.35}
          wireframe={false}
        />
      </mesh>
    </Float>
  );
};

// Mouse Parallax Controller
const ParallaxRig: React.FC = () => {
  const timer = useThreeTimer();

  useFrame((state) => {
    const delta = timer.getDelta();
    // Gentle mouse parallax smoothly interpolating camera using modern THREE.Timer delta
    const targetX = state.pointer.x * 0.8;
    const targetY = state.pointer.y * 0.5;
    const lerpSpeed = THREE.MathUtils.clamp(delta * 3, 0.02, 0.08);
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, lerpSpeed);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, lerpSpeed);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
};

// Subtle ambient particle dust
const AmbientDust: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const timer = useThreeTimer();
  const count = 35;
  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 16;
      pos[i + 1] = (Math.random() - 0.5) * 8;
      pos[i + 2] = (Math.random() - 0.5) * 6;
    }
    return pos;
  });

  useFrame(() => {
    if (!pointsRef.current) return;
    const delta = timer.getDelta();
    pointsRef.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#7986CB"
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

interface ThreeCanvasProps {
  className?: string;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ className = '' }) => {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
      }
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    // Graceful fallback for non-WebGL environments
    return (
      <div
        className={`absolute inset-0 pointer-events-none bg-gradient-to-tr from-indigo-950/20 via-transparent to-slate-900/40 ${className}`}
      />
    );
  }

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        <ThreeTimerProvider>
          <ambientLight intensity={0.4} color="#C5CEE0" />
          <directionalLight position={[4, 5, 3]} intensity={0.6} color="#8C9BFF" />
          <directionalLight position={[-4, -3, -2]} intensity={0.2} color="#4A5568" />

          <ParallaxRig />
          <AmbientDust />

          {/* Soft floating glass shapes with muted indigo highlights */}
          <GlassFacet position={[-3.2, 0.8, -1]} rotation={[0.4, 0.2, 0.5]} scale={1.1} geometryType="octahedron" />
          <GlassFacet position={[3.4, -0.6, -0.5]} rotation={[0.6, 0.8, 0.1]} scale={1.2} geometryType="icosahedron" />
          <GlassFacet position={[-1.2, -1.2, 0.5]} rotation={[0.2, 0.5, 0.3]} scale={0.8} geometryType="box" />
          <GlassFacet position={[1.8, 1.4, -0.8]} rotation={[0.8, 0.3, 0.6]} scale={0.9} geometryType="octahedron" />
        </ThreeTimerProvider>
      </Canvas>
    </div>
  );
};
