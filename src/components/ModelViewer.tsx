import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows, Html, Center } from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string | null;
  highlightPart?: string;
  highlightColor?: string;
  onPartsLoaded?: (parts: string[]) => void;
}

function AutoFitModel({ url, highlightPart, highlightColor, onPartsLoaded }: { url: string; highlightPart?: string; highlightColor?: string; onPartsLoaded?: (parts: string[]) => void }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const originalMaterials = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());

  // Clone scene to avoid mutating the cached original
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Auto-fit: compute bounding box once and scale/position to fit view
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Scale to fit within a 2.5 unit sphere
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2.5 / maxDim : 1;
    clonedScene.scale.setScalar(scale);

    // Re-center after scaling
    const scaledCenter = center.multiplyScalar(scale);
    clonedScene.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z);

    // Position camera
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 0.5, 4);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [clonedScene, camera]);

  // Collect parts and store original materials
  useEffect(() => {
    const parts: string[] = [];
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = child.name || `mesh_${parts.length}`;
        parts.push(name);

        // Store original material for reset
        if (!originalMaterials.current.has(name)) {
          if (Array.isArray(mesh.material)) {
            originalMaterials.current.set(name, mesh.material.map(m => m.clone()));
          } else {
            originalMaterials.current.set(name, mesh.material.clone());
          }
        }

        // Enhance PBR
        if (mesh.material && !Array.isArray(mesh.material)) {
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
  }, [clonedScene, onPartsLoaded]);

  // Handle highlighting
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const meshName = child.name || "";

      const applyHighlight = (m: THREE.Material) => {
        if (!(m instanceof THREE.MeshStandardMaterial)) return;

        if (!highlightPart) {
          // No highlight — reset all to full opacity
          m.opacity = 1;
          m.transparent = false;
          m.emissive = new THREE.Color(0x000000);
          m.emissiveIntensity = 0;
          m.needsUpdate = true;
          return;
        }

        const isTarget = meshName === highlightPart;
        m.opacity = isTarget ? 1 : 0.15;
        m.transparent = true;
        m.depthWrite = isTarget;

        if (isTarget && highlightColor) {
          m.emissive = new THREE.Color(highlightColor);
          m.emissiveIntensity = 0.5;
        } else {
          m.emissive = new THREE.Color(0x000000);
          m.emissiveIntensity = 0;
        }
        m.needsUpdate = true;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(applyHighlight);
      } else {
        applyHighlight(mesh.material);
      }
    });
  }, [highlightPart, highlightColor, clonedScene]);

  // Gentle rotation when no part is highlighted
  useFrame((_, delta) => {
    if (groupRef.current && !highlightPart) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
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
        camera={{ position: [0, 0.5, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.9} castShadow />
        <directionalLight position={[-3, 3, -3]} intensity={0.4} />
        <pointLight position={[0, -3, 0]} intensity={0.2} />
        
        <Suspense fallback={<LoadingIndicator />}>
          {modelUrl ? (
            <AutoFitModel
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
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
