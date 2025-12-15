"use client";

import { Canvas } from "@react-three/fiber";
import { Leva, useControls } from "leva";
import { Suspense, useState, useEffect } from "react";
import BayerDither from "./BayerDither";
import Pouch, { PouchController, InstancedPouches } from "./Pouch";
import { Environment } from "@react-three/drei";
import DynamicText, { TextController } from "./DynamicText";
import { CanvasExporter } from "./CanvasExporter";
import ImagePlane, { ImagePlaneController } from "./ImagePlane";

function CanvasAspectRatioController() {
  const controls = useControls("Canvas Settings", {
    canvasAspectRatio: {
      value: "16:9",
      options: ["16:9", "3:4"],
      onChange: (value) => {
        // This will be handled by the parent component
        // We'll use a custom store to communicate
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("aspectRatioChange", { detail: value })
          );
        }
      },
    },
    canvasBackgroundColor: {
      value: "#fbfaf6",
      label: "Background Color",
      onChange: (value) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("canvasBackgroundColorChange", { detail: value })
          );
        }
      },
    },
  });

  // Dispatch initial color on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("canvasBackgroundColorChange", {
          detail: "#fbfaf6",
        })
      );
    }
  }, []);

  return null;
}

function EnvironmentController() {
  const controls = useControls("Environment Settings", {
    environmentIntensity: {
      value: 1.4,
      min: 0,
      max: 5,
      step: 0.1,
      label: "Intensity",
    },
    environmentRotationX: {
      value: -Math.PI / 4,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      label: "Rotation X",
    },
    environmentRotationY: {
      value: -Math.PI / 2,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      label: "Rotation Y",
    },
    environmentRotationZ: {
      value: 0,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      label: "Rotation Z",
    },
  });

  // Store controls in a way that Environment can access
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("environmentControlsUpdate", { detail: controls })
      );
    }
  }, [controls]);

  return null;
}

function EnvironmentWithControls() {
  const [envControls, setEnvControls] = useState({
    environmentIntensity: 0.4,
    environmentRotationX: -Math.PI / 4,
    environmentRotationY: -Math.PI / 2,
    environmentRotationZ: 0,
  });

  useEffect(() => {
    const handleControlsUpdate = (e) => {
      setEnvControls(e.detail);
    };

    window.addEventListener("environmentControlsUpdate", handleControlsUpdate);

    return () => {
      window.removeEventListener(
        "environmentControlsUpdate",
        handleControlsUpdate
      );
    };
  }, []);

  return (
    <Environment
      files="/3d/studio.hdr"
      background={false}
      environmentIntensity={envControls.environmentIntensity}
      environmentRotation={[
        envControls.environmentRotationX,
        envControls.environmentRotationY,
        envControls.environmentRotationZ,
      ]}
    />
  );
}

function LevaCollapseController() {
  useEffect(() => {
    const collapseAllFolders = () => {
      // Find Leva root - try multiple selectors
      const levaRoot =
        document.querySelector("[data-leva-root]") ||
        document.querySelector('[class*="leva"]') ||
        document.querySelector('div[class*="leva"]') ||
        document.body;

      if (!levaRoot) return;

      // Find all elements that might be folder headers/titles
      // Leva folders typically have a clickable header
      const allElements = levaRoot.querySelectorAll("*");
      const processedFolders = new Set();

      allElements.forEach((el) => {
        // Look for folder structure - Leva uses specific patterns
        // Check if this element looks like a folder header (has text and is clickable)
        const text = el.textContent?.trim() || "";
        const isFolderHeader =
          text &&
          (text === "Canvas Settings" ||
            text === "Text Settings" ||
            text === "Image Plane Settings" ||
            text === "Pouch Settings" ||
            text === "Pouch Animation" ||
            text === "Pouch Instancing" ||
            text === "Environment Settings" ||
            text === "Topography Map" ||
            text.includes("Settings") ||
            text.includes("Animation") ||
            text.includes("Instancing"));

        if (isFolderHeader && !processedFolders.has(el)) {
          processedFolders.add(el);

          // Find the parent folder container
          let folder = el;
          for (let i = 0; i < 5 && folder; i++) {
            // Look for the folder container (usually has children with controls)
            const siblings = Array.from(folder.parentElement?.children || []);
            if (siblings.length > 1) {
              // This might be the folder
              const content =
                folder.nextElementSibling ||
                folder.parentElement?.querySelector('[class*="content"]');
              if (content) {
                const style = window.getComputedStyle(content);
                // If content is visible, collapse it
                if (style.display !== "none" && style.height !== "0px") {
                  // Click the header to collapse
                  if (el.click) {
                    el.click();
                  } else if (el.parentElement?.click) {
                    el.parentElement.click();
                  }
                }
              }
              break;
            }
            folder = folder.parentElement;
          }
        }
      });

      // Alternative: Find all SVGs/icons that indicate expanded state and click their parents
      const expandIcons = levaRoot.querySelectorAll(
        'svg, [class*="chevron"], [class*="arrow"]'
      );
      expandIcons.forEach((icon) => {
        // If icon is visible (folder is expanded), click to collapse
        const style = window.getComputedStyle(icon);
        if (style.display !== "none") {
          const clickable = icon.closest(
            'button, [role="button"], [class*="header"]'
          );
          if (clickable && clickable.click) {
            // Only click if we haven't processed this folder yet
            const folderText =
              clickable.textContent ||
              clickable.parentElement?.textContent ||
              "";
            if (folderText && !processedFolders.has(clickable)) {
              processedFolders.add(clickable);
              clickable.click();
            }
          }
        }
      });
    };

    // Try multiple times with delays to catch Leva rendering
    const timeouts = [
      setTimeout(collapseAllFolders, 200),
      setTimeout(collapseAllFolders, 600),
      setTimeout(collapseAllFolders, 1200),
    ];

    // Also observe DOM changes to catch when folders are added
    const observer = new MutationObserver((mutations) => {
      // Only act on significant changes (new folders added)
      const hasNewFolders = mutations.some((m) =>
        Array.from(m.addedNodes).some(
          (node) =>
            node.nodeType === 1 &&
            (node.textContent?.includes("Settings") ||
              node.querySelector?.('[class*="folder"]'))
        )
      );
      if (hasNewFolders) {
        setTimeout(collapseAllFolders, 50);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      timeouts.forEach(clearTimeout);
      observer.disconnect();
    };
  }, []);

  return null;
}

function ThreeSceneContent() {
  const [useInstancing, setUseInstancing] = useState(false);

  useEffect(() => {
    const handleInstancingUpdate = (e) => {
      setUseInstancing(e.detail.useInstancing);
    };

    window.addEventListener("pouchInstancingUpdate", handleInstancingUpdate);

    return () => {
      window.removeEventListener(
        "pouchInstancingUpdate",
        handleInstancingUpdate
      );
    };
  }, []);

  return (
    <>
      <LevaCollapseController />
      <CanvasAspectRatioController />
      <TextController />
      <ImagePlaneController />
      <PouchController />
      <EnvironmentController />
      <EnvironmentWithControls />
      <BayerDither />
      <CanvasExporter />
      <Suspense fallback={null}>
        {useInstancing ? <InstancedPouches /> : <Pouch />}
      </Suspense>
      <DynamicText />
      <ImagePlane />
    </>
  );
}

function ThreeScene() {
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [isRecording, setIsRecording] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#fbfaf6");

  useEffect(() => {
    const handleAspectRatioChange = (e) => {
      setAspectRatio(e.detail);
    };

    const handleResize = () => {
      const container = window.innerWidth;
      const containerHeight = window.innerHeight;

      let width, height;
      if (aspectRatio === "16:9") {
        const targetRatio = 16 / 9;
        if (container / containerHeight > targetRatio) {
          height = containerHeight;
          width = height * targetRatio;
        } else {
          width = container;
          height = width / targetRatio;
        }
      } else {
        // 3:4 (portrait)
        const targetRatio = 3 / 4;
        if (container / containerHeight > targetRatio) {
          height = containerHeight;
          width = height * targetRatio;
        } else {
          width = container;
          height = width / targetRatio;
        }
      }

      setDimensions({ width, height });
    };

    const handleRecordingStateChange = (e) => {
      setIsRecording(e.detail.isRecording);
    };

    const handleBackgroundColorChange = (e) => {
      setBackgroundColor(e.detail);
    };

    window.addEventListener("aspectRatioChange", handleAspectRatioChange);
    window.addEventListener("resize", handleResize);
    window.addEventListener("recordingStateChange", handleRecordingStateChange);
    window.addEventListener(
      "canvasBackgroundColorChange",
      handleBackgroundColorChange
    );
    handleResize(); // Initial calculation

    return () => {
      window.removeEventListener("aspectRatioChange", handleAspectRatioChange);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "recordingStateChange",
        handleRecordingStateChange
      );
      window.removeEventListener(
        "canvasBackgroundColorChange",
        handleBackgroundColorChange
      );
    };
  }, [aspectRatio]);

  const handleExportImage = () => {
    window.dispatchEvent(new CustomEvent("exportCanvasImage"));
  };

  const handleExportVideo = () => {
    window.dispatchEvent(new CustomEvent("exportCanvasVideo"));
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        <Canvas
          className="w-full h-full"
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          style={{ background: backgroundColor }}
        >
          <color attach="background" args={[backgroundColor]} />
          <ThreeSceneContent />
        </Canvas>
      </div>
      {/* Export buttons */}
      <div className="absolute top-4 right-4 flex gap-2 z-10 items-center">
        <button
          onClick={handleExportImage}
          disabled={isRecording}
          className="px-4 py-2 bg-white text-black rounded-md shadow-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📷 Image
        </button>
        <button
          onClick={handleExportVideo}
          className={`px-4 py-2 rounded-md shadow-lg transition-colors font-medium ${
            isRecording
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-white text-black hover:bg-gray-100"
          }`}
        >
          {isRecording ? "⏹️ Stop Recording" : "🎥 Start Recording"}
        </button>
      </div>
    </div>
  );
}

export default ThreeScene;
