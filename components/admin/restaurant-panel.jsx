"use client";

import { useState } from "react";
import { ActionButton } from "@/components/cashier/action-button";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";
import { formatStamp, slugPattern, wholeNumber } from "@/lib/admin/format";
import { restaurantIconSrc } from "@/lib/api/client";
import { contactChanges } from "@/lib/contact";
import { featureSummary } from "@/lib/features";
import { normalizeHex, themeFieldChanges, themeStyle } from "@/lib/theme/restaurant-theme";

const qrLabel = {
  shared: "رمز مشترك",
  per_order: "رمز لكل طلب",
};

function subscriptionLine(restaurant) {
  const subscription = restaurant.subscription;
  if (!subscription) {
    return "بدون اشتراك";
  }

  const end = formatStamp(subscription.ends_at, restaurant.timezone);
  if (subscription.is_current) {
    return `${subscription.plan_name} · ساري حتى ${end}`;
  }

  return `${subscription.plan_name} · منتهٍ ${end}`;
}

const iconTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

function isRestaurantIcon(file) {
  if (file.size > 1024 * 1024) {
    return false;
  }
  if (iconTypes.has(file.type)) {
    return true;
  }
  return file.type === "" && file.name.toLowerCase().endsWith(".svg");
}

function toPayload(body, icon) {
  if (!icon) {
    return body;
  }

  const data = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      // Multipart cannot send JSON null. An empty field clears a contact value.
      data.append(key, "");
      return;
    }
    data.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });
  data.append("icon", icon);
  return data;
}

const blankForm = {
  name: "",
  name_en: "",
  primary_color: "",
  secondary_color: "",
  slug: "",
  preferred_qr_mode: "shared",
  timezone: "Asia/Damascus",
  order_ttl_minutes: "240",
  is_active: true,
  plan_id: "",
  facebook_url: "",
  instagram_url: "",
  phone: "",
};

function ColorField({ id, label, value, onChange }) {
  const parsed = normalizeHex(value);
  return (
    <Field id={id} label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={parsed || "#7e062a"}
          onChange={(event) => onChange(event.target.value)}
          className={`size-12 shrink-0 cursor-pointer rounded-2xl border border-burgundy/15 bg-white p-1 ${parsed ? "" : "opacity-40"}`}
        />
        <TextInput
          id={id}
          dir="ltr"
          value={value}
          maxLength={7}
          spellCheck={false}
          placeholder="#7e062a"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  );
}

function ThemePreview({ primary, secondary }) {
  return (
    <div
      style={themeStyle({ primary_color: primary, secondary_color: secondary })}
      className="grid grid-cols-3 gap-2"
    >
      <span className="flex h-10 items-center justify-center rounded-xl bg-burgundy text-xs font-semibold text-on-primary">
        أساسي
      </span>
      <span className="flex h-10 items-center justify-center rounded-xl bg-gold text-xs font-semibold text-on-secondary">
        ثانوي
      </span>
      <span className="flex h-10 items-center justify-center rounded-xl bg-wash text-xs font-semibold text-ink ring-1 ring-burgundy/10">
        خلفية
      </span>
    </div>
  );
}

export function RestaurantPanel({
  restaurants,
  plans,
  busy,
  selectedId,
  onCreate,
  onUpdate,
  onOpenAccounts,
}) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [icon, setIcon] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");

  const activePlans = plans.filter((plan) => plan.is_active);
  const editing = restaurants.find((item) => item.id === editingId) || null;

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function clearIcon() {
    setIcon(null);
    setFileKey((current) => current + 1);
  }

  function startCreate() {
    setEditingId(null);
    setForm(blankForm);
    clearIcon();
    setError("");
  }

  function startEdit(restaurant) {
    clearIcon();
    setEditingId(restaurant.id);
    setForm({
      name: restaurant.name || "",
      name_en: restaurant.name_en || "",
      primary_color: restaurant.primary_color || "",
      secondary_color: restaurant.secondary_color || "",
      slug: restaurant.slug || "",
      preferred_qr_mode: restaurant.preferred_qr_mode || "shared",
      timezone: restaurant.timezone || "Asia/Damascus",
      order_ttl_minutes: String(restaurant.order_ttl_minutes ?? 240),
      is_active: Boolean(restaurant.is_active),
      plan_id: "",
      facebook_url: restaurant.facebook_url || "",
      instagram_url: restaurant.instagram_url || "",
      phone: restaurant.phone || "",
    });
    setError("");
  }

  function buildBody() {
    const name = form.name.trim();
    const slug = form.slug.trim().toLowerCase();
    const ttl = wholeNumber(form.order_ttl_minutes);
    const timezone = form.timezone.trim();

    if (!name) {
      setError("أدخلوا اسم المطعم.");
      return null;
    }
    if (!slugPattern.test(slug)) {
      setError("المعرّف يقبل أحرفاً إنجليزية وأرقاماً وشرطات فقط.");
      return null;
    }
    if (ttl === null || ttl < 1 || ttl > 65535) {
      setError("مدة بقاء الطلب من 1 إلى 65535 دقيقة.");
      return null;
    }
    if (!timezone) {
      setError("أدخلوا المنطقة الزمنية.");
      return null;
    }

    const next = {
      name,
      slug,
      preferred_qr_mode: form.preferred_qr_mode,
      timezone,
      order_ttl_minutes: ttl,
      is_active: form.is_active,
    };

    const themeFields = themeFieldChanges(editing, form);
    if (themeFields.error) {
      setError(themeFields.error);
      return null;
    }

    if (!editing) {
      const planId = wholeNumber(form.plan_id);
      if (planId === null || !activePlans.some((plan) => Number(plan.id) === planId)) {
        setError("اختاروا خطة اشتراك فعّالة.");
        return null;
      }
      const contact = contactChanges(null, form);
      if (contact.error) {
        setError(contact.error);
        return null;
      }
      return { ...next, plan_id: planId, ...contact.body, ...themeFields.body };
    }

    const currentPlanId = editing.subscription?.plan_id ?? null;
    const body = {};
    if (next.name !== editing.name) body.name = next.name;
    if (next.slug !== editing.slug) body.slug = next.slug;
    if (next.preferred_qr_mode !== editing.preferred_qr_mode) {
      body.preferred_qr_mode = next.preferred_qr_mode;
    }
    if (next.timezone !== editing.timezone) body.timezone = next.timezone;
    if (next.order_ttl_minutes !== editing.order_ttl_minutes) {
      body.order_ttl_minutes = next.order_ttl_minutes;
    }
    if (next.is_active !== editing.is_active) body.is_active = next.is_active;

    if (form.plan_id !== "") {
      const planId = wholeNumber(form.plan_id);
      if (planId === null || !activePlans.some((plan) => Number(plan.id) === planId)) {
        setError("اختاروا خطة اشتراك فعّالة.");
        return null;
      }
      if (planId !== Number(currentPlanId)) {
        body.plan_id = planId;
      }
    }

    const contact = contactChanges(editing, form);
    if (contact.error) {
      setError(contact.error);
      return null;
    }
    Object.assign(body, contact.body, themeFields.body);

    if (Object.keys(body).length === 0 && !icon) {
      setError("لا تغيير للحفظ.");
      return null;
    }

    return body;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const body = buildBody();
    if (!body) {
      return;
    }

    let ok = false;
    if (!editing) {
      ok = await onCreate(toPayload(body, icon), setError);
    } else if (!icon) {
      ok = await onUpdate(editing.id, body, setError);
    } else {
      if (Object.keys(body).length > 0) {
        ok = await onUpdate(editing.id, body, setError);
        if (!ok) return;
      }
      ok = await onUpdate(editing.id, toPayload({}, icon), setError);
    }
    if (ok) {
      clearIcon();
      if (!editing) {
        setForm(blankForm);
      }
    }
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
      <section className="min-w-0 rounded-[1.6rem] bg-white/75 p-4 ring-1 ring-burgundy/10 sm:p-5">
        <h2 className="font-display text-2xl font-semibold text-burgundy-deep">المطاعم</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {restaurants.length === 0 ? (
            <li className="rounded-[1.25rem] border border-dashed border-burgundy/15 bg-ivory/60 px-4 py-8 text-center text-sm text-ink/45">
              لا توجد مطاعم بعد.
            </li>
          ) : (
            restaurants.map((restaurant) => {
              const selected = restaurant.id === selectedId;
              return (
                <li
                  key={restaurant.id}
                  className={`rounded-[1.35rem] bg-paper px-4 py-4 ring-1 ${
                    selected ? "ring-gold" : "ring-burgundy/10"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {restaurant.icon_url ? (
                        <img src={restaurantIconSrc(restaurant.icon_url)} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-burgundy/10" />
                      ) : null}
                      <div className="min-w-0">
                      <p className="font-display text-xl font-semibold text-burgundy-deep">
                        {restaurant.name}
                      </p>
                      {restaurant.name_en ? (
                        <p dir="ltr" className="mt-1 text-end text-sm text-ink/55">
                          {restaurant.name_en}
                        </p>
                      ) : null}
                      {normalizeHex(restaurant.primary_color) || normalizeHex(restaurant.secondary_color) ? (
                        <span className="mt-2 flex items-center gap-1.5">
                          {[restaurant.primary_color, restaurant.secondary_color].map((color, index) => {
                            const hex = normalizeHex(color);
                            if (!hex) return null;
                            return (
                              <span
                                key={`${index}-${hex}`}
                                className="size-4 rounded-full ring-1 ring-burgundy/15"
                                style={{ backgroundColor: hex }}
                              />
                            );
                          })}
                        </span>
                      ) : null}
                      <p dir="ltr" className="mt-1 text-end font-sans text-sm text-ink/55">
                        {restaurant.slug}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-ink/70">{subscriptionLine(restaurant)}</p>
                      {featureSummary(restaurant) ? (
                        <p className="mt-1 text-sm text-ink/55">{featureSummary(restaurant)}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-ink/50">
                        {qrLabel[restaurant.preferred_qr_mode] || restaurant.preferred_qr_mode}
                        {" · "}
                        {restaurant.order_ttl_minutes} د
                      </p>
                      {restaurant.phone ? (
                        <p dir="ltr" className="mt-1 text-end font-sans text-sm text-ink/70">
                          {restaurant.phone}
                        </p>
                      ) : null}
                      {restaurant.facebook_url || restaurant.instagram_url ? (
                        <p className="mt-1 text-sm text-ink/50">
                          {[restaurant.facebook_url ? "فيسبوك" : "", restaurant.instagram_url ? "إنستغرام" : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ${
                        restaurant.is_active
                          ? "bg-foam text-burgundy ring-burgundy/10"
                          : "bg-ivory text-ink/45 ring-burgundy/10"
                      }`}
                    >
                      {restaurant.is_active ? "فعّال" : "متوقف"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ActionButton variant="quiet" onClick={() => onOpenAccounts(restaurant)} disabled={busy}>
                      الموظفون
                    </ActionButton>
                    <ActionButton variant="ghost" onClick={() => startEdit(restaurant)} disabled={busy}>
                      تعديل
                    </ActionButton>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-[1.6rem] bg-white/80 p-4 shadow-[0_20px_50px_-28px_rgba(74,4,24,0.22)] ring-1 ring-burgundy/10 sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-burgundy-deep">
            {editing ? "تعديل المطعم" : "إضافة مطعم"}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={startCreate}
              className="cursor-pointer text-sm font-medium text-ink/50 underline-offset-4 hover:text-burgundy hover:underline"
            >
              جديد
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <Field id="restaurant-name" label="اسم المطعم">
            <TextInput
              id="restaurant-name"
              value={form.name}
              maxLength={255}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          <Field id="restaurant-name-en" label="الاسم بالإنجليزية">
            <TextInput
              id="restaurant-name-en"
              dir="ltr"
              value={form.name_en}
              maxLength={255}
              onChange={(event) => update("name_en", event.target.value)}
            />
          </Field>
          <ColorField
            id="restaurant-primary"
            label="اللون الأساسي"
            value={form.primary_color}
            onChange={(value) => update("primary_color", value)}
          />
          <ColorField
            id="restaurant-secondary"
            label="اللون الثانوي"
            value={form.secondary_color}
            onChange={(value) => update("secondary_color", value)}
          />
          <ThemePreview primary={form.primary_color} secondary={form.secondary_color} />
          <p className="text-sm leading-6 text-ink/55">
            الاسم الإنجليزي والألوان اختيارية. عند التعديل، الحقل الفارغ يمسح القيمة. اللون الفارغ يبقي لون ناديني.
          </p>
          <Field id="restaurant-slug" label="المعرّف">
            <TextInput
              id="restaurant-slug"
              dir="ltr"
              value={form.slug}
              onChange={(event) => update("slug", event.target.value)}
            />
          </Field>
          <Field id="restaurant-plan" label={editing ? "منح خطة" : "خطة الاشتراك"}>
            <SelectInput
              id="restaurant-plan"
              value={form.plan_id}
              onChange={(event) => update("plan_id", event.target.value)}
            >
              <option value="">{editing ? "بدون تغيير" : "اختاروا خطة"}</option>
              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {featureSummary(plan) ? `${plan.name} · ${featureSummary(plan)}` : plan.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          {editing ? (
            <p className="text-sm leading-6 text-ink/55">
              إذا بقي وقت في الاشتراك الحالي، تبدأ الخطة الجديدة بعده.
            </p>
          ) : null}
          <Field id="restaurant-qr" label="طريقة الرمز">
            <SelectInput
              id="restaurant-qr"
              value={form.preferred_qr_mode}
              onChange={(event) => update("preferred_qr_mode", event.target.value)}
            >
              <option value="shared">رمز مشترك</option>
              <option value="per_order">رمز لكل طلب</option>
            </SelectInput>
          </Field>
          <Field id="restaurant-zone" label="المنطقة الزمنية">
            <TextInput
              id="restaurant-zone"
              dir="ltr"
              value={form.timezone}
              onChange={(event) => update("timezone", event.target.value)}
            />
          </Field>
          <Field id="restaurant-ttl" label="مدة بقاء الطلب بالدقائق">
            <TextInput
              id="restaurant-ttl"
              dir="ltr"
              inputMode="numeric"
              value={form.order_ttl_minutes}
              onChange={(event) => update("order_ttl_minutes", event.target.value)}
            />
          </Field>
          <Field id="restaurant-icon" label="شعار المطعم">
            <input
              key={fileKey}
              id="restaurant-icon"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                if (!file) {
                  setIcon(null);
                  return;
                }
                if (!isRestaurantIcon(file)) {
                  setIcon(null);
                  event.target.value = "";
                  setError("الشعار ملف JPEG أو PNG أو WebP أو SVG ولا يتجاوز 1 ميغابايت.");
                  return;
                }
                setIcon(file);
                setError("");
              }}
              className="block w-full cursor-pointer text-sm text-ink file:me-3 file:cursor-pointer file:rounded-2xl file:border-0 file:bg-foam file:px-4 file:py-2 file:font-semibold file:text-burgundy-deep"
            />
            {editing?.icon_url ? (
              <img src={restaurantIconSrc(editing.icon_url)} alt="" className="mt-3 h-16 w-16 rounded-2xl object-cover ring-1 ring-burgundy/10" />
            ) : null}
          </Field>
          <Field id="restaurant-facebook" label="فيسبوك">
            <TextInput
              id="restaurant-facebook"
              dir="ltr"
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              maxLength={255}
              placeholder="https://facebook.com/example"
              value={form.facebook_url}
              onChange={(event) => update("facebook_url", event.target.value)}
            />
          </Field>
          <Field id="restaurant-instagram" label="إنستغرام">
            <TextInput
              id="restaurant-instagram"
              dir="ltr"
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              maxLength={255}
              placeholder="https://instagram.com/example"
              value={form.instagram_url}
              onChange={(event) => update("instagram_url", event.target.value)}
            />
          </Field>
          <Field id="restaurant-phone" label="رقم الجوال">
            <TextInput
              id="restaurant-phone"
              dir="ltr"
              type="text"
              inputMode="tel"
              autoComplete="tel"
              maxLength={32}
              placeholder="+963944123456"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </Field>
          <p className="text-sm leading-6 text-ink/55">
            بيانات التواصل اختيارية. عند التعديل، الحقل الفارغ يمسح القيمة الحالية.
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-burgundy-deep">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => update("is_active", event.target.checked)}
              className="size-4 accent-burgundy"
            />
            المطعم فعّال
          </label>
          <p role="alert" className="min-h-6 text-sm font-medium text-burgundy">
            {error}
          </p>
          <ActionButton type="submit" disabled={busy || (!editing && activePlans.length === 0)} className="w-full">
            {editing ? "حفظ" : "إضافة مطعم"}
          </ActionButton>
          {!editing && activePlans.length === 0 ? (
            <p className="text-sm text-ink/55">أضيفوا خطة فعّالة قبل إنشاء مطعم.</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
