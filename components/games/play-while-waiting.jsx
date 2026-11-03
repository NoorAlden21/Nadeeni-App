"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    <div className="mt-8 w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        inert={open ? true : undefined}
        onClick={() => setOpenState(true)}
        className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-ivory text-base font-semibold text-burgundy-deep ring-1 ring-burgundy/15 touch-manipulation"
      >
        {twenty48Copy.play}
      </button>
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
