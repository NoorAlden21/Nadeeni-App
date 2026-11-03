"use client";

import { useEffect, useRef } from "react";
import { twenty48Copy, twenty48MotionMs } from "@/lib/games/twenty48";
import { useTwenty48 } from "@/components/games/use-twenty48";

const tileClass = {
  2: "bg-[#eee4da] text-[#776e65]",
  4: "bg-[#ede0c8] text-[#776e65]",
  8: "bg-[#f2b179] text-[#f9f6f2]",
  16: "bg-[#f59563] text-[#f9f6f2]",
  32: "bg-[#f67c5f] text-[#f9f6f2]",
  64: "bg-[#f65e3b] text-[#f9f6f2]",
  128: "bg-[#edcf72] text-[#f9f6f2]",
  256: "bg-[#edcc61] text-[#f9f6f2]",
  512: "bg-[#edc850] text-[#f9f6f2]",
  1024: "bg-[#edc53f] text-[#f9f6f2]",
  2048: "bg-[#edc22e] text-[#f9f6f2]",
};

const arrows = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

const motionCss = `
.twenty48-tile { transition: transform ${twenty48MotionMs}ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.twenty48-appear { animation: twenty48-appear ${twenty48MotionMs}ms ease-out; }
.twenty48-pop { animation: twenty48-pop ${twenty48MotionMs}ms ease-in-out; }
@keyframes twenty48-appear { from { transform: scale(0); } to { transform: scale(1); } }
@keyframes twenty48-pop {
  0% { transform: scale(1); }
  45% { transform: scale(1.16); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .twenty48-tile { transition: none; }
  .twenty48-appear, .twenty48-pop { animation: none; }
}
`;

function tileText(value) {
  const digits = String(value).length;
  if (digits <= 2) return "text-2xl";
  if (digits === 3) return "text-xl";
  return "text-base";
}

function tileStyle(tile) {
  return {
    width: "calc((100% - 1.5rem) / 4)",
    height: "calc((100% - 1.5rem) / 4)",
    transform: `translate(calc(${tile.col} * (100% + 0.5rem)), calc(${tile.row} * (100% + 0.5rem)))`,
  };
}

function ScoreBox({ label, value }) {
  return (
    <div className="min-w-16 rounded-md bg-[#bbada0] px-3 py-1.5 text-center">
      <p className="text-[0.65rem] font-bold tracking-wide text-[#eee4da]">{label}</p>
      <p className="font-sans text-lg font-bold leading-none text-white">{value}</p>
    </div>
  );
}

export function Twenty48Game({ orderNumber, paused = false }) {
  const { tiles, score, best, won, over, keepPlaying, curtain, move, restart, keepGoing } = useTwenty48({ paused });
  const moveRef = useRef(move);
  const pointer = useRef(null);
  const endSwipe = useRef(null);
  const showWin = Boolean(curtain && won && !keepPlaying);
  const showOver = Boolean(curtain && over && !showWin);

  useEffect(() => {
    moveRef.current = move;
  }, [move]);

  useEffect(() => {
    function finish(event) {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      const start = pointer.current;
      if (!start || start.id !== event.pointerId) {
        return;
      }
      pointer.current = null;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        return;
      }
      moveRef.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    }

    function onKeyDown(event) {
      const direction = arrows[event.key];
      const tag = event.target?.tagName;
      if (!direction || tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) {
        return;
      }
      event.preventDefault();
      moveRef.current(direction);
    }

    endSwipe.current = finish;
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, []);

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    if (!endSwipe.current) {
      return;
    }
    if (event.target instanceof Element && event.target.closest("button")) {
      return;
    }
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    window.removeEventListener("pointerup", endSwipe.current);
    window.removeEventListener("pointercancel", endSwipe.current);
    window.addEventListener("pointerup", endSwipe.current);
    window.addEventListener("pointercancel", endSwipe.current);
  }

  const live = showOver || showWin ? `${showOver ? twenty48Copy.over : twenty48Copy.win}. ${twenty48Copy.score} ${score}` : `${twenty48Copy.score} ${score}`;

  return (
    <section className="mt-4 w-full" aria-labelledby="twenty48-title">
      <style>{motionCss}</style>
      <div className="flex items-start justify-between gap-3">
        <h2 id="twenty48-title" dir="ltr" className="font-sans text-5xl font-black leading-none text-[#776e65]">
          {twenty48Copy.title}
        </h2>
        <button
          type="button"
          onClick={restart}
          className="h-10 rounded-md bg-[#8f7a66] px-3 text-sm font-bold text-white touch-manipulation"
        >
          {twenty48Copy.newGame}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-right text-xs font-medium leading-5 text-[#776e65]">{twenty48Copy.hint}</p>
        <div className="flex shrink-0 gap-2">
          <ScoreBox label={twenty48Copy.score} value={score} />
          <ScoreBox label={twenty48Copy.best} value={best} />
        </div>
      </div>

      <p className="mt-3 text-sm font-bold text-ink/50">
        {twenty48Copy.orderLabel}{" "}
        <span dir="ltr" className="font-sans text-base text-burgundy-deep">
          {orderNumber}
        </span>
      </p>

      <div
        dir="ltr"
        role="grid"
        aria-label={twenty48Copy.title}
        className="relative mt-3 aspect-square w-full touch-none select-none rounded-md bg-[#bbada0] p-2"
        onPointerDown={onPointerDown}
      >
        <div className="absolute inset-2 grid grid-cols-[repeat(4,minmax(0,1fr))] grid-rows-[repeat(4,minmax(0,1fr))] gap-2">
          {Array.from({ length: 16 }, (_, index) => (
            <div key={index} className="min-h-0 min-w-0 rounded-md bg-white/35" />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-2">
          {tiles.map((tile) => (
            <div key={tile.id} className="twenty48-tile absolute top-0 left-0" style={tileStyle(tile)}>
              <div
                role="gridcell"
                aria-hidden={tile.absorbed ? true : undefined}
                aria-label={String(tile.value)}
                className={`flex h-full w-full items-center justify-center rounded-md font-sans font-bold leading-none ${
                  tileClass[tile.value] || "bg-[#3c3a32] text-[#f9f6f2]"
                } ${tileText(tile.value)} ${tile.fresh ? "twenty48-appear" : ""} ${tile.pop ? "twenty48-pop" : ""}`}
              >
                {tile.value}
              </div>
            </div>
          ))}
        </div>

        {showWin || showOver ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md bg-[#faf8ef]/85 px-4 text-center">
            <p className="font-display text-3xl font-bold text-[#776e65]">
              {showOver ? twenty48Copy.over : twenty48Copy.win}
            </p>
            <div>
              <p className="text-xs font-bold text-[#776e65]">{twenty48Copy.score}</p>
              <p dir="ltr" className="font-sans text-5xl font-black leading-none text-[#776e65]">
                {score}
              </p>
            </div>
            {showWin ? (
              <button
                type="button"
                onClick={keepGoing}
                className="h-11 rounded-md bg-[#8f7a66] px-5 text-sm font-bold text-white touch-manipulation"
              >
                {twenty48Copy.keep}
              </button>
            ) : null}
            <button
              type="button"
              onClick={restart}
              className="h-11 rounded-md bg-[#8f7a66] px-5 text-sm font-bold text-white touch-manipulation"
            >
              {twenty48Copy.again}
            </button>
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </section>
  );
}
