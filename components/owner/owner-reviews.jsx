"use client";

import { formatStamp } from "@/lib/admin/format";
import { formatRating } from "@/lib/owner/stats";

function Score({ label, value }) {
  return (
    <div className="min-w-0 text-center">
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-burgundy-deep">{formatRating(value)}</p>
    </div>
  );
}

export function OwnerReviews({ reviews, timeZone }) {
  const items = Array.isArray(reviews?.items) ? reviews.items : [];

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-paper to-foam/70 p-4 ring-1 ring-burgundy/10 sm:p-6">
      <h2 className="font-display text-xl font-semibold text-burgundy-deep sm:text-2xl">التقييمات</h2>
      <div className="mt-5 grid grid-cols-3 divide-x divide-burgundy/10 rtl:divide-x-reverse">
        <Score label="عدد التقييمات" value={reviews?.reviews ?? 0} />
        <Score label="الخدمة والانتظار" value={reviews?.average_service_rating} />
        <Score label="الطعام" value={reviews?.average_food_rating} />
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-ink/55">لا تقييمات في هذه الفترة.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <li key={`${item.order_number}-${item.created_at}`} className="rounded-2xl bg-ivory/80 px-4 py-3 ring-1 ring-burgundy/10">
              <div className="flex items-baseline justify-between gap-3">
                <p dir="ltr" className="font-sans text-lg font-semibold text-burgundy-deep">
                  {item.order_number}
                </p>
                <p className="text-sm text-ink/45">{formatStamp(item.created_at, timeZone)}</p>
              </div>
              <p className="mt-2 text-sm text-ink/70">الخدمة والانتظار: {item.service_rating} من 5</p>
              <p className="text-sm text-ink/70">الطعام: {item.food_rating} من 5</p>
              {item.message ? <p className="mt-2 text-sm leading-6 text-ink/80">{item.message}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
