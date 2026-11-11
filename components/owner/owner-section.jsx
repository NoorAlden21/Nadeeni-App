import { formatDayLabel } from "@/lib/owner/stats";

const accents = {
  burgundy: "bg-burgundy",
  gold: "bg-gold",
  deep: "bg-burgundy-deep",
  cream: "bg-gold-deep",
};

export function PeriodChip({ from, to }) {
  return (
    <p className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-burgundy-deep shadow-sm ring-1 ring-burgundy/10">
      <span className="text-ink/45">من</span>
      <span dir="ltr" className="tabular-nums tracking-wide">
        {formatDayLabel(from)}
      </span>
      <span className="text-gold" aria-hidden="true">
        –
      </span>
      <span className="text-ink/45">إلى</span>
      <span dir="ltr" className="tabular-nums tracking-wide">
        {formatDayLabel(to)}
      </span>
    </p>
  );
}

export function OwnerSection({ title, from, to, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-paper to-foam/70 p-4 ring-1 ring-burgundy/10 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-burgundy-deep sm:text-2xl">{title}</h2>
        {from && to ? <PeriodChip from={from} to={to} /> : null}
      </div>
      {children}
    </section>
  );
}

export function StatTile({ label, value, detail, accent = "burgundy", reserveDetail = false }) {
  const numeric = typeof value === "string" || typeof value === "number";

  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white text-center shadow-[0_16px_36px_-28px_rgba(74,4,24,0.55)] ring-1 ring-burgundy/10">
      <div className={`h-1 ${accents[accent] || accents.burgundy}`} />
      <div className="px-3 py-4">
        <p className="text-xs font-semibold text-ink/50">{label}</p>
        <div className="mt-2 min-h-8 font-display font-semibold text-burgundy-deep">
          {numeric ? <p className="text-3xl leading-none sm:text-4xl">{value}</p> : value}
        </div>
        {detail ? (
          <p className="mt-2 inline-flex rounded-full bg-wash px-2.5 py-0.5 text-xs font-semibold text-gold-deep ring-1 ring-gold/25">
            {detail}
          </p>
        ) : reserveDetail ? (
          <span className="mt-2 block h-5" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
}

export function DurationReadout({ parts }) {
  if (!parts) {
    return <p className="text-lg leading-snug">لم يجهز طلب</p>;
  }

  return (
    <p className="flex flex-wrap items-baseline justify-center gap-x-1.5 text-lg leading-snug sm:text-xl">
      {parts.map((part, index) => (
        <span key={part.unit} className="inline-flex items-baseline gap-1">
          {index > 0 ? <span className="text-sm font-medium text-ink/35">و</span> : null}
          <span className="tabular-nums">{part.value}</span>
          <span className="text-xs font-medium text-ink/50">{part.unit}</span>
        </span>
      ))}
    </p>
  );
}
