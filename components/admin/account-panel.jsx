"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/cashier/action-button";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";

const roleLabel = {
  cashier: "كاشير",
  owner: "مالك",
};

function AccountEditor({ account, busy, onSave, onAskDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: account.name || "",
    email: account.email || "",
    password: "",
    restaurant_role: account.restaurant_role || "cashier",
    is_active: Boolean(account.is_active),
  });
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function openEdit() {
    setForm({
      name: account.name || "",
      email: account.email || "",
      password: "",
      restaurant_role: account.restaurant_role || "cashier",
      is_active: Boolean(account.is_active),
    });
    setError("");
    setEditing(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const body = {};

    if (!name) {
      setError("أدخلوا الاسم.");
      return;
    }
    if (!email) {
      setError("أدخلوا البريد.");
      return;
    }
    if (name !== account.name) body.name = name;
    if (email !== account.email) body.email = email;
    if (form.restaurant_role !== account.restaurant_role) {
      body.restaurant_role = form.restaurant_role;
    }
    if (form.is_active !== account.is_active) body.is_active = form.is_active;
    if (form.password) {
      if (form.password.length < 8 || form.password.length > 255) {
        setError("كلمة المرور من 8 إلى 255 حرفاً.");
        return;
      }
      body.password = form.password;
    }
    if (Object.keys(body).length === 0) {
      setError("لا تغيير للحفظ.");
      return;
    }

    const ok = await onSave(account.id, body, setError);
    if (ok) {
      setEditing(false);
      setForm((current) => ({ ...current, password: "" }));
    }
  }

  return (
    <li className="rounded-[1.25rem] bg-ivory/70 px-4 py-3 ring-1 ring-burgundy/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-burgundy-deep">{account.name}</p>
          <p dir="ltr" className="mt-0.5 text-end text-sm text-ink/60">
            {account.email}
          </p>
          <p className="mt-1 text-sm text-ink/55">
            {roleLabel[account.restaurant_role] || account.restaurant_role}
            {" · "}
            {account.is_active ? "فعّال" : "متوقف"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant="quiet"
            onClick={() => (editing ? setEditing(false) : openEdit())}
            disabled={busy}
          >
            تعديل
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => onAskDelete(account)} disabled={busy}>
            حذف
          </ActionButton>
        </div>
      </div>
      {editing ? (
        <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id={`account-name-${account.id}`} label="الاسم">
            <TextInput
              id={`account-name-${account.id}`}
              value={form.name}
              maxLength={255}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          <Field id={`account-email-${account.id}`} label="البريد">
            <TextInput
              id={`account-email-${account.id}`}
              dir="ltr"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </Field>
          <Field id={`account-role-${account.id}`} label="الدور">
            <SelectInput
              id={`account-role-${account.id}`}
              value={form.restaurant_role}
              onChange={(event) => update("restaurant_role", event.target.value)}
            >
              <option value="cashier">كاشير</option>
              <option value="owner">مالك</option>
            </SelectInput>
          </Field>
          <Field id={`account-password-${account.id}`} label="كلمة مرور جديدة">
            <TextInput
              id={`account-password-${account.id}`}
              dir="ltr"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-burgundy-deep sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => update("is_active", event.target.checked)}
              className="size-4 accent-burgundy"
            />
            الحساب فعّال
          </label>
          <p role="alert" className="min-h-6 text-sm font-medium text-burgundy sm:col-span-2">
            {error}
          </p>
          <ActionButton type="submit" disabled={busy} className="sm:col-span-2 sm:w-fit">
            حفظ
          </ActionButton>
        </form>
      ) : null}
    </li>
  );
}

export function AccountPanel({
  restaurant,
  accounts,
  loading,
  error,
  busy,
  onCreate,
  onSave,
  onAskDelete,
  onClose,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setForm({ name: "", email: "", password: "", role: "cashier" });
    setFormError("");
  }, [restaurant.id]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) {
      setFormError("أدخلوا الاسم.");
      return;
    }
    if (!email) {
      setFormError("أدخلوا البريد.");
      return;
    }
    if (form.password.length < 8 || form.password.length > 255) {
      setFormError("كلمة المرور من 8 إلى 255 حرفاً.");
      return;
    }

    const ok = await onCreate(
      restaurant.id,
      form.role,
      { name, email, password: form.password },
      setFormError,
    );
    if (ok) {
      setForm({ name: "", email: "", password: "", role: "cashier" });
    }
  }

  return (
    <section className="rounded-[1.6rem] bg-white/80 p-4 ring-1 ring-burgundy/10 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-burgundy-deep">
          موظفو {restaurant.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-sm font-medium text-ink/50 underline-offset-4 hover:text-burgundy hover:underline"
        >
          إغلاق
        </button>
      </div>

      {loading ? <p className="mt-4 text-sm text-ink/50">يتم تحميل الحسابات.</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-burgundy">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-3">
        {!loading && accounts.length === 0 ? (
          <li className="rounded-[1.25rem] border border-dashed border-burgundy/15 px-4 py-6 text-center text-sm text-ink/45">
            لا يوجد موظفون لهذا المطعم.
          </li>
        ) : (
          accounts.map((account) => (
            <AccountEditor
              key={account.id}
              account={account}
              busy={busy}
              onSave={onSave}
              onAskDelete={onAskDelete}
            />
          ))
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 border-t border-burgundy/10 pt-5 sm:grid-cols-2">
        <h3 className="font-display text-xl font-semibold text-burgundy-deep sm:col-span-2">إضافة موظف</h3>
        <Field id="new-account-name" label="الاسم">
          <TextInput
            id="new-account-name"
            value={form.name}
            maxLength={255}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>
        <Field id="new-account-email" label="البريد">
          <TextInput
            id="new-account-email"
            dir="ltr"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </Field>
        <Field id="new-account-role" label="الدور">
          <SelectInput
            id="new-account-role"
            value={form.role}
            onChange={(event) => update("role", event.target.value)}
          >
            <option value="cashier">كاشير</option>
            <option value="owner">مالك</option>
          </SelectInput>
        </Field>
        <Field id="new-account-password" label="كلمة المرور">
          <TextInput
            id="new-account-password"
            dir="ltr"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </Field>
        <p role="alert" className="min-h-6 text-sm font-medium text-burgundy sm:col-span-2">
          {formError}
        </p>
        <ActionButton type="submit" disabled={busy} className="sm:col-span-2 sm:w-fit">
          إضافة موظف
        </ActionButton>
      </form>
    </section>
  );
}
