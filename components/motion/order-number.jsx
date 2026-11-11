"use client";

import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@/lib/motion";

export function OrderNumber({ value, status, className }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={`${status}:${value}`}
        dir="ltr"
        className={`inline-block ${className || ""}`}
        initial={{ opacity: 0, y: 8, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={spring}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}
