"use client";

import { useState } from "react";
import { ActionButton } from "@/components/cashier/action-button";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";
import { wholeNumber } from "@/lib/admin/format";
import { featureSummary, readFeatures } from "@/lib/features";

const intervalLabel = {
  month: "شهر",
  year: "سنة",
  trial: "تجربة",
};

const blankPlan = {
  name: "",
  interval: "month",
  duration_days: "7",
  price: "0",
  currency: "USD",
  pager: true,
  menu: false,
  loyalty: false,
};

export function PlanPanel({ plans, busy, onCreate, onToggle, onChangeFlags, onDelete }) {
  const [form, setForm] = useState(blankPlan);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const price = wholeNumber(form.price);
    const currency = form.currency.trim().toUpperCase();

    if (!name) {
      setError("أدخلوا اسم الخطة.");
      return;
    }
    if (price === null || price > 100000000) {
      setError("السعر رقم صحيح من 0 إلى 100000000.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      setError("العملة ثلاثة أحرف.");
      return;
    }

    const body = {
      name,
      interval: form.interval,
      price,
      currency,
      pager: form.pager,
      menu: form.menu,
      loyalty: form.pager && form.loyalty,
    };

    if (form.interval === "trial") {
      const days = wholeNumber(form.duration_days);
      if (days === null || days < 1 || days > 90) {
        setError("مدة التجربة من 1 إلى 90 يوماً.");
        return;
      }
      body.duration_days = days;
    }

    const ok = await onCreate(body, setError);
    if (ok) {
      setForm(blankPlan);
    }
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
      <section className="min-w-0 rounded-[1.6rem] bg-white/75 p-4 ring-1 ring-burgundy/10 sm:p-5">
        <h2 className="font-display text-2xl font-semibold text-burgundy-deep">خطط الاشتراك</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {plans.length === 0 ? (
            <li className="rounded-[1.25rem] border border-dashed border-burgundy/15 bg-ivory/60 px-4 py-8 text-center text-sm text-ink/45">
              لا توجد خطط بعد.
            </li>
          ) : (
            plans.map((plan) => (
              <li
                key={plan.id}
                className="rounded-[1.35rem] bg-paper px-4 py-4 ring-1 ring-burgundy/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-xl font-semibold text-burgundy-deep">{plan.name}</p>
                    <p className="mt-1 text-sm text-ink/60">
                      {intervalLabel[plan.interval] || plan.interval}
                      {plan.interval === "trial" && plan.duration_days
                        ? ` · ${plan.duration_days} يوماً`
                        : ""}
                    </p>
                    <p dir="ltr" className="mt-1 text-end font-sans text-sm font-semibold text-ink">
                      {plan.price} {plan.currency}
                    </p>
                    {featureSummary(plan) ? (
                      <p className="mt-1 text-sm text-ink/60">{featureSummary(plan)}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ${
                      plan.is_active
                        ? "bg-foam text-burgundy ring-burgundy/10"
                        : "bg-ivory text-ink/45 ring-burgundy/10"
                    }`}
                  >
                    {plan.is_active ? "فعّالة" : "متوقفة"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ActionButton
                    variant="quiet"
                    onClick={() => {
                      const features = readFeatures(plan);
                      onChangeFlags(plan, features.pager ? { pager: false, loyalty: false } : { pager: true });
                    }}
                    disabled={busy}
                  >
                    {readFeatures(plan).pager ? "إيقاف المناداة" : "تشغيل المناداة"}
                  </ActionButton>
                  <ActionButton
                    variant="quiet"
                    onClick={() =>
                      onChangeFlags(
                        plan,
                        readFeatures(plan).menu ? { menu: false, ordering: false } : { menu: true },
                      )
                    }
                    disabled={busy}
                  >
                    {readFeatures(plan).menu ? "إيقاف القائمة" : "تشغيل القائمة"}
                  </ActionButton>
                  <ActionButton
                    variant="quiet"
                    onClick={() => {
                      const features = readFeatures(plan);
                      if (!features.loyalty && !features.pager) {
                        return;
                      }
                      onChangeFlags(plan, { loyalty: !features.loyalty });
                    }}
                    disabled={busy || (!readFeatures(plan).loyalty && !readFeatures(plan).pager)}
                  >
                    {readFeatures(plan).loyalty ? "إيقاف الولاء" : "تشغيل الولاء"}
                  </ActionButton>
                  <ActionButton
                    variant="quiet"
                    onClick={() => onToggle(plan)}
                    disabled={busy}
                  >
                    {plan.is_active ? "تعطيل" : "تفعيل"}
                  </ActionButton>
                  <ActionButton variant="ghost" onClick={() => onDelete(plan)} disabled={busy}>
                    حذف
                  </ActionButton>
                </div>
              </li>
            ))
          )}
          </ul>
        <p className="mt-4 text-sm leading-6 text-ink/55">
          تغيير المناداة أو القائمة أو الولاء يعدّل كل مطعم على هذه الخطة. الولاء يحتاج المناداة.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-[1.6rem] bg-white/80 p-4 shadow-[0_20px_50px_-28px_rgba(74,4,24,0.22)] ring-1 ring-burgundy/10 sm:p-5"
      >
        <h2 className="mb-4 font-display text-2xl font-semibold text-burgundy-deep">إضافة خطة</h2>
        <div className="flex flex-col gap-3">
          <Field id="plan-name" label="اسم الخطة">
            <TextInput
              id="plan-name"
              value={form.name}
              maxLength={255}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          <Field id="plan-interval" label="المدة">
            <SelectInput
              id="plan-interval"
              value={form.interval}
              onChange={(event) => update("interval", event.target.value)}
            >
              <option value="month">شهر</option>
              <option value="year">سنة</option>
              <option value="trial">تجربة</option>
            </SelectInput>
          </Field>
          {form.interval === "trial" ? (
            <Field id="plan-days" label="أيام التجربة">
              <TextInput
                id="plan-days"
                dir="ltr"
                inputMode="numeric"
                value={form.duration_days}
                onChange={(event) => update("duration_days", event.target.value)}
              />
            </Field>
          ) : null}
          <Field id="plan-price" label="السعر">
            <TextInput
              id="plan-price"
              dir="ltr"
              inputMode="numeric"
              value={form.price}
              onChange={(event) => update("price", event.target.value)}
            />
          </Field>
          <p className="-mt-1 text-sm text-ink/50">للعرض فقط.</p>
          <Field id="plan-currency" label="العملة">
            <TextInput
              id="plan-currency"
              dir="ltr"
              maxLength={3}
              value={form.currency}
              onChange={(event) => update("currency", event.target.value)}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-burgundy-deep">
            <input
              type="checkbox"
              checked={form.pager}
              onChange={(event) => {
                const checked = event.target.checked;
                setForm((current) => ({
                  ...current,
                  pager: checked,
                  loyalty: checked ? current.loyalty : false,
                }));
                setError("");
              }}
              className="size-4 accent-burgundy"
            />
            المناداة
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-burgundy-deep">
            <input
              type="checkbox"
              checked={form.menu}
              onChange={(event) => update("menu", event.target.checked)}
              className="size-4 accent-burgundy"
            />
            القائمة
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-burgundy-deep">
            <input
              type="checkbox"
              checked={form.pager && form.loyalty}
              disabled={!form.pager}
              onChange={(event) => update("loyalty", event.target.checked)}
              className="size-4 accent-burgundy disabled:opacity-40"
            />
            الولاء
          </label>
          <p role="alert" className="min-h-6 text-sm font-medium text-burgundy">
            {error}
          </p>
          <ActionButton type="submit" disabled={busy} className="w-full">
            إضافة خطة
          </ActionButton>
        </div>
      </form>
    </div>
  );
}
