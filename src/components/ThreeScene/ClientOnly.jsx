"use client";

import { useEffect, useState } from "react";
import ThreeScene from "./index";

export default function ClientOnlyThreeScene() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <ThreeScene />
    </div>
  );
}
