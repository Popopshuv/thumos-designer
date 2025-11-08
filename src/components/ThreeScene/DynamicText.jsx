"use client";

import { useControls } from "leva";
import { Suspense, useState, useEffect } from "react";
import { Html } from "@react-three/drei";

// Controller component that's always mounted to register controls
export function TextController() {
  const controls = useControls("Text Settings", {
    headerText: { value: "Header Text", label: "Header Text" },
    headerPositionX: {
      value: 0,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Header X",
    },
    headerPositionY: {
      value: 2,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Header Y",
    },
    headerPositionZ: {
      value: 0,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Header Z",
    },
    headerSize: {
      value: 2,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Header Size",
    },
    headerColor: { value: "#000000", label: "Header Color" },
    headerMaxWidth: {
      value: 10,
      min: 0,
      max: 20,
      step: 0.1,
      label: "Header Max Width",
    },
    headerLineHeight: {
      value: 0.9,
      min: 0.5,
      max: 2,
      step: 0.05,
      label: "Header Line Height",
    },
    headerVisible: { value: true, label: "Show Header" },
    descriptionText: {
      value: "Description text goes here",
      label: "Description Text",
    },
    descriptionPositionX: {
      value: 0,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Description X",
    },
    descriptionPositionY: {
      value: -1,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Description Y",
    },
    descriptionPositionZ: {
      value: 0,
      min: -10,
      max: 10,
      step: 0.1,
      label: "Description Z",
    },
    descriptionSize: {
      value: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Description Size",
    },
    descriptionColor: { value: "#000000", label: "Description Color" },
    descriptionMaxWidth: {
      value: 10,
      min: 0,
      max: 20,
      step: 0.1,
      label: "Description Max Width",
    },
    descriptionLineHeight: {
      value: 0.9,
      min: 0.5,
      max: 2,
      step: 0.05,
      label: "Description Line Height",
    },
    descriptionVisible: { value: true, label: "Show Description" },
  });

  // Store controls in a way that TextContent can access
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Send update when controls change
      window.dispatchEvent(
        new CustomEvent("textControlsUpdate", { detail: controls })
      );
    }
  }, [controls]);

  return null;
}

function TextContent() {
  const [textControls, setTextControls] = useState({
    headerText: "Header Text",
    headerPositionX: 0,
    headerPositionY: 2,
    headerPositionZ: 0,
    headerSize: 2,
    headerColor: "#000000",
    headerMaxWidth: 10,
    headerLineHeight: 0.9,
    headerVisible: true,
    descriptionText: "Description text goes here",
    descriptionPositionX: 0,
    descriptionPositionY: -1,
    descriptionPositionZ: 0,
    descriptionSize: 1,
    descriptionColor: "#000000",
    descriptionMaxWidth: 10,
    descriptionLineHeight: 0.9,
    descriptionVisible: true,
  });

  useEffect(() => {
    const handleControlsUpdate = (e) => {
      setTextControls(e.detail);
    };

    window.addEventListener("textControlsUpdate", handleControlsUpdate);

    return () => {
      window.removeEventListener("textControlsUpdate", handleControlsUpdate);
    };
  }, []);

  return (
    <group renderOrder={20}>
      {textControls.headerVisible && (
        <Html
          key="header-text"
          position={[
            textControls.headerPositionX,
            textControls.headerPositionY,
            textControls.headerPositionZ,
          ]}
          transform
          occlude
          scale={textControls.headerSize / 12}
          style={{
            pointerEvents: "none",
          }}
        >
          <h1
            className="dynamic-text-heading"
            style={{
              color: textControls.headerColor,
              maxWidth: `${
                textControls.headerMaxWidth *
                100 *
                (12 / textControls.headerSize)
              }px`,
              lineHeight: textControls.headerLineHeight,
            }}
          >
            {textControls.headerText}
          </h1>
        </Html>
      )}
      {textControls.descriptionVisible && (
        <Html
          key="description-text"
          position={[
            textControls.descriptionPositionX,
            textControls.descriptionPositionY,
            textControls.descriptionPositionZ,
          ]}
          transform
          occlude
          scale={textControls.descriptionSize / 6}
          style={{
            pointerEvents: "none",
          }}
        >
          <p
            className="dynamic-text-description"
            style={{
              color: textControls.descriptionColor,
              maxWidth: `${
                textControls.descriptionMaxWidth *
                100 *
                (6 / textControls.descriptionSize)
              }px`,
              lineHeight: textControls.descriptionLineHeight,
            }}
          >
            {textControls.descriptionText}
          </p>
        </Html>
      )}
    </group>
  );
}

export default function DynamicText() {
  return <TextContent />;
}
