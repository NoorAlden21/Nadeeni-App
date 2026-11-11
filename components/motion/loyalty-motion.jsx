"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useSafeReducedMotion } from "@/components/motion/use-reduced-motion";
import { Check, Gift } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { spring } from "@/lib/motion";

const stampStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const slamPose = { scale: [2, 0.9, 1], opacity: [0, 1, 1], rotate: [-30, -8, -6] };
const slamTransition = { duration: 0.45, times: [0, 0.65, 1] };

function Stamp({ filled, slam, gift }) {
  const reduce = useSafeReducedMotion();
  const tilt = filled ? -6 : 0;
  const hit = slam && !reduce;

  return (
    <motion.li
      className="relative size-12"
      variants={
        hit || reduce
          ? undefined
          : {
              hidden: { opacity: 0, scale: 0, rotate: filled ? -30 : 0 },
              show: { opacity: 1, scale: 1, rotate: tilt, transition: spring },
            }
      }
      initial={hit ? { scale: 2, opacity: 0, rotate: -30 } : undefined}
      animate={hit ? slamPose : undefined}
      transition={hit ? slamTransition : undefined}
    >
      {hit ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-track-brand animate-ring-ripple motion-reduce:animate-none"
        />
      ) : null}
      <span
        className={`relative flex size-12 items-center justify-center overflow-hidden rounded-full ${gift ? "animate-float motion-reduce:animate-none" : ""} ${
          filled
            ? gift
              ? "bg-track-brand text-track-on ring-2 ring-track-deep"
              : "bg-track-brand text-track-on"
            : gift
              ? "border border-dashed border-track-strong bg-track-soft text-track-deep"
              : "border border-dashed border-track-strong bg-track-soft text-track-muted"
        }`}
      >
        {gift && filled ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -start-1/2 w-1/2 animate-shimmer bg-gradient-to-l from-transparent via-white/75 to-transparent motion-reduce:animate-none"
          />
        ) : null}
        {gift ? (
          <Gift className="relative size-5" strokeWidth={2} aria-hidden="true" />
        ) : filled ? (
          <Check className="relative size-5" strokeWidth={2} aria-hidden="true" />
        ) : null}
      </span>
    </motion.li>
  );
}

export function StampRow({ slots, slamIndex }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const last = slots.length - 1;

  return (
    <motion.ul
      ref={ref}
      className="mt-6 flex flex-wrap justify-center gap-2.5"
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={stampStagger}
    >
      {slots.map((filled, index) => (
        <Stamp key={index} filled={filled} slam={index === slamIndex} gift={index === last} />
      ))}
    </motion.ul>
  );
}

export function LoyaltyMeter({ percent, filled, goal, label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useSafeReducedMotion();
  const shown = reduce || inView;

  return (
    <div ref={ref} className="mt-4">
      <div className="flex items-baseline justify-between gap-4 text-[13px] font-medium text-track-muted">
        <p>
          <bdi className="font-sans text-[15px] font-bold tabular-nums text-track-ink">
            {filled} / {goal}
          </bdi>{" "}
          أختام
        </p>
        <p>
          <bdi className="font-sans font-bold tabular-nums text-track-ink">
            <AnimatedNumber value={shown ? percent : 0} />%
          </bdi>
        </p>
      </div>
      <div
        className="mt-2 h-[10px] overflow-hidden rounded-full bg-track-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={filled}
        aria-label={label}
      >
        <motion.div
          className="h-full w-full origin-right rounded-full bg-track-brand"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: shown ? percent / 100 : 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
