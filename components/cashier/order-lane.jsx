"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock } from "lucide-react";
import { ActionButton } from "@/components/cashier/action-button";
import { formatElapsed, formatOrderTime } from "@/lib/cashier/orders";

const AGING_WARN_MINUTES = 15;
const AGING_DANGER_MINUTES = 60;

function agingLevel(iso, now) {
  if (now == null || !iso) return "normal";
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes >= AGING_DANGER_MINUTES) return "danger";
  if (minutes >= AGING_WARN_MINUTES) return "warn";
  return "normal";
}

function useClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    let timer = 0;
    let kick = 0;

    function refresh() {
      setNow(Date.now());
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") refresh();
        schedule();
      }, 30000);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") refresh();
    }

    kick = window.setTimeout(refresh, 0);
    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(kick);
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return now;
}

function formatFullStamp(iso, timeZone) {
  const zone = timeZone || "Asia/Damascus";
  try {
    return new Intl.DateTimeFormat("ar-SY", {
      timeZone: zone,
      dateStyle: "medium",
      timeStyle: "short",
      numberingSystem: "latn",
      hourCycle: "h23",
    }).format(new Date(iso));
  } catch {
    return formatOrderTime(iso, zone);
  }
}

const RelativeTime = memo(function RelativeTime({ iso, timeZone }) {
  const now = useClock();
  const full = now == null ? "" : formatFullStamp(iso, timeZone);
  return (
    <time dateTime={iso} title={full || undefined} className="text-[13px] font-semibold text-foreground">
      {formatElapsed(iso, now) || "\u00a0"}
    </time>
  );
});

function AgeBar({ createdAt }) {
  const now = useClock();
  const level = agingLevel(createdAt, now);
  const color = level === "danger" ? "bg-aging-danger" : level === "warn" ? "bg-aging-warn" : "bg-primary";
  return <span aria-hidden="true" className={`w-1 shrink-0 self-stretch ${color}`} />;
}

const spring = { type: "spring", stiffness: 460, damping: 36, mass: 0.7 };

function WaitingMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
      <path
        d="M6.2 16.2h11.6l-1.15-2V10.2a4.65 4.65 0 0 0-9.3 0v4l-1.15 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 16.4a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 3.4v1.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReadyMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8.4 12.2 11 14.7 15.7 9.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuietAction({ children, className = "", tone = "link", ...props }) {
  const look =
    tone === "badge"
      ? "min-h-11 rounded-full bg-foam px-3 text-sm font-semibold text-burgundy ring-1 ring-burgundy/15 hover:bg-burgundy/5"
      : "h-11 px-2 text-sm font-medium text-ink/55 underline-offset-4 hover:text-burgundy hover:underline";
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center transition duration-300 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${look} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function OrderCard({
  order,
  ready,
  chipClass,
  chipLabel,
  primary,
  secondary,
  onUpdate,
  onShowQr,
  trailing,
  timeZone,
  pendingId,
  note,
  locked,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(order.order_number);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const longNumber = [...order.order_number].length > 10;
  const canEdit = typeof onUpdate === "function";

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(order.order_number);
    setError("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
  }

  async function saveEdit() {
    const result = await onUpdate(order.id, draft);
    if (!result?.ok) {
      setError(result?.error || "");
      return;
    }
    setEditing(false);
    setError("");
  }

  function handleDraftKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  return (
    <div className="relative z-10 flex items-stretch">
      <div className="@container min-w-0 flex-1 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div>
                <label
                  htmlFor={`edit-${order.id}`}
                  className="mb-1.5 block text-xs font-medium text-ink/40"
                >
                  رقم الفاتورة
                </label>
                <input
                  ref={inputRef}
                  id={`edit-${order.id}`}
                  value={draft}
                  dir="ltr"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={32}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={handleDraftKeyDown}
                  className="h-12 w-full min-w-0 rounded-xl border border-burgundy/15 bg-white px-3 text-end font-sans text-xl font-semibold text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold sm:text-2xl"
                />
                {error ? (
                  <p role="alert" className="mt-1.5 text-xs font-medium leading-5 text-burgundy">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                  <p
                    dir="ltr"
                    translate="no"
                    className={`relative max-w-full font-sans font-semibold leading-none break-all text-burgundy-deep ${
                      longNumber ? "text-xl" : "text-2xl"
                    }`}
                  >
                    {order.order_number}
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1.5 start-0 h-0.5 w-7 rounded-full bg-gold"
                    />
                  </p>
                  <span className="mb-0.5 text-xs font-medium text-ink/40">
                    رقم الفاتورة
                  </span>
                </div>
                <p className="mt-2 min-h-4">
                  <RelativeTime iso={order.created_at} timeZone={timeZone} />
                </p>
              </>
            )}
          </div>
          {ready ? null : (
            <span className={`mt-1 shrink-0 rounded-full px-2.5 py-1 font-display text-sm font-semibold ring-1 ${chipClass}`}>
              {chipLabel}
            </span>
          )}
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/65">
          <Clock className="size-3.5 shrink-0 text-gold-deep" aria-hidden="true" />
          <span>وقت الإدخال</span>
          <time dir="ltr" dateTime={order.created_at} className="font-medium tabular-nums text-foreground">
            {formatOrderTime(order.created_at, timeZone)}
          </time>
        </p>

        <div className="mt-2 flex flex-col gap-2 border-t border-burgundy/8 pt-2 @min-[22rem]:flex-row @min-[22rem]:items-center @min-[22rem]:gap-1">
          {editing ? (
            <>
              <ActionButton
                onClick={saveEdit}
                aria-label={`حفظ تعديل الطلب ${order.order_number}`}
                className="w-full @min-[22rem]:min-w-0 @min-[22rem]:flex-1"
              >
                <span className="font-display text-lg leading-none">حفظ</span>
              </ActionButton>
              <QuietAction onClick={cancelEdit} className="self-center">
                تراجع
              </QuietAction>
            </>
          ) : (
            <>
              <ActionButton
                onClick={() => primary.onAction(order.id)}
                disabled={primary.busyId === order.id}
                aria-label={`${primary.hint || primary.label} للطلب ${order.order_number}`}
                className="w-full @min-[22rem]:min-w-0 @min-[22rem]:flex-1"
              >
                <span className="font-display text-base leading-none">{primary.label}</span>
                {primary.hint ? (
                  <span className="hidden items-center gap-2 @min-[16rem]:inline-flex">
                    <span aria-hidden="true" className="h-3.5 w-px bg-on-primary/35" />
                    <span className="text-[0.8rem] font-medium text-on-primary/85">
                      {primary.hint}
                    </span>
                  </span>
                ) : null}
              </ActionButton>
              {canEdit ? (
                <div className="flex w-full items-center justify-center gap-1 @min-[22rem]:w-auto @min-[22rem]:shrink-0">
                  <QuietAction
                    onClick={startEdit}
                    aria-label={`تعديل للطلب ${order.order_number}`}
                  >
                    تعديل
                  </QuietAction>
                  <span aria-hidden="true" className="text-ink/20">
                    ·
                  </span>
                  <QuietAction
                    onClick={() => secondary.onAction(order.id)}
                    aria-label={`${secondary.label} للطلب ${order.order_number}`}
                  >
                    {secondary.label}
                  </QuietAction>
                  {onShowQr ? (
                    <>
                      <span aria-hidden="true" className="text-ink/20">
                        ·
                      </span>
                      <QuietAction
                        onClick={() => onShowQr(order.id)}
                        aria-label={`عرض رمز الطلب ${order.order_number}`}
                      >
                        الرمز
                      </QuietAction>
                    </>
                  ) : null}
                </div>
              ) : secondary ? (
                <>
                  <ActionButton
                    variant={secondary.variant || "quiet"}
                    disabled={pendingId === order.id || locked}
                    onClick={() => secondary.onAction(order.id)}
                    aria-label={`${secondary.label} للطلب ${order.order_number}`}
                    className="w-full focus-visible:ring-offset-paper @min-[22rem]:min-w-0 @min-[22rem]:flex-1"
                  >
                    <span className="truncate font-sans text-sm font-semibold">
                      {pendingId === order.id && secondary.pendingLabel
                        ? secondary.pendingLabel
                        : secondary.label}
                    </span>
                  </ActionButton>
                  {trailing ? (
                    <QuietAction
                      tone="badge"
                      onClick={() => trailing.onAction(order.id)}
                      aria-label={`${trailing.label} للطلب ${order.order_number}`}
                      className="shrink-0 whitespace-nowrap"
                    >
                      {trailing.label}
                    </QuietAction>
                  ) : onShowQr ? (
                    <QuietAction
                      onClick={() => onShowQr(order.id)}
                      aria-label={`عرض رمز الطلب ${order.order_number}`}
                      className="shrink-0"
                    >
                      الرمز
                    </QuietAction>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
        {note?.id === order.id ? (
          <p
            role={note.tone === "error" ? "alert" : "status"}
            className={`mt-2 text-sm font-medium leading-6 ${
              note.tone === "error" ? "text-burgundy" : "text-gold-deep"
            }`}
          >
            {note.text}
          </p>
        ) : null}
      </div>
      <AgeBar createdAt={order.created_at} />
    </div>
  );
}

function LaneEmpty({ tone, children }) {
  const compact = tone !== "ready";
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-burgundy/12 bg-ivory/55 text-center ${
        compact ? "gap-2 px-4 py-4" : "gap-3 px-6 py-9"
      }`}
    >
      <span
        className={`grid place-items-center rounded-2xl bg-paper text-gold-deep ring-1 ring-gold/35 ${
          compact ? "size-9 [&_svg]:size-4" : "size-14 shadow-[0_12px_28px_-18px_rgba(74,4,24,0.55)]"
        }`}
      >
        {tone === "ready" ? <ReadyMark /> : <WaitingMark />}
      </span>
      <p className="max-w-56 text-sm font-medium leading-6 text-ink/40">{children}</p>
    </div>
  );
}

export function OrderLane({
  title,
  kicker,
  empty,
  tone,
  orders,
  primary,
  secondary,
  onUpdate,
  onShowQr,
  trailing,
  timeZone,
  pendingId,
  note,
  showEmpty = true,
  lockedIds,
}) {
  const reduceMotion = useReducedMotion();
  const [oldestFirst, setOldestFirst] = useState(false);
  const headingId = `lane-${tone}`;
  const ready = tone === "ready";
  const shown = ready && oldestFirst
    ? [...orders].sort((a, b) => {
        if (a.created_at === b.created_at) return 0;
        return a.created_at < b.created_at ? -1 : 1;
      })
    : orders;
  const chipClass = ready
    ? "bg-gold/20 text-burgundy-deep ring-gold/50"
    : "bg-foam text-burgundy ring-burgundy/10";
  const chipLabel = ready ? "جاهز" : "يُحضَّر";
  const sectionClass = ready
    ? "bg-wash ring-gold/30"
    : "bg-white/75 ring-burgundy/10";

  return (
    <section
      aria-labelledby={headingId}
      className={`flex w-full min-w-0 shrink-0 flex-col rounded-[1.6rem] p-3 shadow-[0_20px_50px_-28px_rgba(74,4,24,0.22)] ring-1 md:w-auto md:flex-1 ${sectionClass}`}
    >
      <header className="mb-2 flex shrink-0 items-end justify-between gap-3 border-b border-burgundy/10 pb-2">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-gold-deep">{kicker}</p>
          <h2
            id={headingId}
            className="font-display text-xl font-semibold leading-tight text-balance text-burgundy-deep sm:text-2xl"
          >
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ready ? (
            <button
              type="button"
              onClick={() => setOldestFirst((current) => !current)}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-ivory px-3 text-xs font-semibold text-burgundy-deep ring-1 ring-burgundy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {oldestFirst ? "الأحدث أولاً" : "الأقدم أولاً"}
            </button>
          ) : null}
          <span className="grid size-9 place-items-center rounded-full bg-ivory font-sans text-sm font-semibold tabular-nums text-burgundy-deep ring-1 ring-burgundy/10">
            {orders.length}
          </span>
        </div>
      </header>

      <ul className="flex flex-col content-start gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((order) => (
              <motion.li
                key={order.id}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0, transition: { duration: 0 } }
                    : { opacity: 0, scale: 0.98, y: 10 }
                }
                transition={reduceMotion ? { duration: 0 } : spring}
                className="shrink-0 overflow-hidden rounded-[1.35rem] bg-paper shadow-[0_18px_40px_-26px_rgba(74,4,24,0.45)] ring-1 ring-burgundy/10"
              >
                <OrderCard
                  order={order}
                  ready={ready}
                  chipClass={chipClass}
                  chipLabel={chipLabel}
                  primary={primary}
                  secondary={secondary}
                  onUpdate={onUpdate}
                  onShowQr={onShowQr}
                  trailing={trailing}
                  timeZone={timeZone}
                  pendingId={pendingId}
                  locked={Boolean(lockedIds?.[order.id])}
                  note={note}
                />
              </motion.li>
            ))}
        </AnimatePresence>
      </ul>

      {showEmpty && orders.length === 0 ? <LaneEmpty tone={tone}>{empty}</LaneEmpty> : null}
    </section>
  );
}
