"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/motion";

export function PressButton({ disabled, type = "button", children, ...props }) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 3 }}
      transition={spring}
      {...props}
    >
      {children}
    </motion.button>
  );
}
