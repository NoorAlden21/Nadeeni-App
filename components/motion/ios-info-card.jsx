"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { PressButton } from "@/components/motion/press-button";
import { customerCopy } from "@/lib/customer/public";

export function IosInfoCard({ text }) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReady(true);
      setOpen(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full rounded-track-md border border-track-line bg-track-soft p-4 text-right"
        >
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-track-deep" strokeWidth={2} aria-hidden="true" />
            <p className="text-[13px] font-medium leading-6 text-track-text">{text}</p>
          </div>
          <PressButton
            onClick={() => setOpen(false)}
            className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-track-md border-[1.5px] border-track-strong bg-track-surface text-sm font-bold text-track-deep transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(255,194,14,0.45)]"
          >
            {customerCopy.gotIt}
          </PressButton>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
