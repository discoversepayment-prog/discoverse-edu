import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows, Html, Center } from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string | null;
  highlightPart?: string;
  highlightColor?: string;
  onPartsLoaded?: (parts: string[]) => void;
}

function Model({ url, highlightPart, highlightColor, onPartsLoaded }: { url: string; highlightPart?: string; highlightColor?: string; onPartsLoaded?: (parts: string[]) => void }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const parts: string[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        parts.push(child.name || `mesh_${parts.length}`);
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.isMeshStandardMaterial) {
            mat.roughness = 0.4;
            mat.metalness = 0.1;
            mat.envMapIntensity = 1.2;
          }
        }
      }
    });
    onPartsLoaded?.(parts);
  }, [scene, onPartsLoaded]);

  useEffect(() => {
    if (!highlightPart) return;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const isTarget = child.name === highlightPart;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.opacity = isTarget ? 1 : 0.3;
              m.transparent = !isTarget;
              if (isTarget && highlightColor) {
                m.emissive = new THREE.Color(highlightColor);
                m.emissiveIntensity = 0.3;
              } else {
                m.emissive = new THREE.Color(0x000000);
                m.emissiveIntensity = 0;
              }
            }
          });
        } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = isTarget ? 1 : 0.3;
          mesh.material.transparent = !isTarget;
          if (isTarget && highlightColor) {
            mesh.material.emissive = new THREE.Color(highlightColor);
            mesh.material.emissiveIntensity = 0.3;
          } else {
            mesh.material.emissive = new THREE.Color(0x000000);
            mesh.material.emissiveIntensity = 0;
          }
        }
      }
    });
  }, [highlightPart, highlightColor, scene]);

  useFrame((_, delta) => {
    if (groupRef.current && !highlightPart) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={scene} />
      </group>
    </Center>
  );
}

function LoadingIndicator() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
        <p className="text-sm text-secondary-custom whitespace-nowrap">Loading 3D model...</p>
      </div>
    </Html>
  );
}

function PlaceholderScene() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.3;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.2, 1]} />
      <meshStandardMaterial
        color="#E5E0D8"
        wireframe
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

export function ModelViewer({ modelUrl, highlightPart, highlightColor, onPartsLoaded }: ModelViewerProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} />
        <pointLight position={[0, -3, 0]} intensity={0.2} />
        
        <Suspense fallback={<LoadingIndicator />}>
          {modelUrl ? (
            <Model
              url={modelUrl}
              highlightPart={highlightPart}
              highlightColor={highlightColor}
              onPartsLoaded={onPartsLoaded}
            />
          ) : (
            <PlaceholderScene />
          )}
          <Environment preset="studio" />
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.3}
            scale={8}
            blur={2}
          />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1.5}
          maxDistance={10}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
