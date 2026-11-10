"use client";

import { useState } from "react";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { staffErrorText } from "@/lib/cashier/orders";
import { isFeatureUnavailable } from "@/lib/features";
import { loyaltyCopy, normalizeRedeemCode, readRedemption } from "@/lib/loyalty";

export function LoyaltyRedeem({ token, onUnauthenticated, onInactive, onFeatureUnavailable }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [reward, setReward] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) {
      return;
    }

    const normalized = normalizeRedeemCode(code);
    if (!normalized) {
      setReward(null);
      setError(loyaltyCopy.emptyCode);
      return;
    }

    setBusy(true);
    setError("");
    setReward(null);
    try {
      const payload = await apiFetch("/loyalty/redeem", {
        token,
        method: "POST",
        body: { code: normalized },
      });
      setReward(readRedemption(payload));
      setCode("");
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthenticated();
        return;
      }
      if (requestError.status === 403 && requestError.body?.message === "inactive") {
        onInactive();
        return;
      }
      if (isFeatureUnavailable(requestError)) {
        onFeatureUnavailable();
        return;
      }
      setError(staffErrorText(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] bg-white p-4 shadow-[0_16px_40px_-28px_rgba(74,4,24,0.35)] ring-1 ring-burgundy/10 sm:p-5"
    >
      <h2 className="font-display text-xl font-semibold text-burgundy-deep">{loyaltyCopy.redeemTitle}</h2>
      <p className="mt-1 text-sm text-ink/55">{loyaltyCopy.redeemHint}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="loyalty-code" className="sr-only">
          {loyaltyCopy.codeLabel}
        </label>
        <input
          id="loyalty-code"
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/[^\d]/g, "").slice(0, 6));
            setError("");
          }}
          className="h-12 w-full rounded-2xl border border-burgundy/15 bg-white px-4 text-center font-sans text-2xl font-semibold tracking-[0.3em] text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold sm:max-w-56"
        />
        <ActionButton type="submit" disabled={busy}>
          {loyaltyCopy.redeemAction}
        </ActionButton>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-burgundy">
          {error}
        </p>
      ) : null}
      {reward ? (
        <div className="mt-4 rounded-2xl bg-foam px-4 py-3">
          <p className="font-display text-lg font-semibold text-burgundy-deep">{reward.rewardTextAr}</p>
          {reward.rewardTextEn ? <p className="mt-1 text-sm text-ink/60">{reward.rewardTextEn}</p> : null}
          <p className="mt-2 text-sm font-semibold text-ink/70">
            {loyaltyCopy.stampsRemaining}
            {": "}
            <span dir="ltr" className="font-sans tabular-nums">
              {reward.stampsRemaining}
            </span>
          </p>
        </div>
      ) : null}
    </form>
  );
}
