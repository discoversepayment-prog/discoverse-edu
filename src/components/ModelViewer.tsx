import { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";

interface TappedPart {
  name: string;
  description?: string;
}

interface ModelViewerProps {
  modelUrl: string | null;
  highlightPart?: string;
  highlightColor?: string;
  isolatePart?: boolean;
  animationType?: string;
  onPartsLoaded?: (parts: string[]) => void;
  onPartTapped?: (part: TappedPart) => void;
}

const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

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

// Store original materials for reset
const originalMaterials = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>();

function AutoFitModel({
  url, highlightPart, highlightColor, isolatePart, animationType, onPartsLoaded, onPartTapped,
}: {
  url: string; highlightPart?: string; highlightColor?: string; isolatePart?: boolean;
  animationType?: string; onPartsLoaded?: (parts: string[]) => void; onPartTapped?: (part: TappedPart) => void;
}) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const animTimeRef = useRef(0);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const convertMat = (mat: THREE.Material): THREE.MeshStandardMaterial => {
        if (mat instanceof THREE.MeshStandardMaterial) return mat;
        const oldMat = mat as THREE.Material & { color?: THREE.Color; map?: THREE.Texture | null; opacity?: number; transparent?: boolean };
        return new THREE.MeshStandardMaterial({
          color: oldMat.color instanceof THREE.Color ? oldMat.color.clone() : new THREE.Color(0x888888),
          map: oldMat.map || null,
          opacity: typeof oldMat.opacity === "number" ? oldMat.opacity : 1,
          transparent: !!oldMat.transparent,
          side: mat.side,
          roughness: 0.7,
          metalness: 0.1,
        });
      };
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(convertMat);
      } else {
        mesh.material = convertMat(mesh.material);
      }
      // Store original color for reset
      originalMaterials.set(mesh, Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone());
    });
    return clone;
  }, [scene]);

  const meshNames = useMemo(() => {
    const parts: string[] = [];
    clonedScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) parts.push(child.name || `mesh_${parts.length}`);
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

  useEffect(() => { onPartsLoaded?.(meshNames); }, [meshNames, onPartsLoaded]);

  // Highlighting & isolation
  useEffect(() => {
    const activeColor = typeof highlightColor === "string" && /^#([0-9a-fA-F]{6})$/.test(highlightColor) ? highlightColor : "#E9785D";

    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const meshName = child.name || "";

      const applyToMat = (material: THREE.Material) => {
        const mat = material as THREE.MeshStandardMaterial;
        if (!mat.emissive) return;

        if (!highlightPart) {
          // Reset
          mat.opacity = 1; mat.transparent = false; mat.depthWrite = true;
          mat.emissive.set(0x000000); mat.emissiveIntensity = 0;
          mesh.visible = true;
          mat.needsUpdate = true;
          return;
        }

        if (!resolvedHighlightPart) {
          mat.opacity = 1; mat.transparent = false; mat.depthWrite = true;
          mat.color.set(activeColor); mat.emissive.set(activeColor); mat.emissiveIntensity = 0.3;
          mesh.visible = true;
          mat.needsUpdate = true;
          return;
        }

        const isTarget = meshName === resolvedHighlightPart;

        if (isolatePart) {
          // Isolate mode: hide non-target parts
          mesh.visible = isTarget;
          if (isTarget) {
            mat.opacity = 1; mat.transparent = false; mat.depthWrite = true;
            mat.emissive.set(activeColor); mat.emissiveIntensity = 0.5;
          }
        } else {
          // Dim mode
          mesh.visible = true;
          mat.opacity = isTarget ? 1 : 0.12;
          mat.transparent = !isTarget;
          mat.depthWrite = isTarget;
          if (isTarget) {
            mat.emissive.set(activeColor); mat.emissiveIntensity = 0.7;
          } else {
            mat.emissive.set(0x000000); mat.emissiveIntensity = 0;
          }
        }
        mat.needsUpdate = true;
      };

      if (Array.isArray(mesh.material)) mesh.material.forEach(applyToMat);
      else applyToMat(mesh.material);
    });
  }, [highlightPart, highlightColor, resolvedHighlightPart, clonedScene, isolatePart]);

  // Animation system
  useFrame((_, delta) => {
    animTimeRef.current += delta;

    if (groupRef.current && !highlightPart) {
      groupRef.current.rotation.y += delta * 0.15;
    }

    // Programmatic animations based on type
    if (animationType && resolvedHighlightPart) {
      clonedScene.traverse((child) => {
        if (child.name !== resolvedHighlightPart) return;
        const t = animTimeRef.current;

        if (animationType === "pulse" || animationType === "beat") {
          const scale = 1 + Math.sin(t * 4) * 0.06;
          child.scale.setScalar(scale);
        } else if (animationType === "breathe" || animationType === "expand") {
          const scale = 1 + Math.sin(t * 2) * 0.08;
          child.scale.set(1, scale, 1);
        } else if (animationType === "rotate") {
          child.rotation.y += delta * 0.8;
        } else if (animationType === "vibrate") {
          child.position.x = Math.sin(t * 20) * 0.01;
        }
      });
    }
  });

  // Tap handler via raycasting
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const partName = mesh.name || "Unknown Part";
    onPartTapped?.({ name: partName });
  }, [onPartTapped]);

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} onPointerDown={handlePointerDown} />
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
      <meshStandardMaterial color="#E5E0D8" wireframe transparent opacity={0.6} />
    </mesh>
  );
}

export function ModelViewer({ modelUrl, highlightPart, highlightColor, isolatePart, animationType, onPartsLoaded, onPartTapped }: ModelViewerProps) {
  const [tappedInfo, setTappedInfo] = useState<TappedPart | null>(null);
  const tappedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePartTapped = useCallback((part: TappedPart) => {
    setTappedInfo(part);
    onPartTapped?.(part);
    if (tappedTimeoutRef.current) clearTimeout(tappedTimeoutRef.current);
    tappedTimeoutRef.current = setTimeout(() => setTappedInfo(null), 4000);
  }, [onPartTapped]);

  return (
    <div className="w-full h-full relative">
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
              isolatePart={isolatePart}
              animationType={animationType}
              onPartsLoaded={onPartsLoaded}
              onPartTapped={handlePartTapped}
            />
          ) : (
            <PlaceholderScene />
          )}
          <Environment preset="studio" />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.3} scale={8} blur={2} />
        </Suspense>

        <OrbitControls
          enableDamping dampingFactor={0.05}
          minDistance={1.5} maxDistance={10}
          maxPolarAngle={Math.PI / 1.5} target={[0, 0, 0]}
        />
      </Canvas>

      {/* Tap info tooltip */}
      {tappedInfo && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md border border-primary/30 px-4 py-2.5 rounded-xl animate-scale-in shadow-lg max-w-[280px]">
          <p className="text-[12px] font-bold text-primary-custom">{tappedInfo.name.replace(/_/g, " ")}</p>
          {tappedInfo.description && (
            <p className="text-[10px] text-secondary-custom mt-0.5 leading-snug">{tappedInfo.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
