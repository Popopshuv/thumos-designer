"use client";

import { useControls } from "leva";
import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { dispatchLevaUpdate } from "./levaUpdater";

// Controller component that's always mounted to register controls
export function ImagePlaneController() {
  const handleFileUpload = useCallback(() => {
    // Create a file input and trigger it
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        // Dispatch image change event
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("imagePlaneImageChange", { detail: url })
          );
        }
      }
    };
    input.click();
  }, []);

  const controls = useControls("Image Plane Settings", {
    imagePositionX: {
      value: 0,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Image X",
    },
    imagePositionY: {
      value: 0,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Image Y",
    },
    imagePositionZ: {
      value: 0,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Image Z",
    },
    imageScale: {
      value: 1,
      min: 0.1,
      max: 50,
      step: 0.1,
      label: "Image Scale",
    },
    imageVisible: { value: true, label: "Show Image" },
  });

  // Listen for programmatic updates from drag handlers
  useEffect(() => {
    const handleLevaUpdate = (e) => {
      if (e.detail.folder === "Image Plane Settings" && e.detail.updates) {
        const levaRoot =
          document.querySelector("[data-leva-root]") ||
          document.querySelector('[class*="leva"]') ||
          document.body;

        if (!levaRoot) return;

        Object.entries(e.detail.updates).forEach(([key, value]) => {
          const allInputs = levaRoot.querySelectorAll('input[type="number"]');
          for (const input of allInputs) {
            const control = input.closest('[class*="control"]');
            const label = control?.querySelector('[class*="label"]');
            if (label) {
              const labelText = label.textContent?.toLowerCase().replace(/\s+/g, "");
              const keyText = key.toLowerCase().replace(/([A-Z])/g, " $1").trim().replace(/\s+/g, "");
              if (labelText.includes(keyText) || labelText === keyText) {
                input.value = value;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                break;
              }
            }
          }
        });
      }
    };

    window.addEventListener("levaControlUpdate", handleLevaUpdate);

    return () => {
      window.removeEventListener("levaControlUpdate", handleLevaUpdate);
    };
  }, []);

  // Store controls in a way that ImagePlaneContent can access
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Send update when controls change
      window.dispatchEvent(
        new CustomEvent("imagePlaneControlsUpdate", { detail: controls })
      );
    }
  }, [controls]);

  // Add upload button to Leva panel
  useEffect(() => {
    const addButton = () => {
      // Find Leva root
      const levaRoot =
        document.querySelector("[data-leva-root]") ||
        document.querySelector('[class*="leva"]') ||
        document.body;

      // Find the Image Plane Settings folder
      const allElements = levaRoot.querySelectorAll("*");
      let settingsFolder = null;

      for (const el of allElements) {
        const text = el.textContent || "";
        if (text.includes("Image Plane Settings") && el.tagName) {
          // Walk up to find the folder container
          let parent = el;
          for (let i = 0; i < 5 && parent; i++) {
            if (
              parent.getAttribute("data-folder") ||
              parent.classList?.toString().includes("folder") ||
              parent.querySelector('[class*="folder"]')
            ) {
              settingsFolder = parent;
              break;
            }
            parent = parent.parentElement;
          }
          if (settingsFolder) break;
        }
      }

      if (!settingsFolder) {
        // Try alternative: look for the first control after "Image Plane Settings" text
        const textNodes = Array.from(levaRoot.querySelectorAll("*")).filter(
          (el) => el.textContent?.trim() === "Image Plane Settings"
        );

        if (textNodes.length > 0) {
          let current = textNodes[0].parentElement;
          for (let i = 0; i < 10 && current; i++) {
            if (current.children.length > 1) {
              settingsFolder = current;
              break;
            }
            current = current.parentElement;
          }
        }
      }

      if (
        settingsFolder &&
        !settingsFolder.querySelector(".leva-upload-button")
      ) {
        const button = document.createElement("button");
        button.className = "leva-upload-button";
        button.textContent = "📷 Upload Image";
        button.style.cssText = `
          width: calc(100% - 16px);
          margin: 8px;
          padding: 6px 8px;
          background: #272727;
          color: #ffffff;
          border: 1px solid #3a3a3a;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          font-family: inherit;
          transition: background 0.2s;
        `;
        button.onmouseenter = () => {
          button.style.background = "#3a3a3a";
        };
        button.onmouseleave = () => {
          button.style.background = "#272727";
        };
        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFileUpload();
        };

        // Insert at the beginning of the folder
        const firstChild = settingsFolder.firstElementChild || settingsFolder;
        if (firstChild) {
          settingsFolder.insertBefore(button, firstChild.nextSibling);
        } else {
          settingsFolder.appendChild(button);
        }
      }
    };

    // Try multiple times with delays to catch Leva rendering
    setTimeout(addButton, 100);
    setTimeout(addButton, 500);
    setTimeout(addButton, 1000);

    // Also try on any DOM changes
    const observer = new MutationObserver(() => {
      addButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [handleFileUpload]);

  return null;
}

function ImagePlaneContent() {
  const { camera, raycaster, gl } = useThree();
  const pointerRef = useRef(new THREE.Vector2());
  const [imageControls, setImageControls] = useState({
    imagePositionX: 0,
    imagePositionY: 0,
    imagePositionZ: 0,
    imageScale: 1,
    imageVisible: true,
  });
  const [imageUrl, setImageUrl] = useState(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [textureLoaded, setTextureLoaded] = useState(false);
  const textureRef = useRef(null);
  const loaderRef = useRef(new THREE.TextureLoader());
  const imageUrlRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const offsetRef = useRef(new THREE.Vector3());
  const meshRef = useRef();

  // Load image and calculate aspect ratio, and load texture
  useEffect(() => {
    const handleImageChange = (e) => {
      const url = e.detail;

      // Clean up previous texture and blob URL
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (imageUrlRef.current && imageUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrlRef.current);
      }

      imageUrlRef.current = url;
      setImageUrl(url);
      setTextureLoaded(false);

      // Create an image to get dimensions and load texture
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        setImageAspectRatio(aspectRatio);

        // Load texture
        loaderRef.current.load(
          url,
          (texture) => {
            texture.flipY = false;
            texture.needsUpdate = true;
            textureRef.current = texture;
            setTextureLoaded(true); // Trigger re-render
          },
          undefined,
          (error) => {
            console.error("Error loading texture:", error);
            setTextureLoaded(false);
          }
        );

        // Dispatch aspect ratio update
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("imagePlaneAspectRatioUpdate", {
              detail: aspectRatio,
            })
          );
        }
      };
      img.src = url;
    };

    const handleControlsUpdate = (e) => {
      setImageControls(e.detail);
    };

    window.addEventListener("imagePlaneImageChange", handleImageChange);
    window.addEventListener("imagePlaneControlsUpdate", handleControlsUpdate);

    return () => {
      window.removeEventListener("imagePlaneImageChange", handleImageChange);
      window.removeEventListener(
        "imagePlaneControlsUpdate",
        handleControlsUpdate
      );
      // Clean up texture and blob URL
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (imageUrlRef.current && imageUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
    };
  }, []);

  // Global pointer move/up handlers for dragging
  useEffect(() => {
    const handleGlobalPointerMove = (event) => {
      if (!isDragging) return;

      const rect = gl.domElement.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerRef.current, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlaneRef.current, intersection);
      intersection.add(offsetRef.current);

      const newX = intersection.x;
      const newY = intersection.y;
      const newZ = imageControls.imagePositionZ;

      setImageControls(prev => ({ ...prev, imagePositionX: newX, imagePositionY: newY }));
      dispatchLevaUpdate("Image Plane Settings", {
        imagePositionX: newX,
        imagePositionY: newY,
      });
    };

    const handleGlobalPointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("pointermove", handleGlobalPointerMove);
      window.addEventListener("pointerup", handleGlobalPointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [isDragging, camera, raycaster, gl, imageControls.imagePositionZ]);

  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();
    setIsDragging(true);

    const rect = gl.domElement.getBoundingClientRect();
    pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const position = [
      imageControls.imagePositionX,
      imageControls.imagePositionY,
      imageControls.imagePositionZ,
    ];

    dragPlaneRef.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(...position)
    );

    raycaster.setFromCamera(pointerRef.current, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlaneRef.current, intersection);

    const currentPos = new THREE.Vector3(...position);
    offsetRef.current.subVectors(currentPos, intersection);

    event.target.setPointerCapture(event.pointerId);
  }, [camera, raycaster, gl, imageControls]);

  // Create plane geometry with correct aspect ratio
  const planeGeometry = useMemo(() => {
    // Base size, will be scaled by aspect ratio
    const baseWidth = 1;
    const width = baseWidth * imageAspectRatio;
    const height = baseWidth;
    return new THREE.PlaneGeometry(width, height);
  }, [imageAspectRatio]);

  if (
    !imageControls.imageVisible ||
    !imageUrl ||
    !textureRef.current ||
    !textureLoaded
  ) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={[
        imageControls.imagePositionX,
        imageControls.imagePositionY,
        imageControls.imagePositionZ,
      ]}
      scale={imageControls.imageScale}
      geometry={planeGeometry}
      renderOrder={10}
      onPointerDown={handlePointerDown}
    >
      <meshStandardMaterial map={textureRef.current} transparent opacity={1} />
    </mesh>
  );
}

export default function ImagePlane() {
  return (
    <Suspense fallback={null}>
      <ImagePlaneContent />
    </Suspense>
  );
}
