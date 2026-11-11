"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { useSafeReducedMotion } from "@/components/motion/use-reduced-motion";

export function AnimatedNumber({ value, className }) {
  const reduce = useSafeReducedMotion();
  const target = Number.isFinite(value) ? value : 0;
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsubscribe = motionValue.on("change", (next) => {
      setDisplay(Math.round(next));
    });

    if (reduce) {
      motionValue.set(target);
      return unsubscribe;
    }

    const controls = animate(motionValue, target, { duration: 0.8, ease: "easeOut" });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [target, reduce, motionValue]);

  return (
    <span dir="ltr" className={className}>
      {display}
    </span>
  );
}
