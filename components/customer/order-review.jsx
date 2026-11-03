"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api/client";
import { customerCopy, publicErrorText } from "@/lib/customer/public";

function ScoreStars({ label, value, light }) {
  const score = Number(value) || 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm font-semibold ${light ? "text-white/85" : "text-burgundy-deep"}`}>{label}</span>
      <span className="flex gap-0.5" aria-label={`${label} ${score} من 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            viewBox="0 0 24 24"
            className={`size-4 ${star <= score ? "text-gold" : light ? "text-white/25" : "text-ink/20"}`}
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M12 3.2 14.1 7.9l5.1.6-3.8 3.5.9 5.1L12 14.8 7.7 17.1l.9-5.1-3.8-3.5 5.1-.6L12 3.2z" />
          </svg>
        ))}
      </span>
    </div>
  );
}

function Stars({ label, value, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-burgundy-deep">{label}</legend>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value >= score;
          return (
            <button
              key={score}
              type="button"
              aria-label={`${label} ${score}`}
              aria-pressed={value === score}
              onClick={() => onChange(score)}
              className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl text-xl ${
                selected ? "bg-gold/25 text-gold-deep" : "bg-ivory text-ink/25"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function OrderReview({ token, status, onReviewed }) {
  const open = status === "ready" || status === "collected";
  const [review, setReview] = useState(null);
  const [known, setKnown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [service, setService] = useState(0);
  const [food, setFood] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let stopped = false;
    apiFetch(`/public/orders/${encodeURIComponent(token)}/review`)
      .then((saved) => {
        if (!stopped) {
          setReview(saved);
          onReviewed?.();
        }
      })
      .catch((requestError) => {
        if (stopped || requestError.status === 404) {
          return;
        }
        if (!stopped) {
          setError(publicErrorText(requestError));
        }
      })
      .finally(() => {
        if (!stopped) {
          setKnown(true);
        }
      });

    return () => {
      stopped = true;
    };
  }, [token, open]);

  useEffect(() => {
    if (!modalOpen) {
      return undefined;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKey(event) {
      if (event.key !== "Escape" || busyRef.current) {
        return;
      }
      event.preventDefault();
      setModalOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  if (!open || !known) {
    return null;
  }

  if (review) {
    const onReady = status === "ready";
    return (
      <section
        className={`mt-4 w-full rounded-[1.75rem] px-4 py-3 text-center backdrop-blur-md ${
          onReady
            ? "border border-gold/30 bg-gold/15"
            : "bg-paper ring-1 ring-burgundy/10"
        }`}
      >
        <h2 className={`font-display text-lg font-semibold ${onReady ? "text-white" : "text-burgundy-deep"}`}>
          تقييمكم
        </h2>
        <div className="mt-2 flex flex-col gap-1.5">
          <ScoreStars label="الخدمة والانتظار" value={review.service_rating} light={onReady} />
          <ScoreStars label="الطعام" value={review.food_rating} light={onReady} />
        </div>
        {review.message ? (
          <p className={`mt-2 text-sm leading-6 ${onReady ? "text-white/80" : "text-ink/75"}`}>{review.message}</p>
        ) : null}
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) {
      return;
    }
    if (service < 1 || food < 1) {
      setError(customerCopy.reviewInvalid);
      return;
    }

    setBusy(true);
    setError("");
    const note = message.trim();
    try {
      const saved = await apiFetch(`/public/orders/${encodeURIComponent(token)}/review`, {
        method: "POST",
        body: {
          service_rating: service,
          food_rating: food,
          ...(note ? { message: note } : {}),
        },
      });
      setReview(saved);
      setModalOpen(false);
      onReviewed?.();
    } catch (requestError) {
      if (requestError.status === 409 && requestError.body?.message === "already_reviewed") {
        try {
          const saved = await apiFetch(`/public/orders/${encodeURIComponent(token)}/review`);
          setReview(saved);
          setModalOpen(false);
          onReviewed?.();
          return;
        } catch {
          setError(customerCopy.alreadyReviewed);
          return;
        }
      }
      setError(publicErrorText(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        onClick={() => setModalOpen(true)}
        className="mt-6 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gold text-base font-semibold text-burgundy-deep shadow-[0_14px_30px_-16px_rgba(74,4,24,0.65)] transition duration-300 hover:bg-[#d7b45a] touch-manipulation"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
          <path d="M12 3.2 14.1 7.9l5.1.6-3.8 3.5.9 5.1L12 14.8 7.7 17.1l.9-5.1-3.8-3.5 5.1-.6L12 3.2z" />
        </svg>
        تقييم الزيارة
      </button>
      {modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-burgundy-deep/45 px-4 py-4"
              onPointerDown={(event) => {
                if (!busy && event.target === event.currentTarget) {
                  setModalOpen(false);
                }
              }}
            >
              <form
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-title"
                onSubmit={handleSubmit}
                onPointerDown={(event) => event.stopPropagation()}
                className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-[1.75rem] bg-paper p-5 text-center shadow-[0_24px_60px_-24px_rgba(74,4,24,0.55)] ring-1 ring-burgundy/10 outline-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 id="review-title" className="font-display text-xl font-semibold text-burgundy-deep">
                    تقييم الزيارة
                  </h2>
                  <button
                    type="button"
                    aria-label="إغلاق"
                    onClick={() => setModalOpen(false)}
                    className="inline-flex size-10 cursor-pointer items-center justify-center rounded-2xl text-ink/50 hover:bg-ivory hover:text-burgundy"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  <Stars label="الخدمة والانتظار" value={service} onChange={setService} />
                  <Stars label="الطعام" value={food} onChange={setFood} />
                </div>
                <label htmlFor="review-note" className="mt-4 block text-start text-sm font-semibold text-burgundy-deep">
                  ملاحظة
                </label>
                <textarea
                  id="review-note"
                  value={message}
                  maxLength={500}
                  rows={3}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-2 w-full rounded-2xl bg-ivory px-4 py-3 text-base text-ink outline-none ring-1 ring-burgundy/15 focus:ring-2 focus:ring-gold"
                />
                {error ? (
                  <p role="alert" className="mt-3 text-sm font-medium text-burgundy">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-burgundy font-semibold text-ivory disabled:opacity-40"
                >
                  {busy ? "يتم الإرسال" : "إرسال التقييم"}
                </button>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
