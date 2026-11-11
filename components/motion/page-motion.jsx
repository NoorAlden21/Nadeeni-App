"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";

export function PageMotion({ children }) {
  const [reducedMotion, setReducedMotion] = useState("never");

  useEffect(() => {
    setReducedMotion("user");
  }, []);

  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}
