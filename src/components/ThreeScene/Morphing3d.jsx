import {useRef, useEffect, useState, useMemo} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {useControls} from 'leva';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Vertex shader for particle morphing
const vertexShader = `
  uniform float transitionProgress;
  uniform float particleSize;
  attribute vec3 startPosition;
  attribute vec3 targetPosition;

  void main() {
    // Smooth easing function
    float easedProgress = 0.5 - 0.5 * cos(transitionProgress * 3.141592653589793);
    vec3 animatedPosition = mix(startPosition, targetPosition, easedProgress);

    vec4 mvPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
    gl_PointSize = particleSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader for blue particles
const fragmentShader = `
  uniform vec3 particleColor;

  void main() {
    gl_FragColor = vec4(particleColor, 1.0);
  }
`;

// Function to sample positions from a 3D model
function samplePositionsFromModel(geometry, count, scale = 1) {
  const positions = [];
  const positionAttribute = geometry.getAttribute('position');
  const vertices = positionAttribute.array;

  // Create a bounding box to normalize the model
  const box = new THREE.Box3().setFromBufferAttribute(positionAttribute);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Check if the model has reasonable dimensions
  const maxDimension = Math.max(size.x, size.y, size.z);
  if (maxDimension === 0 || !isFinite(maxDimension)) {
    return generateRandomPositions(count, 2);
  }

  // Use a more conservative scaling approach
  const targetSize = 2; // Target size for the model
  const normalizeScale = (targetSize * scale) / maxDimension;

  // Sample vertices with better distribution
  const vertexCount = vertices.length / 3;

  for (let i = 0; i < count; i++) {
    let randomIndex;

    if (i < vertexCount) {
      // First pass: sample each vertex at least once
      randomIndex = i * 3;
    } else {
      // Additional samples: random vertices
      randomIndex = Math.floor(Math.random() * vertexCount) * 3;
    }

    // Add some randomness around each vertex for better coverage
    const baseX = vertices[randomIndex] - center.x;
    const baseY = vertices[randomIndex + 1] - center.y;
    const baseZ = vertices[randomIndex + 2] - center.z;

    const noise = 0.1; // Small random offset
    const x = (baseX + (Math.random() - 0.5) * noise) * normalizeScale;
    const y = (baseY + (Math.random() - 0.5) * noise) * normalizeScale;
    const z = (baseZ + (Math.random() - 0.5) * noise) * normalizeScale;

    positions.push(x, y, z);
  }

  return new Float32Array(positions);
}

// Alternative sampling method using raycasting for more accurate surface sampling
function samplePositionsFromModelSurface(geometry, count, scale = 1) {
  const positions = [];

  // Create a mesh for raycasting
  const mesh = new THREE.Mesh(geometry);
  const raycaster = new THREE.Raycaster();

  // Get bounding box
  const box = new THREE.Box3().setFromBufferAttribute(
    geometry.getAttribute('position'),
  );
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const targetSize = 2;
  const normalizeScale = (targetSize * scale) / maxDimension;

  // Sample points on the surface using raycasting
  for (let i = 0; i < count; i++) {
    // Generate random direction
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
    ).normalize();

    // Start ray from center
    const origin = center.clone();
    raycaster.set(origin, direction);

    const intersects = raycaster.intersectObject(mesh);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const x = (point.x - center.x) * normalizeScale;
      const y = (point.y - center.y) * normalizeScale;
      const z = (point.z - center.z) * normalizeScale;
      positions.push(x, y, z);
    } else {
      // Fallback to random position if no intersection
      positions.push(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      );
    }
  }

  return new Float32Array(positions);
}

// Function to generate random positions as fallback
function generateRandomPositions(count, spread) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spread * 2;
    const y = (Math.random() - 0.5) * spread * 2;
    const z = (Math.random() - 0.5) * spread * 2;
    positions.push(x, y, z);
  }
  return new Float32Array(positions);
}

// Fallback geometric shapes when models fail to load
function generateFallbackShape(modelIndex, count, scale = 1) {
  const positions = [];

  switch (modelIndex) {
    case 0: // Human - use a humanoid shape (tall cylinder with head)
      for (let i = 0; i < count; i++) {
        const t = i / count;
        let y, radius;

        if (t < 0.2) {
          // Head
          y = (t - 0.1) * 4 * scale;
          radius = scale * 0.4 * (1 - t * 2);
        } else if (t < 0.8) {
          // Body
          y = (t - 0.5) * 3 * scale;
          radius = scale * 0.5;
        } else {
          // Legs
          y = (t - 0.9) * 2 * scale;
          radius = scale * 0.3;
        }

        const angle = (i * 137.5) % 360; // Golden angle
        const x = radius * Math.cos((angle * Math.PI) / 180);
        const z = radius * Math.sin((angle * Math.PI) / 180);
        positions.push(x, y, z);
      }
      break;

    case 1: // Brain - use a wrinkled sphere
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        const baseRadius = scale * 1.2;
        const wrinkles =
          0.3 * Math.sin(theta * 3) * Math.cos(phi * 4) +
          0.2 * Math.sin(theta * 5) * Math.cos(phi * 2);
        const radius = baseRadius * (1 + wrinkles);
        const x = radius * Math.cos(theta) * Math.sin(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(phi);
        positions.push(x, y, z);
      }
      break;

    case 2: // Stomach - use a more organic oval shape
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        const organic = 0.2 * Math.sin(theta * 2) * Math.cos(phi * 3);
        const x = scale * (1.8 + organic) * Math.cos(theta) * Math.sin(phi);
        const y =
          scale * (1.2 + organic * 0.5) * Math.sin(theta) * Math.sin(phi);
        const z = scale * (1.0 + organic * 0.3) * Math.cos(phi);
        positions.push(x, y, z);
      }
      break;

    default:
      return generateRandomPositions(count, 2);
  }

  return new Float32Array(positions);
}

export default function Morphing3d() {
  const {scene} = useThree();
  const pointsRef = useRef();
  const materialRef = useRef();

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelGeometries, setModelGeometries] = useState([]);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastCycleTime, setLastCycleTime] = useState(0);

  // Leva controls
  const {
    particleCount,
    particleSize,
    humanScale,
    brainScale,
    stomachScale,
    transitionDuration,
    autoRotate,
    rotationSpeed,
    currentModel,
    useSurfaceSampling,
    pauseTransitions,
    autoCycle,
    cycleSpeed,
  } = useControls('Morphing 3D', {
    particleCount: {value: 2000, min: 100, max: 10000, step: 100},
    particleSize: {value: 0.05, min: 0.01, max: 0.2, step: 0.0001},
    humanScale: {value: 1.0, min: 0.001, max: 3.0, step: 0.001},
    brainScale: {value: 1.0, min: 0.001, max: 3.0, step: 0.001},
    stomachScale: {value: 1.0, min: 0.001, max: 3.0, step: 0.001},
    transitionDuration: {value: 3.0, min: 1.0, max: 10.0, step: 0.5},
    autoRotate: {value: true},
    rotationSpeed: {value: 0.5, min: 0.0, max: 2.0, step: 0.1},
    useSurfaceSampling: {value: false},
    pauseTransitions: {value: false},
    autoCycle: {value: false},
    cycleSpeed: {value: 5.0, min: 1.0, max: 20.0, step: 0.5},
    currentModel: {
      value: 0,
      min: 0,
      max: 2,
      step: 1,
      render: (get) => {
        const modelNames = ['Human', 'Brain', 'Stomach'];
        return modelNames[get('currentModel')];
      },
    },
  });

  // Load 3D models
  useEffect(() => {
    const loader = new GLTFLoader();
    // Construct absolute URLs for production compatibility
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const modelPaths = [
      `${baseUrl}/3d/human/scene.gltf`,
      `${baseUrl}/3d/human-brain/source/Rotten Brain.glb`,
      `${baseUrl}/3d/stomach/scene.gltf`,
    ];

    const loadPromises = modelPaths.map((path, index) => {
      return new Promise((resolve) => {
        loader.load(
          path,
          (gltf) => {
            // Extract geometry from the loaded model - handle nested structures
            let geometry = null;

            // Try to find geometry in the scene
            gltf.scene.traverse((child) => {
              if (child.geometry && !geometry) {
                geometry = child.geometry;
              }
            });

            // If still no geometry, try the first child
            if (!geometry && gltf.scene.children.length > 0) {
              geometry = gltf.scene.children[0]?.geometry;
            }

            if (geometry) {
              resolve({index, geometry});
            } else {
              resolve({index, geometry: null});
            }
          },
          undefined,
          (error) => {
            console.error(`Error loading model ${index}:`, error);
            resolve({index, geometry: null});
          },
        );
      });
    });

    Promise.all(loadPromises).then((results) => {
      const geometries = new Array(3).fill(null);
      results.forEach(({index, geometry}) => {
        if (geometry) {
          geometries[index] = geometry;
        }
      });
      setModelGeometries(geometries);
      setModelsLoaded(true);
    });
  }, []);

  // Create particle system
  const particleSystem = useMemo(() => {
    if (!modelsLoaded || modelGeometries.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        transitionProgress: {value: 0.0},
        particleSize: {value: particleSize},
        particleColor: {value: new THREE.Color(0x0066ff)}, // Blue color
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    // Create position arrays
    const sourcePositions = new Float32Array(particleCount * 3);
    const targetPositions = new Float32Array(particleCount * 3);

    // Initialize with random positions (smaller spread)
    const randomPositions = generateRandomPositions(particleCount, 2);
    sourcePositions.set(randomPositions);

    // Set initial target positions from first model
    const scales = [humanScale, brainScale, stomachScale];
    if (modelGeometries[0]) {
      const initialTarget = useSurfaceSampling
        ? samplePositionsFromModelSurface(
            modelGeometries[0],
            particleCount,
            scales[0],
          )
        : samplePositionsFromModel(
            modelGeometries[0],
            particleCount,
            scales[0],
          );
      targetPositions.set(initialTarget);
    } else {
      // Use fallback shape for human model
      const fallbackTarget = generateFallbackShape(0, particleCount, scales[0]);
      targetPositions.set(fallbackTarget);
    }

    // Add attributes
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(sourcePositions, 3),
    );
    geometry.setAttribute(
      'startPosition',
      new THREE.BufferAttribute(sourcePositions, 3),
    );
    geometry.setAttribute(
      'targetPosition',
      new THREE.BufferAttribute(targetPositions, 3),
    );

    return {geometry, material, sourcePositions, targetPositions};
  }, [
    modelsLoaded,
    modelGeometries,
    particleCount,
    humanScale,
    brainScale,
    stomachScale,
    particleSize,
    useSurfaceSampling,
  ]);

  // Handle model change
  useEffect(() => {
    if (!particleSystem || !modelsLoaded) return;

    const {geometry, sourcePositions, targetPositions} = particleSystem;
    const scales = [humanScale, brainScale, stomachScale];

    // Set current positions as source
    sourcePositions.set(targetPositions);
    geometry.attributes.startPosition.needsUpdate = true;

    // Generate new target positions
    if (modelGeometries[currentModel]) {
      const newTarget = useSurfaceSampling
        ? samplePositionsFromModelSurface(
            modelGeometries[currentModel],
            particleCount,
            scales[currentModel],
          )
        : samplePositionsFromModel(
            modelGeometries[currentModel],
            particleCount,
            scales[currentModel],
          );
      targetPositions.set(newTarget);
    } else {
      // Use fallback shape for the current model
      const fallbackTarget = generateFallbackShape(
        currentModel,
        particleCount,
        scales[currentModel],
      );
      targetPositions.set(fallbackTarget);
    }

    geometry.attributes.targetPosition.needsUpdate = true;

    // Start transition
    setTransitionProgress(0);
    setIsTransitioning(true);
  }, [
    currentModel,
    particleCount,
    humanScale,
    brainScale,
    stomachScale,
    modelGeometries,
    modelsLoaded,
    particleSystem,
    useSurfaceSampling,
  ]);

  // Update particle count
  useEffect(() => {
    if (!particleSystem || !modelsLoaded) return;

    const {geometry, sourcePositions, targetPositions} = particleSystem;

    // Resize arrays if needed
    if (sourcePositions.length !== particleCount * 3) {
      const newSourcePositions = new Float32Array(particleCount * 3);
      const newTargetPositions = new Float32Array(particleCount * 3);

      // Copy existing data
      const copyCount = Math.min(sourcePositions.length / 3, particleCount);
      for (let i = 0; i < copyCount * 3; i++) {
        newSourcePositions[i] = sourcePositions[i];
        newTargetPositions[i] = targetPositions[i];
      }

      // Fill remaining with random positions
      const randomPositions = generateRandomPositions(
        particleCount - copyCount,
        2,
      );
      for (let i = 0; i < randomPositions.length; i++) {
        newSourcePositions[copyCount * 3 + i] = randomPositions[i];
        newTargetPositions[copyCount * 3 + i] = randomPositions[i];
      }

      // Update geometry attributes
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(newSourcePositions, 3),
      );
      geometry.setAttribute(
        'startPosition',
        new THREE.BufferAttribute(newSourcePositions, 3),
      );
      geometry.setAttribute(
        'targetPosition',
        new THREE.BufferAttribute(newTargetPositions, 3),
      );

      // Update references
      particleSystem.sourcePositions = newSourcePositions;
      particleSystem.targetPositions = newTargetPositions;
    }
  }, [
    particleCount,
    brainScale,
    humanScale,
    stomachScale,
    modelsLoaded,
    particleSystem,
  ]);

  // Animation loop
  useFrame((state, delta) => {
    if (!materialRef.current || !particleSystem) return;

    // Update transition progress
    if (isTransitioning && !pauseTransitions) {
      const newProgress = transitionProgress + delta / transitionDuration;
      if (newProgress >= 1) {
        setTransitionProgress(1);
        setIsTransitioning(false);
      } else {
        setTransitionProgress(newProgress);
      }
    }

    // Auto cycle through models
    if (autoCycle && !isTransitioning && !pauseTransitions) {
      const currentTime = state.clock.elapsedTime;
      if (currentTime - lastCycleTime >= cycleSpeed) {
        // Cycle through models by updating the Leva control
        // This will trigger the useEffect that handles model changes
        setLastCycleTime(currentTime);
      }
    }

    // Update uniforms
    materialRef.current.uniforms.transitionProgress.value = transitionProgress;
    materialRef.current.uniforms.particleSize.value = particleSize;

    // Auto rotation
    if (autoRotate) {
      scene.rotation.x += rotationSpeed * 0.001;
      scene.rotation.y += rotationSpeed * 0.001;
    }
  });

  // Handle model selection from Leva
  useEffect(() => {
    // This will trigger the model change effect
  }, [currentModel]);

  if (!modelsLoaded || !particleSystem) {
    return null;
  }

  return (
    <points
      ref={pointsRef}
      args={[particleSystem.geometry, particleSystem.material]}
    />
  );
}
