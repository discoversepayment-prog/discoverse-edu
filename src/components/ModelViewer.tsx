import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string | null;
  highlightPart?: string;
  highlightColor?: string;
  onPartsLoaded?: (parts: string[]) => void;
}

const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value);

const resolveMeshName = (candidate: string | undefined, meshNames: string[]) => {
  if (!candidate?.trim() || meshNames.length === 0) return "";
  const trimmed = candidate.trim();

  if (meshNames.includes(trimmed)) return trimmed;

  const normalizedCandidate = normalizeToken(trimmed);
  const exactNormalized = meshNames.find((name) => normalizeToken(name) === normalizedCandidate);
  if (exactNormalized) return exactNormalized;

  const partial = meshNames.find((name) => {
    const normalizedName = normalizeToken(name);
    return normalizedName.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedName);
  });

  return partial || "";
};

function AutoFitModel({ url, highlightPart, highlightColor, onPartsLoaded }: { url: string; highlightPart?: string; highlightColor?: string; onPartsLoaded?: (parts: string[]) => void }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    // Convert all materials to MeshStandardMaterial so highlighting always works
    // (handles KHR_materials_pbrSpecularGlossiness and other non-standard materials)
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const convertMat = (mat: THREE.Material): THREE.MeshStandardMaterial => {
        if (mat instanceof THREE.MeshStandardMaterial) return mat;
        const oldMat = mat as THREE.Material & { color?: THREE.Color; map?: THREE.Texture | null; opacity?: number; transparent?: boolean };
        const newMat = new THREE.MeshStandardMaterial({
          color: oldMat.color instanceof THREE.Color ? oldMat.color.clone() : new THREE.Color(0x888888),
          map: oldMat.map || null,
          opacity: typeof oldMat.opacity === "number" ? oldMat.opacity : 1,
          transparent: !!oldMat.transparent,
          side: mat.side,
          roughness: 0.7,
          metalness: 0.1,
        });
        return newMat;
      };
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(convertMat);
      } else {
        mesh.material = convertMat(mesh.material);
      }
    });
    return clone;
  }, [scene]);

  const meshNames = useMemo(() => {
    const parts: string[] = [];
    clonedScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        parts.push(child.name || `mesh_${parts.length}`);
      }
    });
    return parts;
  }, [clonedScene]);

  const resolvedHighlightPart = useMemo(
    () => resolveMeshName(highlightPart, meshNames),
    [highlightPart, meshNames],
  );

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2.5 / maxDim : 1;
    clonedScene.scale.setScalar(scale);

    const scaledCenter = center.multiplyScalar(scale);
    clonedScene.position.set(-scaledCenter.x, -scaledCenter.y, -scaledCenter.z);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 0.5, 4);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [clonedScene, camera]);

  useEffect(() => {
    onPartsLoaded?.(meshNames);
  }, [meshNames, onPartsLoaded]);

  useEffect(() => {
    const activeColor = isHexColor(highlightColor) ? highlightColor : "#E9785D";

    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const meshName = child.name || "";

      const applyHighlight = (material: THREE.Material) => {
        const mat = material as THREE.MeshStandardMaterial;
        if (!mat.emissive) return; // safety check

        if (!highlightPart) {
          // No highlighting — reset all
          mat.opacity = 1;
          mat.transparent = false;
          mat.depthWrite = true;
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0;
          mat.needsUpdate = true;
          return;
        }

        if (!resolvedHighlightPart) {
          // Part name couldn't be resolved — apply color tint to entire model
          mat.opacity = 1;
          mat.transparent = false;
          mat.depthWrite = true;
          mat.color.set(activeColor);
          mat.emissive.set(activeColor);
          mat.emissiveIntensity = 0.3;
          mat.needsUpdate = true;
          return;
        }

        const isTarget = meshName === resolvedHighlightPart;
        mat.opacity = isTarget ? 1 : 0.15;
        mat.transparent = !isTarget;
        mat.depthWrite = isTarget;

        if (isTarget) {
          mat.color.set(activeColor);
          mat.emissive.set(activeColor);
          mat.emissiveIntensity = 0.7;
        } else {
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0;
        }

        mat.needsUpdate = true;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(applyHighlight);
      } else {
        applyHighlight(mesh.material);
      }
    });
  }, [highlightPart, highlightColor, resolvedHighlightPart, clonedScene]);

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
