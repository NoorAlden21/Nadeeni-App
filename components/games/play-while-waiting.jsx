"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { twenty48Copy } from "@/lib/games/twenty48";

const Twenty48Game = dynamic(() => import("@/components/games/twenty48-game").then((mod) => mod.Twenty48Game), {
  ssr: false,
  loading: () => <p className="mt-4 text-sm font-medium text-ink/60">{twenty48Copy.loading}</p>,
});

export function PlayWhileWaiting({ orderNumber, onOpenChange, paused = false }) {
  const [open, setOpen] = useState(false);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  function setOpenState(next) {
    setOpen(next);
    onOpenChangeRef.current?.(next);
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      setOpen(false);
      onOpenChangeRef.current?.(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mt-6 w-full">
      <motion.button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        inert={open ? true : undefined}
        onClick={() => setOpenState(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97, y: 3 }}
        transition={spring}
        className="relative inline-flex h-[52px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-track-md border-[1.5px] border-track-strong bg-track-soft text-[15px] font-bold text-track-deep transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(255,194,14,0.45)] touch-manipulation"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 w-1/3 animate-shimmer bg-gradient-to-l from-transparent via-white/80 to-transparent motion-reduce:animate-none"
        />
        <span className="relative">{twenty48Copy.play}</span>
      </motion.button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-30 flex items-center justify-center bg-burgundy-deep/45 px-4 py-4"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) {
                  setOpenState(false);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={twenty48Copy.title}
                onPointerDown={(event) => event.stopPropagation()}
                className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-[2rem] bg-white p-5 text-center shadow-[0_24px_60px_-24px_rgba(74,4,24,0.45)] ring-1 ring-burgundy/10"
              >
                <button
                  type="button"
                  onClick={() => setOpenState(false)}
                  className="sticky top-0 z-10 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-ivory text-base font-semibold text-burgundy-deep ring-1 ring-burgundy/15 touch-manipulation"
                >
                  {twenty48Copy.close}
                </button>
                <Twenty48Game orderNumber={orderNumber} paused={paused} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
