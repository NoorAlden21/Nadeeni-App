"use client";

export function ScreenSwitch({ value, onChange, options }) {
  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-white p-1 ring-1 ring-burgundy/10 sm:max-w-sm">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
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
