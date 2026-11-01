"use client";

import { useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { staffErrorText } from "@/lib/cashier/orders";

export function AdminLogin({ notice = "", onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const message = error || notice;

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const session = await apiFetch("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      await onSuccess(session);
    } catch (requestError) {
      setError(staffErrorText(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-ivory">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <h1 className="font-display text-3xl font-semibold text-burgundy-deep">
            admin
          </h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-[1.6rem] bg-white/80 p-5 shadow-[0_20px_50px_-28px_rgba(74,4,24,0.28)] ring-1 ring-burgundy/10"
        >
          <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-burgundy-deep">
            البريد الإلكتروني
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            dir="ltr"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mb-4 h-12 w-full rounded-2xl border border-burgundy/15 bg-white px-4 text-end font-sans text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold"
          />
          <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-burgundy-deep">
            كلمة المرور
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full rounded-2xl border border-burgundy/15 bg-white px-4 text-end font-sans text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold"
          />
          <p role="alert" className="mt-3 min-h-6 text-sm font-medium text-burgundy">
            {message}
          </p>
          <ActionButton type="submit" size="lg" disabled={busy} className="w-full">
            دخول
          </ActionButton>
        </form>
      </main>
    </div>
  );
}
