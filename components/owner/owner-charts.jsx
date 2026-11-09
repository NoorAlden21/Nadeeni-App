"use client";

import { countOf, formatDayLabel, formatRating, formatShare, readyDurationParts, sharePercent } from "@/lib/owner/stats";
import { DurationReadout, OwnerSection, StatTile } from "@/components/owner/owner-section";

const gold = "var(--restaurant-secondary, #cda649)";
const goldDeep = "var(--restaurant-secondary-deep, #8c6e2c)";
const burgundy = "var(--restaurant-primary, #7e062a)";
const burgundyDeep = "var(--restaurant-primary-deep, #4a0418)";
const foam = "var(--restaurant-foam, #f8e8ed)";

function Swatch({ color, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-ivory/80 px-2.5 py-1 text-xs font-medium text-ink/60 ring-1 ring-burgundy/10">
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
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-36 w-full" role="img" aria-label="أعمدة الزبائن الجدد والعائدين لكل يوم">
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke={burgundyDeep} strokeOpacity="0.12" />
      {series.map((day, index) => {
        const x = width - (index + 1) * slot + (slot - barWidth) / 2;
        const backHeight = (day.back / max) * (height - 6);
        const freshHeight = (day.fresh / max) * (height - 6);
        const base = height - 1;
        return (
          <g key={day.date || index}>
            <title>{`${formatDayLabel(day.date)}: ${day.fresh} جدد، ${day.back} عائدون`}</title>
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
    <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-burgundy/10">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink/60">{label}</p>
        <p className="font-display text-xl font-semibold text-burgundy-deep tabular-nums">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-foam">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ReadyRing({ ready, uncollected, total }) {
  const collected = Math.max(0, ready - uncollected);
  const percent = sharePercent(collected, total);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const collectedShare = total > 0 ? Math.min(1, collected / total) : 0;
  const missedShare = total > 0 ? Math.min(1 - collectedShare, uncollected / total) : 0;
  const collectedLength = collectedShare * circumference;
  const missedLength = missedShare * circumference;
  const open = collectedShare + missedShare < 0.999;

  return (
    <div className="relative mx-auto h-40 w-40 shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={
          uncollected > 0
            ? `${collected} من ${total} استُلمت، و${uncollected} لم تُستلم`
            : `${collected} من ${total} استُلمت`
        }
      >
        <circle cx="60" cy="60" r={radius} fill="none" stroke={foam} strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={burgundy}
          strokeWidth="12"
          strokeDasharray={`${collectedLength} ${circumference - collectedLength}`}
          strokeLinecap={open && collectedLength > 0 ? "round" : "butt"}
        />
        {missedLength > 0 ? (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={goldDeep}
            strokeWidth="12"
            strokeDasharray={`${missedLength} ${circumference - missedLength}`}
            strokeDashoffset={-collectedLength}
            strokeLinecap={open ? "round" : "butt"}
          />
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
        <p className="font-display text-2xl font-semibold leading-none text-burgundy-deep">{formatShare(percent)}</p>
        <p className="mt-1 text-xs text-ink/55">استُلمت</p>
        {uncollected > 0 ? (
          <p className="mt-1 text-[11px] font-semibold leading-4 text-gold-deep">{uncollected} لم تُستلم</p>
        ) : null}
      </div>
    </div>
  );
}

function Note({ children }) {
  return <p className="mt-4 rounded-2xl bg-ivory/80 px-4 py-3 text-sm leading-6 text-ink/60">{children}</p>;
}

export function OwnerCharts({ stats, from, to }) {
  const days = Array.isArray(stats?.days) ? stats.days : [];
  const orders = countOf(stats?.orders);
  const ready = countOf(stats?.ready_orders);
  const cancelled = countOf(stats?.cancelled_orders);
  const uncollected = countOf(stats?.uncollected_orders);
  const fresh = countOf(stats?.new_browsers);
  const returning = countOf(stats?.returning_browsers);
  const browsers = fresh + returning;
  const scale = Math.max(orders, ready, cancelled, uncollected, 1);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <OwnerSection title="الزبائن" from={from} to={to}>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile label="الإجمالي" value={browsers} accent="burgundy" reserveDetail />
          <StatTile label="جدد" value={fresh} detail={formatShare(sharePercent(fresh, browsers))} accent="gold" />
          <StatTile
            label="عائدون"
            value={returning}
            detail={formatShare(sharePercent(returning, browsers))}
            accent="deep"
          />
        </div>
        <div className="mt-5 rounded-[1.25rem] bg-white/90 p-4 ring-1 ring-burgundy/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-burgundy-deep">حركة الزبائن</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Swatch color={gold}>جدد</Swatch>
              <Swatch color={burgundyDeep}>عائدون</Swatch>
            </div>
          </div>
          <BrowserBars days={days} />
          <div className="mt-2 flex items-center justify-between text-xs text-ink/40">
            <span>بداية الفترة</span>
            <span>نهاية الفترة</span>
          </div>
        </div>
        <Note>
          الإجمالي هو الزبائن الجدد والعائدون فقط. طلبات بلا زبون: {countOf(stats?.orders_without_browser)}، وهي خارج النسبة. أرقام الأيام لا تساوي مجموع الفترة.
        </Note>
      </OwnerSection>

      <OwnerSection title="الطلبات" from={from} to={to}>
        <div className="mt-5 grid items-center gap-4 rounded-[1.25rem] bg-white/90 p-4 ring-1 ring-burgundy/10 sm:grid-cols-[1fr_10rem]">
          <div className="flex flex-col gap-3">
            <Meter label="الطلبات" value={orders} max={scale} color={burgundyDeep} />
            <Meter label="صارت جاهزة" value={ready} max={scale} color={gold} />
            <Meter label="أُلغيت" value={cancelled} max={scale} color={burgundy} />
            <Meter label="لم تُستلم" value={uncollected} max={scale} color={goldDeep} />
          </div>
          <ReadyRing ready={ready} uncollected={uncollected} total={orders} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
          <StatTile
            label="متوسط التجهيز"
            value={<DurationReadout parts={readyDurationParts(stats?.average_ready_seconds)} />}
            accent="deep"
          />
          <StatTile
            label="أطول تجهيز"
            value={<DurationReadout parts={readyDurationParts(stats?.longest_ready_seconds)} />}
            accent="burgundy"
          />
          <StatTile label="تقييم الخدمة" value={formatRating(stats?.average_service_rating)} accent="gold" />
          <StatTile label="تقييم الطعام" value={formatRating(stats?.average_food_rating)} accent="cream" />
        </div>
      </OwnerSection>
    </div>
  );
}
