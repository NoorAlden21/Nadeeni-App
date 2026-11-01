"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ActionButton } from "@/components/cashier/action-button";
import { formatElapsed, formatOrderTime } from "@/lib/cashier/orders";

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

function QuietAction({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex h-11 cursor-pointer items-center justify-center px-2 text-sm font-medium text-ink/45 underline-offset-4 transition duration-300 hover:text-burgundy hover:underline focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function OrderCard({
  order,
  now,
  ready,
  chipClass,
  chipLabel,
  primary,
  secondary,
  onUpdate,
  onShowQr,
  timeZone,
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
      <span
        aria-hidden="true"
        className={`w-1 shrink-0 ${ready ? "bg-gold" : "bg-burgundy"}`}
      />
      <div className="@container min-w-0 flex-1 px-3 py-3.5 sm:px-4 sm:py-4">
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
                      longNumber ? "text-2xl" : "text-3xl @min-[22rem]:text-4xl"
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
                <p className="mt-2.5 min-h-4 text-[0.7rem] font-medium text-ink/35">
                  {formatElapsed(order.created_at, now)}
                </p>
              </>
            )}
          </div>
          <span
            className={`mt-1 shrink-0 rounded-full px-2.5 py-1 font-display text-sm font-semibold ring-1 ${chipClass}`}
          >
            {chipLabel}
          </span>
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/65">
          <span aria-hidden="true" className="size-1 rounded-full bg-gold-deep/70" />
          <span>وقت الإدخال</span>
          <time dir="ltr" dateTime={order.created_at} className="font-medium tabular-nums text-ink/80">
            {now == null ? "\u00a0" : formatOrderTime(order.created_at, timeZone)}
          </time>
        </p>

        <div className="mt-4 flex flex-col gap-2 border-t border-burgundy/8 pt-3.5 @min-[22rem]:flex-row @min-[22rem]:items-center @min-[22rem]:gap-1">
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
                aria-label={`${primary.hint || primary.label} للطلب ${order.order_number}`}
                className="w-full @min-[22rem]:min-w-0 @min-[22rem]:flex-1"
              >
                <span className="font-display text-lg leading-none">{primary.label}</span>
                {primary.hint ? (
                  <span className="hidden items-center gap-2 @min-[16rem]:inline-flex">
                    <span aria-hidden="true" className="h-3.5 w-px bg-ivory/35" />
                    <span className="text-[0.8rem] font-medium text-ivory/85">
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
                    onClick={() => secondary.onAction(order.id)}
                    aria-label={`${secondary.label} للطلب ${order.order_number}`}
                    className="w-full focus-visible:ring-offset-paper @min-[22rem]:min-w-0 @min-[22rem]:flex-1"
                  >
                    <span className="truncate font-sans text-sm font-semibold">
                      {secondary.label}
                    </span>
                  </ActionButton>
                  {onShowQr ? (
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
      </div>
    </div>
  );
}

function LaneEmpty({ tone, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-burgundy/12 bg-ivory/55 px-6 py-9 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-paper text-gold-deep shadow-[0_12px_28px_-18px_rgba(74,4,24,0.55)] ring-1 ring-gold/35">
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
  now,
  orders,
  primary,
  secondary,
  onUpdate,
  onShowQr,
  timeZone,
  showEmpty = true,
}) {
  const reduceMotion = useReducedMotion();
  const headingId = `lane-${tone}`;
  const ready = tone === "ready";
  const chipClass = ready
    ? "bg-gold/20 text-burgundy-deep ring-gold/50"
    : "bg-foam text-burgundy ring-burgundy/10";
  const chipLabel = ready ? "جاهز" : "يُحضَّر";
  const sectionClass = ready
    ? "bg-[#f7f1e4] ring-gold/30"
    : "bg-white/75 ring-burgundy/10";

  return (
    <section
      aria-labelledby={headingId}
      className={`min-w-0 rounded-[1.6rem] p-3 shadow-[0_20px_50px_-28px_rgba(74,4,24,0.22)] ring-1 sm:p-4 lg:p-5 ${sectionClass}`}
    >
      <header className="mb-4 flex items-end justify-between gap-3 border-b border-burgundy/10 pb-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-gold-deep">{kicker}</p>
          <h2
            id={headingId}
            className="font-display text-2xl font-semibold leading-tight text-balance text-burgundy-deep sm:text-[1.65rem]"
          >
            {title}
          </h2>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ivory font-sans text-sm font-semibold tabular-nums text-burgundy-deep ring-1 ring-burgundy/10">
          {orders.length}
        </span>
      </header>

      <ul className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {orders.map((order) => (
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
                className="overflow-hidden rounded-[1.35rem] bg-paper shadow-[0_18px_40px_-26px_rgba(74,4,24,0.45)] ring-1 ring-burgundy/10"
              >
                <OrderCard
                  order={order}
                  now={now}
                  ready={ready}
                  chipClass={chipClass}
                  chipLabel={chipLabel}
                  primary={primary}
                  secondary={secondary}
                  onUpdate={onUpdate}
                  onShowQr={onShowQr}
                  timeZone={timeZone}
                />
              </motion.li>
            ))}
        </AnimatePresence>
      </ul>

      {showEmpty && orders.length === 0 ? <LaneEmpty tone={tone}>{empty}</LaneEmpty> : null}
    </section>
  );
}
