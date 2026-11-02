"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { customerCopy, publicErrorText } from "@/lib/customer/public";

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
  const [service, setService] = useState(0);
  const [food, setFood] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  if (!open || !known) {
    return null;
  }

  if (review) {
    return (
      <section className="mt-6 w-full rounded-[1.75rem] bg-paper p-5 text-center ring-1 ring-burgundy/10">
        <h2 className="font-display text-xl font-semibold text-burgundy-deep">تقييمكم</h2>
        <p className="mt-3 text-sm text-ink/70">الخدمة والانتظار: {review.service_rating} من 5</p>
        <p className="mt-1 text-sm text-ink/70">الطعام: {review.food_rating} من 5</p>
        {review.message ? <p className="mt-3 text-sm leading-6 text-ink/80">{review.message}</p> : null}
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
      onReviewed?.();
    } catch (requestError) {
      if (requestError.status === 409 && requestError.body?.message === "already_reviewed") {
        try {
          const saved = await apiFetch(`/public/orders/${encodeURIComponent(token)}/review`);
          setReview(saved);
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
    <form onSubmit={handleSubmit} className="mt-6 w-full rounded-[1.75rem] bg-paper p-5 text-center ring-1 ring-burgundy/10">
      <h2 className="font-display text-xl font-semibold text-burgundy-deep">تقييم الزيارة</h2>
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
  );
}
