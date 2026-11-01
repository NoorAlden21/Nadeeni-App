"use client";

const variants = {
  primary:
    "bg-burgundy text-ivory shadow-[inset_0_1px_0_rgba(253,250,241,0.16),inset_0_-2px_0_#cda649] hover:bg-burgundy-deep",
  quiet:
    "bg-[#f7f1e4] text-gold-deep ring-1 ring-inset ring-gold/30 hover:bg-gold/25",
  ghost:
    "bg-transparent font-medium text-ink/40 underline-offset-4 hover:text-burgundy hover:underline",
};

const sizes = {
  md: "h-11 px-4 text-sm",
  lg: "h-16 px-6 text-lg",
};

export function ActionButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`relative z-10 inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl font-semibold whitespace-nowrap transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
