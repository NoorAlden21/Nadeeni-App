"use client";

import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useSafeReducedMotion } from "@/components/motion/use-reduced-motion";
import { Clock, ShoppingBag } from "lucide-react";
import { spring } from "@/lib/motion";

const steps = [
  { id: "prep", label: "التحضير" },
  { id: "ready", label: "جاهز" },
  { id: "done", label: "مكتمل" },
];

function ClockIcon({ label }) {
  return <Clock className="relative size-6" strokeWidth={2} aria-label={label} />;
}

function BellIcon({ tick, label }) {
  const reduce = useSafeReducedMotion();
  const controls = useAnimation();

  useEffect(() => {
    if (!tick || reduce) {
      return;
    }
    controls.start({
      rotate: [0, -15, 15, -10, 10, 0],
      transition: { duration: 0.6 },
    });
  }, [tick, reduce, controls]);

  return (
    <motion.span animate={controls} className="relative flex" style={{ transformOrigin: "50% 15%" }}>
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-label={label}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    </motion.span>
  );
}

function BagIcon({ label }) {
  return <ShoppingBag className="relative size-6" strokeWidth={2} aria-label={label} />;
}

function CheckDraw({ label }) {
  const reduce = useSafeReducedMotion();
  return (
    <svg viewBox="0 0 24 24" className="relative h-6 w-6" aria-label={label}>
      <motion.path
        d="M4.5 12.75l6 6 9-13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </svg>
  );
}

function labelClass(state) {
  if (state === "active") return "text-track-deep";
  if (state === "done") return "text-track-deep";
  return "text-track-muted";
}

function StepIcon({ id, label, state, bellTick }) {
  if (state === "done" && id !== "done") {
    return <CheckDraw label={label} />;
  }
  if (id === "prep") return <ClockIcon label={label} />;
  if (id === "ready") return <BellIcon label={label} tick={state === "active" ? bellTick : 0} />;
  return <BagIcon label={label} />;
}

function StatusStep({ id, label, state, bellTick }) {
  const reduce = useSafeReducedMotion();
  const active = state === "active";
  const done = state === "done";
  const idle = !active && !done;

  return (
    <div className="relative z-10 flex w-16 flex-col items-center gap-2">
      <div
        className={`relative flex size-[52px] items-center justify-center rounded-full transition-colors duration-200 ${
          done ? "bg-track-deep text-track-on-deep" : ""
        } ${active ? "text-track-on" : ""} ${
          idle ? "border border-track-line bg-track-soft text-track-muted" : ""
        }`}
      >
        {active ? (
          <motion.span
            layoutId="order-step-highlight"
            className="absolute inset-0 rounded-full bg-track-brand shadow-track-halo"
            transition={spring}
          />
        ) : null}
        {active && !reduce ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-track-brand"
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        ) : null}
        <span className="relative z-10 flex">
          <StepIcon id={id} label={label} state={state} bellTick={bellTick} />
        </span>
      </div>
      <span className={`text-[12px] font-bold whitespace-nowrap ${labelClass(state)}`}>{label}</span>
    </div>
  );
}

export function StatusStepper({ activeStep, bellTick }) {
  const scale = activeStep <= 1 ? 0 : activeStep === 2 ? 0.5 : 1;

  return (
    <div className="mx-auto mb-6 w-full max-w-[20rem]">
      <div className="relative flex items-start justify-between">
        <div className="absolute top-[25px] right-[26px] left-[26px] z-0 h-[3px]">
          <div className="absolute inset-0 bg-track-line" />
          <motion.div
            className="absolute inset-0 origin-right bg-track-brand"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: scale }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>
        {steps.map((step, index) => {
          const number = index + 1;
          const state = number < activeStep ? "done" : number === activeStep ? "active" : "idle";
          return <StatusStep key={step.id} {...step} state={state} bellTick={bellTick} />;
        })}
      </div>
    </div>
  );
}
