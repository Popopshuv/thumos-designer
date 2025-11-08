import { useGLTF, useTexture } from "@react-three/drei";
import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import * as THREE from "three";

const SCALE_NORMAL = 0.03;

// Controller component that's always mounted to register controls
export function PouchController() {
  const controls = useControls("Pouch Settings", {
    pouchPositionX: {
      value: -2.5,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Pouch X",
    },
    pouchPositionY: {
      value: -3,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Pouch Y",
    },
    pouchPositionZ: {
      value: 0,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Pouch Z",
    },
    pouchScale: {
      value: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Pouch Scale",
    },
  });

  const animationControls = useControls("Pouch Animation", {
    animationType: {
      value: "none",
      options: ["none", "floating", "spinning", "pulsing"],
      label: "Animation Type",
    },
    floatingSpeed: {
      value: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Floating Speed",
    },
    floatingAmount: {
      value: 0.5,
      min: 0,
      max: 2,
      step: 0.1,
      label: "Floating Amount",
    },
    spinningSpeed: {
      value: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Spinning Speed",
    },
    pulsingSpeed: {
      value: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Pulsing Speed",
    },
    pulsingAmount: {
      value: 0.2,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Pulsing Amount",
    },
  });

  const instancingControls = useControls("Pouch Instancing", {
    useInstancing: {
      value: false,
      label: "Enable Instancing",
    },
    instanceCount: {
      value: 20,
      min: 1,
      max: 100,
      step: 1,
      label: "Number of Pouches",
    },
    sphereRadius: {
      value: 5,
      min: 1,
      max: 20,
      step: 0.5,
      label: "Sphere Radius",
    },
  });

  // Store controls in a way that Pouch can access
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Send update when controls change
      window.dispatchEvent(
        new CustomEvent("pouchControlsUpdate", { detail: controls })
      );
      window.dispatchEvent(
        new CustomEvent("pouchAnimationUpdate", { detail: animationControls })
      );
      window.dispatchEvent(
        new CustomEvent("pouchInstancingUpdate", { detail: instancingControls })
      );
    }
  }, [controls, animationControls, instancingControls]);

  return null;
}

function Pouch({ instanceIndex = null, basePosition = null }) {
  // Use main GLTF file for design purposes
  const { nodes, materials } = useGLTF("/3d/pouch2/scene.gltf");
  const pouchRef = useRef();
  const [isLoaded, setIsLoaded] = useState(false);
  const loadAnimationRef = useRef(0);
  const animationTimeRef = useRef(0);
  const [pouchControls, setPouchControls] = useState({
    pouchPositionX: -2.5,
    pouchPositionY: -3,
    pouchPositionZ: 0,
    pouchScale: 1,
  });
  const [animationControls, setAnimationControls] = useState({
    animationType: "none",
    floatingSpeed: 1,
    floatingAmount: 0.5,
    spinningSpeed: 1,
    pulsingSpeed: 1,
    pulsingAmount: 0.2,
  });

  // Manually load textures from files
  const textures = useTexture({
    map: "/3d/pouch2/textures/Scene_-_Root_baseColor.png",
    normalMap: "/3d/pouch2/textures/Scene_-_Root_normal.png",
    roughnessMap: "/3d/pouch2/textures/Scene_-_Root_metallicRoughness.png",
  });

  // Listen for control updates
  useEffect(() => {
    const handleControlsUpdate = (e) => {
      setPouchControls(e.detail);
    };
    const handleAnimationUpdate = (e) => {
      setAnimationControls(e.detail);
    };

    window.addEventListener("pouchControlsUpdate", handleControlsUpdate);
    window.addEventListener("pouchAnimationUpdate", handleAnimationUpdate);

    return () => {
      window.removeEventListener("pouchControlsUpdate", handleControlsUpdate);
      window.removeEventListener("pouchAnimationUpdate", handleAnimationUpdate);
    };
  }, []);

  // Check if everything is loaded
  useEffect(() => {
    if (
      nodes &&
      materials &&
      textures.map &&
      textures.normalMap &&
      textures.roughnessMap
    ) {
      // Small delay to ensure everything is ready, then start animation
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes, materials, textures]);

  // Clone material and apply textures manually
  const material = useMemo(() => {
    if (materials && materials["Scene_-_Root"]) {
      const mat = materials["Scene_-_Root"].clone();

      // Apply manually loaded textures if material doesn't have them
      if (!mat.map && textures.map) {
        mat.map = textures.map;
        mat.map.flipY = false;
        mat.map.needsUpdate = true;
      }
      if (!mat.normalMap && textures.normalMap) {
        mat.normalMap = textures.normalMap;
        mat.normalMap.flipY = false;
        mat.normalMap.needsUpdate = true;
      }
      if (textures.roughnessMap) {
        mat.roughnessMap = textures.roughnessMap;
        mat.roughnessMap.flipY = false;
        mat.roughnessMap.needsUpdate = true;
      }

      mat.needsUpdate = true;

      return mat;
    }
    return null;
  }, [materials, textures]);

  // useFrame handles all positioning including initial state
  useFrame((state, delta) => {
    if (!pouchRef.current) return;

    const position = pouchRef.current.position;
    const rotation = pouchRef.current.rotation;
    const scale = pouchRef.current.scale;

    // Update animation time (general time accumulator)
    animationTimeRef.current += delta;

    // Handle loading animation - scale from 0 to initial scale
    if (isLoaded && loadAnimationRef.current < 1) {
      loadAnimationRef.current = Math.min(
        1,
        loadAnimationRef.current + delta * 2
      ); // 2 seconds to animate
    }

    // Get the base scale based on loading animation
    const loadingScale = THREE.MathUtils.lerp(0, 1, loadAnimationRef.current);

    // Base position - use instance position if provided, otherwise use controls
    // When instancing, add control positions as offset to sphere positions
    let baseX = basePosition
      ? basePosition[0] + pouchControls.pouchPositionX
      : pouchControls.pouchPositionX;
    let baseY = basePosition
      ? basePosition[1] + pouchControls.pouchPositionY
      : pouchControls.pouchPositionY;
    let baseZ = basePosition
      ? basePosition[2] + pouchControls.pouchPositionZ
      : pouchControls.pouchPositionZ;

    // Apply floating animation
    if (animationControls.animationType === "floating") {
      const floatAmount = animationControls.floatingAmount;
      const time = animationTimeRef.current * animationControls.floatingSpeed;
      baseX += Math.sin(time * 0.7) * floatAmount;
      baseY += Math.cos(time * 0.5) * floatAmount;
      baseZ += Math.sin(time * 0.3) * floatAmount * 0.5;
    }

    // Set position (only translation, no rotation from position)
    position.x = baseX;
    position.y = baseY;
    position.z = baseZ;

    // Handle rotation - keep base rotation, add spinning if enabled
    const baseRotationY = -0.75;
    if (animationControls.animationType === "spinning") {
      rotation.y =
        baseRotationY +
        animationTimeRef.current * animationControls.spinningSpeed;
    } else {
      rotation.y = baseRotationY; // Keep initial rotation, independent of position
    }

    // Handle pulsing animation
    let pulseScale = 1;
    if (animationControls.animationType === "pulsing") {
      const pulse =
        Math.sin(animationTimeRef.current * animationControls.pulsingSpeed) *
        animationControls.pulsingAmount;
      pulseScale = 1 + pulse;
    }

    const finalScale =
      SCALE_NORMAL * loadingScale * pouchControls.pouchScale * pulseScale;
    scale.x = finalScale;
    scale.y = finalScale;
    scale.z = finalScale;
  });

  return (
    <group ref={pouchRef} renderOrder={10} dispose={null}>
      <mesh
        geometry={nodes.Box001__0.geometry}
        material={material}
        rotation={[-Math.PI / 2, -0.1, 0]}
      />
    </group>
  );
}

// Instanced Pouches component
export function InstancedPouches() {
  const [instancingControls, setInstancingControls] = useState({
    useInstancing: false,
    instanceCount: 20,
    sphereRadius: 5,
  });

  useEffect(() => {
    const handleInstancingUpdate = (e) => {
      setInstancingControls(e.detail);
    };

    window.addEventListener("pouchInstancingUpdate", handleInstancingUpdate);

    return () => {
      window.removeEventListener(
        "pouchInstancingUpdate",
        handleInstancingUpdate
      );
    };
  }, []);

  // Generate sphere positions
  const positions = useMemo(() => {
    const pos = [];
    const count = instancingControls.instanceCount;
    const radius = instancingControls.sphereRadius;

    // Use Fibonacci sphere algorithm for even distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const theta = goldenAngle * i;
      const y = 1 - (2 * i) / count;
      const r = Math.sqrt(1 - y * y);
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      pos.push([x * radius, y * radius, z * radius]);
    }

    return pos;
  }, [instancingControls.instanceCount, instancingControls.sphereRadius]);

  if (!instancingControls.useInstancing) {
    return null;
  }

  return (
    <>
      {positions.map((pos, index) => (
        <Pouch key={index} instanceIndex={index} basePosition={pos} />
      ))}
    </>
  );
}

useGLTF.preload("/3d/pouch2/scene.gltf");

export default Pouch;
