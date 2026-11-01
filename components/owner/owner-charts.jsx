"use client";

import { countOf, formatDayLabel, formatRating, formatReadyDuration, formatShare, sharePercent } from "@/lib/owner/stats";

const gold = "#cda649";
const burgundy = "#7e062a";
const burgundyDeep = "#4a0418";
const foam = "#f8e8ed";

function Card({ title, from, to, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-paper to-foam/70 p-4 ring-1 ring-burgundy/10 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-burgundy-deep sm:text-2xl">{title}</h2>
        <p className="shrink-0 text-sm text-ink/45">
          من <span dir="ltr">{formatDayLabel(from)}</span> إلى <span dir="ltr">{formatDayLabel(to)}</span>
        </p>
      </div>
      {children}
    </section>
  );
}

function Figure({ label, value, detail, compact = false }) {
  return (
    <div className="min-w-0 px-2 py-1 text-center first:ps-0 last:pe-0">
      <p className="text-sm text-ink/55">{label}</p>
      <p
        className={`mt-1 font-display font-semibold text-burgundy-deep ${compact ? "text-xl leading-snug sm:text-2xl" : "text-3xl sm:text-4xl"}`}
      >
        {value}
      </p>
      {detail ? <p className="mt-1 text-sm font-medium text-gold-deep">{detail}</p> : null}
    </div>
  );
}

function Swatch({ color, children }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink/60">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

function BrowserBars({ days }) {
  const series = days.map((day) => ({
    date: day.date,
    fresh: countOf(day.new_browsers),
    back: countOf(day.returning_browsers),
  }));
  const max = Math.max(1, ...series.map((day) => day.fresh + day.back));
  const width = 320;
  const height = 112;
  const slot = width / Math.max(series.length, 1);
  const barWidth = Math.max(series.length > 45 ? 1 : 2, slot * 0.62);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-36 w-full" role="img" aria-label="أعمدة المتصفحات الجديدة والعائدة لكل يوم">
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke={burgundyDeep} strokeOpacity="0.12" />
      {series.map((day, index) => {
        const x = width - (index + 1) * slot + (slot - barWidth) / 2;
        const backHeight = (day.back / max) * (height - 6);
        const freshHeight = (day.fresh / max) * (height - 6);
        const base = height - 1;
        return (
          <g key={day.date || index}>
            <title>{`${formatDayLabel(day.date)}: ${day.fresh} جديدة، ${day.back} عائدة`}</title>
            <rect x={x} y={base - backHeight} width={barWidth} height={backHeight} rx="1.5" fill={burgundyDeep} />
            <rect
              x={x}
              y={base - backHeight - freshHeight}
              width={barWidth}
              height={freshHeight}
              rx="1.5"
              fill={gold}
            />
          </g>
        );
      })}
    </svg>
  );
}

function Meter({ label, value, max, color }) {
  const width = max > 0 ? Math.min(100, (countOf(value) / max) * 100) : 0;

  return (
    <div className="grid grid-cols-[3.25rem_1fr] items-center gap-3">
      <p className="text-end font-display text-xl font-semibold text-burgundy-deep">{value}</p>
      <div className="min-w-0">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/80">
          <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
        </div>
        <p className="mt-1 text-sm text-ink/55">{label}</p>
      </div>
    </div>
  );
}

function ReadyRing({ ready, total }) {
  const percent = sharePercent(ready, total);
  const shown = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (shown / 100) * circumference;

  return (
    <div className="relative mx-auto h-40 w-40 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`نسبة الطلبات التي صارت جاهزة ${formatShare(percent)}`}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke={foam} strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={burgundy}
          strokeWidth="12"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap={shown > 0 && shown < 100 ? "round" : "butt"}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-2xl font-semibold text-burgundy-deep">{formatShare(percent)}</p>
        <p className="text-xs text-ink/55">صارت جاهزة</p>
      </div>
    </div>
  );
}

export function OwnerCharts({ stats, from, to }) {
  const days = Array.isArray(stats?.days) ? stats.days : [];
  const orders = countOf(stats?.orders);
  const ready = countOf(stats?.ready_orders);
  const cancelled = countOf(stats?.cancelled_orders);
  const fresh = countOf(stats?.new_browsers);
  const returning = countOf(stats?.returning_browsers);
  const browsers = fresh + returning;
  const scale = Math.max(orders, ready, cancelled, 1);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="المتصفحات" from={from} to={to}>
        <div className="mt-5 grid grid-cols-3 divide-x divide-burgundy/10 rtl:divide-x-reverse">
          <Figure label="الإجمالي" value={browsers} />
          <Figure label="جديدة" value={fresh} detail={formatShare(sharePercent(fresh, browsers))} />
          <Figure label="عائدة" value={returning} detail={formatShare(sharePercent(returning, browsers))} />
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-burgundy-deep">حركة المتصفحات</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Swatch color={gold}>جديدة</Swatch>
            <Swatch color={burgundyDeep}>عائدة</Swatch>
          </div>
        </div>
        <BrowserBars days={days} />
        <div className="mt-2 flex items-center justify-between text-xs text-ink/40">
          <span>بداية الفترة</span>
          <span>نهاية الفترة</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/55">
          الإجمالي هو المتصفحات الجديدة والعائدة فقط. طلبات بلا متصفح: {countOf(stats?.orders_without_browser)}، وهي خارج النسبة. أرقام الأيام لا تساوي مجموع الفترة.
        </p>
      </Card>

      <Card title="الطلبات" from={from} to={to}>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Figure label="الطلبات" value={orders} />
          <Figure label="صارت جاهزة" value={ready} detail={orders > 0 ? `${ready}/${orders}` : "—"} />
          <Figure label="متوسط التجهيز" value={formatReadyDuration(stats?.average_ready_seconds)} compact />
          <Figure label="أطول تجهيز" value={formatReadyDuration(stats?.longest_ready_seconds)} compact />
          <Figure label="تقييم الخدمة" value={formatRating(stats?.average_service_rating)} compact />
          <Figure label="تقييم الطعام" value={formatRating(stats?.average_food_rating)} compact />
        </div>
        <div className="mt-6 grid items-center gap-6 sm:grid-cols-[1fr_10rem]">
          <div className="flex flex-col gap-4">
            <Meter label="الطلبات" value={orders} max={scale} color={burgundyDeep} />
            <Meter label="صارت جاهزة" value={ready} max={scale} color={gold} />
            <Meter label="أُلغيت" value={cancelled} max={scale} color={burgundy} />
          </div>
          <ReadyRing ready={ready} total={orders} />
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/55">
          الحلقة نسبة الطلبات التي صار لها وقت تجهيز. الإلغاء يُحسب وحده، وقد يبقى الطلب ضمن الجاهزة إذا جُهّز ثم أُلغي.
        </p>
      </Card>
    </div>
  );
}
