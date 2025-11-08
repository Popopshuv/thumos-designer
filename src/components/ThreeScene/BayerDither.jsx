import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uBrightness;
uniform float uContrast;
uniform float uFbmScale;
uniform float uFbmSpeed;
uniform float uBlueIntensity;
uniform float uAlphaIntensity;
uniform float uContourLevels;
uniform float uLineWidth;

// Topography map shader using FBM noise to create animated contour lines
// The noise represents elevation, and contour lines are drawn at regular intervals

out vec4 fragColor;

#define FBM_OCTAVES     2
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.
// FBM_SCALE will be passed as uniform

/*-------------------------------------------------------------
  1-D hash and 3-D value-noise helpers (unchanged)
-------------------------------------------------------------*/
float hash11(float n) { return fract(sin(n)*43758.5453); }

float vnoise(vec3 p)
{
    vec3 ip = floor(p);
    vec3 fp = fract(p);

    float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
    float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
    float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
    float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
    float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
    float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
    float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
    float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));

    vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);   // smootherstep

    float x00 = mix(n000, n100, w.x);
    float x10 = mix(n010, n110, w.x);
    float x01 = mix(n001, n101, w.x);
    float x11 = mix(n011, n111, w.x);

    float y0  = mix(x00, x10, w.y);
    float y1  = mix(x01, x11, w.y);

    return mix(y0, y1, w.z) * 2.0 - 1.0;         // [-1,1]
}

/*-------------------------------------------------------------
  Stable fBm – no default args, loop fully static
-------------------------------------------------------------*/
float fbm2(vec2 uv, float t)
{
    vec3 p   = vec3(uv * uFbmScale, t);
    float amp  = 1.;
    float freq = 1.;
    float sum  = 1.;

    for (int i = 0; i < FBM_OCTAVES; ++i)
    {
        sum  += amp * vnoise(p * freq);
        freq *= FBM_LACUNARITY;
        amp  *= FBM_GAIN;
    }
    
    return sum * 0.5 + 0.5;   // [0,1]
}

void main() {
    vec2 uv = vUv;
    
    // Calculate aspect ratio and scale UVs
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 scaledUV = uv * vec2(aspectRatio, 1.0) * uPixelSize;

    // Tie fbm noise motion to time
    float scrollTime = uTime * uFbmSpeed;
    
    // Get elevation from FBM noise
    float elevation = fbm2(scaledUV, scrollTime);
    
    // Apply contrast and brightness to elevation
    elevation = elevation * uContrast + uBrightness;
    elevation = clamp(elevation, 0.0, 1.0);
    
    // Create contour lines by multiplying elevation by number of levels
    // and using fract to find where we're close to contour boundaries
    float contourValue = elevation * uContourLevels;
    float contourFract = fract(contourValue);
    
    // Skip drawing lines at the absolute boundaries (outer edges)
    // Only draw internal contour lines, not the min/max boundary lines
    float contourFloor = floor(contourValue);
    bool isMinBoundary = contourFloor < 0.5; // At elevation 0
    bool isMaxBoundary = contourFloor > (uContourLevels - 0.5); // At elevation 1
    
    // Create sharp, thin lines
    // Lines appear where contourFract is close to 0 or 1
    float distToLine = min(contourFract, 1.0 - contourFract);
    // Use a sharper falloff for thinner lines
    float line = 1.0 - smoothstep(0.0, uLineWidth, distToLine);
    
    // Don't draw lines at the outer boundaries
    if (isMinBoundary || isMaxBoundary) {
        line = 0.0;
    }
    
    // Only output color where there are lines, completely transparent elsewhere
    if (line < 0.01) {
        discard; // Don't render pixels that aren't on lines
    }
    
    // Blue contour lines with alpha
    vec3 blueColor = vec3(0.125, 0.565, 0.8) * uBlueIntensity; // #2090cc
    float alpha = line * uAlphaIntensity;
    
    fragColor = vec4(blueColor, alpha);
}
`;

export default function BayerDither() {
  const { size } = useThree();
  const meshRef = useRef();

  // Leva controls for the topography effect
  const {
    pixelSize,
    brightness,
    contrast,
    fbmScale,
    fbmSpeed,
    blueIntensity,
    alphaIntensity,
    contourLevels,
    lineWidth,
  } = useControls("Topography Map", {
    pixelSize: { value: 1.0, min: 0.1, max: 5, step: 0.1 },
    brightness: { value: -0.4, min: -1, max: 1, step: 0.01 },
    contrast: { value: 0.4, min: 0, max: 2, step: 0.01 },
    fbmScale: { value: 5.1, min: 0.1, max: 10, step: 0.1 },
    fbmSpeed: { value: 0.1, min: 0, max: 1, step: 0.01 },
    blueIntensity: { value: 1.0, min: 0, max: 2, step: 0.1 },
    alphaIntensity: { value: 0.09, min: 0, max: 1, step: 0.01 },
    contourLevels: { value: 20.0, min: 5, max: 50, step: 1 },
    lineWidth: { value: 0.09, min: 0.01, max: 0.5, step: 0.01 },
  });

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
        uTime: { value: 0 },
        uPixelSize: { value: pixelSize },
        uBrightness: { value: brightness },
        uContrast: { value: contrast },
        uFbmScale: { value: fbmScale },
        uFbmSpeed: { value: fbmSpeed },
        uBlueIntensity: { value: blueIntensity },
        uAlphaIntensity: { value: alphaIntensity },
        uContourLevels: { value: contourLevels },
        uLineWidth: { value: lineWidth },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      glslVersion: THREE.GLSL3,
    });
  }, [
    size.width,
    size.height,
    pixelSize,
    brightness,
    contrast,
    fbmScale,
    fbmSpeed,
    blueIntensity,
    alphaIntensity,
    contourLevels,
    lineWidth,
  ]);

  // Create plane geometry - size it to match the viewport
  const geometry = useMemo(() => {
    // Calculate the plane size to match the viewport
    const aspectRatio = size.width / size.height;
    const planeHeight = 20; // Base height
    const planeWidth = planeHeight * aspectRatio;
    return new THREE.PlaneGeometry(planeWidth, planeHeight);
  }, [size.width, size.height]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (material) {
      material.uniforms.uTime.value = time;
      material.uniforms.uResolution.value.set(size.width, size.height);

      // Update Leva-controlled uniforms
      material.uniforms.uPixelSize.value = pixelSize;
      material.uniforms.uBrightness.value = brightness;
      material.uniforms.uContrast.value = contrast;
      material.uniforms.uFbmScale.value = fbmScale;
      material.uniforms.uFbmSpeed.value = fbmSpeed;
      material.uniforms.uBlueIntensity.value = blueIntensity;
      material.uniforms.uAlphaIntensity.value = alphaIntensity;
      material.uniforms.uContourLevels.value = contourLevels;
      material.uniforms.uLineWidth.value = lineWidth;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[0, 0, -5]}
      renderOrder={-1}
    />
  );
}
