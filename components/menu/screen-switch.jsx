"use client";

import { ClipboardList, Gift, Phone, Star, Users, UtensilsCrossed } from "lucide-react";

const sideIcons = {
  orders: ClipboardList,
  customers: Users,
  menu: UtensilsCrossed,
  reviews: Star,
  contact: Phone,
  loyalty: Gift,
};

export function SideNav({ value, onChange, options }) {
  if (!options || options.length < 2) {
    return null;
  }

  const groups = [];
  for (const option of options) {
    const label = option.group || "";
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, items: [option] });
    } else {
      last.items.push(option);
    }
  }

  return (
    <nav aria-label="أقسام اللوحة" className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.label || "nav"} className="flex flex-col gap-1">
          {group.label ? (
            <p className="px-3 pt-1 text-xs font-semibold text-muted-foreground">{group.label}</p>
          ) : null}
          {group.items.map((option) => {
            const selected = option.id === value;
            const Icon = sideIcons[option.id];
            return (
              <button
                key={option.id}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => onChange(option.id)}
                className={`inline-flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border-s-2 px-3 text-base font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected
                    ? "border-s-primary bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-foreground"
                    : "border-s-transparent bg-transparent text-muted-foreground [@media(hover:hover)]:hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)] [@media(hover:hover)]:hover:text-foreground"
                }`}
              >
                {Icon ? <Icon className="size-5 shrink-0" aria-hidden="true" /> : null}
                {option.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function ScreenSwitch({ value, onChange, options }) {
  if (!options || options.length < 2) {
    return null;
  }

  const columns =
    options.length >= 4
      ? "grid-cols-2 sm:grid-cols-4 sm:max-w-3xl"
      : options.length === 3
        ? "grid-cols-3 sm:max-w-xl"
        : "grid-cols-2 sm:max-w-sm";

  return (
    <div className={`grid w-full gap-1 rounded-2xl bg-white p-1 ring-1 ring-burgundy/10 ${columns}`}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              options.length > 2 ? "px-1 text-xs sm:px-3 sm:text-sm" : "px-3 text-sm"
            } ${
              selected
                ? "bg-burgundy text-on-primary shadow-[inset_0_-2px_0_var(--restaurant-secondary)]"
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
