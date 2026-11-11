"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function useSafeReducedMotion() {
  const preference = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && preference === true;
}
