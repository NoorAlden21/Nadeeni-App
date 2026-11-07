"use client";

import { ClipboardList, UtensilsCrossed } from "lucide-react";

const sideIcons = {
  orders: ClipboardList,
  menu: UtensilsCrossed,
};

export function SideNav({ value, onChange, options }) {
  if (!options || options.length < 2) {
    return null;
  }

  return (
    <nav aria-label="أقسام اللوحة" className="flex flex-col gap-1">
      {options.map((option) => {
        const selected = option.id === value;
        const Icon = sideIcons[option.id];
        return (
          <button
            key={option.id}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border-s-[3px] px-3 text-base font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              selected
                ? "border-s-gold bg-foam text-burgundy"
                : "border-s-transparent text-ink/60 hover:bg-foam hover:text-burgundy"
            }`}
          >
            {Icon ? <Icon className="size-5 shrink-0" aria-hidden="true" /> : null}
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}

export function ScreenSwitch({ value, onChange, options }) {
  if (!options || options.length < 2) {
    return null;
  }

  const wide = options.length > 2;

  return (
    <div
      className={`grid w-full gap-1 rounded-2xl bg-white p-1 ring-1 ring-burgundy/10 ${
        wide ? "grid-cols-3 sm:max-w-xl" : "grid-cols-2 sm:max-w-sm"
      }`}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              wide ? "px-1 text-xs sm:px-3 sm:text-sm" : "px-3 text-sm"
            } ${
              selected
                ? "bg-burgundy text-ivory shadow-[inset_0_-2px_0_#cda649]"
                : "text-ink/55 hover:bg-foam hover:text-burgundy"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
