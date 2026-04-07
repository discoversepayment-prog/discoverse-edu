import { Suspense, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function WireframeModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = new THREE.MeshBasicMaterial({
        color: 0x888888,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      });
    });
    return clone;
  }, [scene]);

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
    }
  }, [clonedScene, camera]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.2;
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

export function D1WireframeCanvas({ modelUrl }: { modelUrl: string }) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0.5, 4], fov: 45 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <Suspense fallback={null}>
          <WireframeModel url={modelUrl} />
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={8} />
      </Canvas>
    </div>
  );
}
