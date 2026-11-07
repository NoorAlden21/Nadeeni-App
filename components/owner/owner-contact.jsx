"use client";

import { useState } from "react";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { contactChanges, contactDraft } from "@/lib/contact";
import { statsErrorText } from "@/lib/owner/stats";

const fieldClass =
  "h-12 w-full rounded-xl border border-burgundy/10 bg-white px-4 text-base text-ink outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/20 shadow-sm";

export function OwnerContact({ token, restaurant, onSaved, onUnauthenticated, onInactive }) {
  const [saved, setSaved] = useState(() => contactDraft(restaurant));
  const [form, setForm] = useState(() => contactDraft(restaurant));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const change = contactChanges(saved, form);
    if (change.error) {
      setError(change.error);
      setNotice("");
      return;
    }
    if (Object.keys(change.body).length === 0) {
      setError("لا تغيير للحفظ.");
      setNotice("");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiFetch("/restaurant/contact", {
        token,
        method: "PATCH",
        body: change.body,
      });
      const next = contactDraft(updated);
      setSaved(next);
      setForm(next);
      onSaved?.(next);
      setNotice("تم حفظ بيانات التواصل.");
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthenticated();
        return;
      }
      if (requestError.status === 403 && requestError.body?.message === "inactive") {
        onInactive();
        return;
      }
      setError(statsErrorText(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-xl flex-col gap-4 rounded-[1.5rem] border border-burgundy/5 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] sm:p-6"
    >
      <div>
        <h2 className="font-display text-xl font-semibold text-burgundy-deep">بيانات التواصل</h2>
        <p className="mt-2 text-sm leading-6 text-ink/55">
          فيسبوك وإنستغرام ورقم الجوال اختيارية. اتركوا الحقل فارغاً لمسح القيمة.
        </p>
      </div>
      <label htmlFor="owner-facebook" className="block">
        <span className="mb-2 block text-sm font-bold text-burgundy-deep">فيسبوك</span>
        <input
          id="owner-facebook"
          dir="ltr"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          maxLength={255}
          placeholder="https://facebook.com/example"
          value={form.facebook_url}
          onChange={(event) => update("facebook_url", event.target.value)}
          className={fieldClass}
        />
      </label>
      <label htmlFor="owner-instagram" className="block">
        <span className="mb-2 block text-sm font-bold text-burgundy-deep">إنستغرام</span>
        <input
          id="owner-instagram"
          dir="ltr"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          maxLength={255}
          placeholder="https://instagram.com/example"
          value={form.instagram_url}
          onChange={(event) => update("instagram_url", event.target.value)}
          className={fieldClass}
        />
      </label>
      <label htmlFor="owner-phone" className="block">
        <span className="mb-2 block text-sm font-bold text-burgundy-deep">رقم الجوال</span>
        <input
          id="owner-phone"
          dir="ltr"
          type="text"
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
          placeholder="+963944123456"
          value={form.phone}
          onChange={(event) => update("phone", event.target.value)}
          className={fieldClass}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-burgundy">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm font-semibold text-burgundy-deep">
          {notice}
        </p>
      ) : null}
      <ActionButton type="submit" disabled={busy} className="h-12 w-full rounded-xl sm:w-40">
        حفظ
      </ActionButton>
    </form>
  );
}
