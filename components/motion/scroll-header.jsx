"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { OptimizedImage } from "@/components/media/optimized-image";

export function ScrollHeader({ scrollerRef, iconUrl, name }) {
  const { scrollY } = useScroll({ container: scrollerRef });
  const shade = useTransform(scrollY, [0, 8], [0, 1]);

  return (
    <div className="sticky top-3 z-20 mb-6">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative flex items-center gap-3 rounded-full border border-track-line bg-track-surface px-4 py-2"
    >
      <motion.div
        aria-hidden="true"
        style={{ opacity: shade }}
        className="pointer-events-none absolute inset-0 rounded-full bg-track-surface shadow-track"
      />
      {iconUrl ? (
        <OptimizedImage src={iconUrl} alt="" width={44} height={44} sizes="44px" className="relative size-11 rounded-full object-cover" />
      ) : null}
      <p className="relative text-[15px] font-bold text-track-ink">{name}</p>
    </motion.div>
    </div>
  );
}
