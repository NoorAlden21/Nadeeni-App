"use client";

import { useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { staffErrorText } from "@/lib/cashier/orders";

export function CashierLogin({ onSuccess, notice = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      onSuccess(session);
    } catch (requestError) {
      setError(staffErrorText(requestError));
    } finally {
      setBusy(false);
    }
  }

  // الحقل مصمم ليكون LTR لكن الأيقونة على اليمين لتناسب تجربة المستخدم العربية
  const inputClass =
    "block h-14 w-full rounded-xl border border-burgundy/15 bg-white pr-12 pl-4 text-left font-sans text-base text-ink outline-none transition-all duration-200 focus:border-gold focus:ring-[3px] focus:ring-gold/15";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory px-4 py-10">
      <main className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="mb-4 h-14 w-14" />
          <h1 className="font-display text-3xl font-bold text-burgundy-deep">تسجيل الدخول</h1>
          <p className="mt-2 text-sm font-medium text-ink/50">أدخل بيانات حسابك للوصول إلى النظام</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.5rem] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-burgundy/5 sm:p-8"
        >
          <div className="mb-5">
            <label htmlFor="cashier-email" className="mb-2 block text-sm font-bold text-burgundy-deep">
              البريد الإلكتروني
            </label>
            <div className="relative">
              {/* أيقونة البريد الإلكتروني */}
              <svg 
                className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              
              <input
                id="cashier-email"
                name="email"
                type="email"
                autoComplete="username"
                dir="ltr"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder="name@restaurant.com"
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="cashier-password" className="mb-2 block text-sm font-bold text-burgundy-deep">
              كلمة المرور
            </label>
            <div className="relative">
              {/* أيقونة القفل */}
              <svg 
                className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>

              <input
                id="cashier-password"
                name="password"
                type="password"
                autoComplete="current-password"
                dir="ltr"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          </div>

          {notice && (
            <div className="mb-5 rounded-xl bg-gold/10 p-3 text-center text-sm font-semibold text-gold-deep">
              {notice}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <ActionButton type="submit" size="lg" disabled={busy} className="mt-2 h-14 w-full rounded-xl text-lg font-bold">
            تسجيل الدخول
          </ActionButton>
        </form>
      </main>
    </div>
  );
}