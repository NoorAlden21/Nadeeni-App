"use client";

import { formatStamp } from "@/lib/admin/format";
import { countOf, formatRating } from "@/lib/owner/stats";
import { OwnerSection, StatTile } from "@/components/owner/owner-section";

const previewLimit = 5;

function ScoreStars({ label, value }) {
  const score = Number(value) || 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-ivory/80 px-3 py-2">
      <span className="text-sm font-medium text-ink/60">{label}</span>
      <span className="flex gap-0.5" aria-label={`${label} ${score} من 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            viewBox="0 0 24 24"
            className={`size-4 ${star <= score ? "text-gold" : "text-ink/15"}`}
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

export function OwnerReviews({ reviews, timeZone, from, to }) {
  const items = Array.isArray(reviews?.items) ? reviews.items : [];
  const preview = items.slice(0, previewLimit);
  const total = Math.max(countOf(reviews?.reviews), items.length);
  const hidden = Math.max(0, total - preview.length);

  return (
    <OwnerSection title="التقييمات" from={from} to={to}>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="عدد التقييمات" value={formatRating(reviews?.reviews ?? 0)} accent="burgundy" />
        <StatTile label="الخدمة والانتظار" value={formatRating(reviews?.average_service_rating)} accent="gold" />
        <StatTile label="الطعام" value={formatRating(reviews?.average_food_rating)} accent="deep" />
      </div>
      {preview.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-ivory/80 px-4 py-3 text-sm text-ink/60">لا تقييمات في هذه الفترة.</p>
      ) : (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-burgundy-deep">آخر التقييمات</h3>
            {hidden > 0 ? (
              <p className="text-sm text-ink/45">
                آخر {preview.length} من {total}
              </p>
            ) : null}
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {preview.map((item) => (
              <li
                key={`${item.order_number}-${item.created_at}`}
                className="rounded-2xl bg-white px-4 py-3 ring-1 ring-burgundy/10"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p dir="ltr" className="font-sans text-lg font-semibold text-burgundy-deep">
                    {item.order_number}
                  </p>
                  <p className="text-sm text-ink/45">{formatStamp(item.created_at, timeZone)}</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ScoreStars label="الخدمة والانتظار" value={item.service_rating} />
                  <ScoreStars label="الطعام" value={item.food_rating} />
                </div>
                {item.message ? <p className="mt-3 text-sm leading-6 text-ink/80">{item.message}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </OwnerSection>
  );
}
