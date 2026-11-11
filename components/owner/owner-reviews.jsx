"use client";

import { formatStamp } from "@/lib/admin/format";
import { countOf, formatRating } from "@/lib/owner/stats";
import { OwnerSection, StatTile } from "@/components/owner/owner-section";

const previewLimit = 5;

function ScoreStars({ label, value }) {
  const score = Number(value) || 0;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-ivory/80 px-3 py-2.5">
      <span className="text-sm font-medium text-ink/60">{label}</span>
      <span className="flex items-center justify-between gap-2" aria-label={`${label} ${score} من 5`}>
        <span className="font-sans text-lg font-semibold tabular-nums text-burgundy-deep">{score} من 5</span>
        <span className="flex gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              viewBox="0 0 24 24"
              className={`size-6 ${star <= score ? "text-gold" : "text-ink/15"}`}
              fill="currentColor"
            >
              <path d="M12 3.2 14.1 7.9l5.1.6-3.8 3.5.9 5.1L12 14.8 7.7 17.1l.9-5.1-3.8-3.5 5.1-.6L12 3.2z" />
            </svg>
          ))}
        </span>
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
                  <p className="text-sm font-medium text-ink/55">
                    طلب{" "}
                    <span dir="ltr" className="font-sans text-lg font-semibold text-burgundy-deep">
                      {item.order_number}
                    </span>
                  </p>
                  <p className="text-sm text-ink/45">{formatStamp(item.created_at, timeZone)}</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ScoreStars label="تقييم الخدمة والانتظار" value={item.service_rating} />
                  <ScoreStars label="تقييم الطعام" value={item.food_rating} />
                </div>
                {item.message ? (
                  <p className="mt-3 text-sm leading-6 text-ink/80">
                    <span className="font-semibold text-burgundy-deep">ملاحظة الزبون: </span>
                    {item.message}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </OwnerSection>
  );
}
