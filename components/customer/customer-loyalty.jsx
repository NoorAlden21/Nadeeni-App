"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, restaurantIconSrc } from "@/lib/api/client";
import { cashierCopy } from "@/lib/cashier/orders";
import { publicErrorText, readVisitorId, visitorHeaders } from "@/lib/customer/public";
import { readFeatures } from "@/lib/features";
import {
  countdownLabel,
  loyaltyCardVisible,
  loyaltyCopy,
  loyaltyPhoneCode,
  loyaltyPhoneError,
  loyaltyPhoneStartBody,
  loyaltyPhoneValue,
  loyaltyPhoneVerifyBody,
  readLoyaltyCard,
  westernDigits,
  rewardReadyLabel,
  secondsUntil,
  stampProgress,
  stampSlots,
} from "@/lib/loyalty";

function phoneProblem(error) {
  return loyaltyPhoneError(error) || publicErrorText(error, loyaltyCopy.cardUnavailable);
}

function LoyaltyPhone({ slug, allowed, onReload, onUnavailable }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("phone");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function fail(requestError) {
    if (requestError.status === 404) {
      onUnavailable();
      return;
    }
    setError(phoneProblem(requestError));
  }

  async function requestCode() {
    if (busy || !allowed.current) {
      return;
    }

    const typed = phone.trim();
    if (!typed) {
      setNotice("");
      setError(loyaltyCopy.emptyPhone);
      return;
    }

    const nextPhone = loyaltyPhoneValue(phone);
    if (!nextPhone) {
      setNotice("");
      setError(loyaltyCopy.phoneInvalid);
      return;
    }
    if (!readVisitorId()) {
      setNotice("");
      setError(loyaltyCopy.visitorRequired);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = await apiFetch(
        `/public/restaurants/${encodeURIComponent(slug)}/loyalty-card/phone/start`,
        { method: "POST", headers: visitorHeaders(), body: loyaltyPhoneStartBody(nextPhone) },
      );
      if (payload?.message !== "code_sent") {
        setNotice("");
        setError(cashierCopy.generic);
        return;
      }
      setPhone(nextPhone);
      setCode("");
      setStep("code");
      setNotice(loyaltyCopy.codeSent);
    } catch (requestError) {
      fail(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    if (busy || !allowed.current || step !== "code") {
      return;
    }

    const nextPhone = loyaltyPhoneValue(phone);
    const nextCode = loyaltyPhoneCode(code);
    if (!nextPhone) {
      setError(loyaltyCopy.phoneInvalid);
      return;
    }
    if (!nextCode) {
      setError(loyaltyCopy.emptyCode);
      return;
    }
    if (!readVisitorId()) {
      setError(loyaltyCopy.visitorRequired);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = await apiFetch(
        `/public/restaurants/${encodeURIComponent(slug)}/loyalty-card/phone/verify`,
        {
          method: "POST",
          headers: visitorHeaders(),
          body: loyaltyPhoneVerifyBody(nextPhone, nextCode, name),
        },
      );
      if (payload?.message !== "verified") {
        setError(cashierCopy.generic);
        return;
      }
      setNotice("");
      setCode("");
      await onReload();
    } catch (requestError) {
      fail(requestError);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    if (step === "code") {
      confirmCode();
      return;
    }
    requestCode();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="mt-5 border-t border-burgundy/10 pt-4">
      <p className="text-sm leading-6 text-ink/60">{loyaltyCopy.phoneOptional}</p>
      {step === "phone" ? (
        <>
          <label htmlFor="loyalty-phone" className="mt-3 block text-sm font-semibold text-burgundy-deep">
            {loyaltyCopy.phoneLabel}
          </label>
          <input
            id="loyalty-phone"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setError("");
            }}
            className="mt-2 h-12 w-full rounded-2xl bg-ivory px-4 font-sans text-base text-ink outline-none ring-1 ring-burgundy/15 focus:bg-white focus:ring-2 focus:ring-gold"
          />
          <label htmlFor="loyalty-name" className="mt-3 block text-sm font-semibold text-burgundy-deep">
            {loyaltyCopy.nameLabel}
            <span className="ms-2 font-medium text-ink/45">{loyaltyCopy.nameOptional}</span>
          </label>
          <input
            id="loyalty-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl bg-ivory px-4 text-base text-ink outline-none ring-1 ring-burgundy/15 focus:bg-white focus:ring-2 focus:ring-gold"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-burgundy font-semibold text-on-primary disabled:opacity-40"
          >
            {busy ? loyaltyCopy.sendingCode : loyaltyCopy.sendCode}
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm font-semibold leading-6 text-burgundy">{notice}</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">{loyaltyCopy.phoneCodeHint}</p>
          <p className="mt-3 text-sm font-semibold text-ink/70">
            {loyaltyCopy.phonePending}
            <span dir="ltr" className="ms-2 font-sans tabular-nums tracking-wider text-burgundy-deep">
              {phone.slice(-4)}
            </span>
          </p>
          <label htmlFor="loyalty-name" className="mt-3 block text-sm font-semibold text-burgundy-deep">
            {loyaltyCopy.nameLabel}
            <span className="ms-2 font-medium text-ink/45">{loyaltyCopy.nameOptional}</span>
          </label>
          <input
            id="loyalty-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl bg-ivory px-4 text-base text-ink outline-none ring-1 ring-burgundy/15 focus:bg-white focus:ring-2 focus:ring-gold"
          />
          <label htmlFor="loyalty-phone-code" className="mt-3 block text-sm font-semibold text-burgundy-deep">
            {loyaltyCopy.phoneCodeLabel}
          </label>
          <input
            id="loyalty-phone-code"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => {
              setCode(westernDigits(event.target.value).replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            className="mt-2 h-12 w-full rounded-2xl bg-ivory px-4 text-center font-sans text-2xl font-bold tracking-[0.28em] text-burgundy-deep outline-none ring-1 ring-burgundy/15 focus:bg-white focus:ring-2 focus:ring-gold"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-burgundy font-semibold text-on-primary disabled:opacity-40"
          >
            {busy ? loyaltyCopy.verifyingPhone : loyaltyCopy.verifyPhone}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={requestCode}
            className="mt-2 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl text-sm font-semibold text-burgundy disabled:opacity-40"
          >
            {loyaltyCopy.requestCode}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep("phone");
              setNotice("");
              setCode("");
              setError("");
            }}
            className="mt-1 inline-flex h-10 w-full cursor-pointer items-center justify-center text-sm font-semibold text-ink/50 disabled:opacity-40"
          >
            {loyaltyCopy.changePhone}
          </button>
        </>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-burgundy">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function CustomerLoyalty({ slug, stampAdded, iconUrl = "", onPaper = true }) {
  const [card, setCard] = useState(null);
  const [off, setOff] = useState(false);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [claim, setClaim] = useState(null);
  const [claimError, setClaimError] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [now, setNow] = useState(null);
  const [pulse, setPulse] = useState(0);
  const [mark, setMark] = useState(iconUrl);
  const noted = useRef(false);
  const claimedPending = useRef(null);
  const watch = useRef(false);
  const phoneAllowed = useRef(false);
  const reloadCard = useRef(async () => {});

  useEffect(() => {
    if (iconUrl) {
      setMark(iconUrl);
    }
  }, [iconUrl]);

  useEffect(() => {
    if (!stampAdded || noted.current) {
      return;
    }
    noted.current = true;
    setNotice(loyaltyCopy.stampAdded);
    setPulse((value) => value + 1);
  }, [stampAdded]);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    let enabled = false;

    function apply(payload) {
      const next = readLoyaltyCard(payload);
      setCard(next);
      setProblem("");
      watch.current = Boolean(next && next.pendingRewards >= 1);
      if (claimedPending.current != null && next && next.pendingRewards < claimedPending.current) {
        claimedPending.current = null;
        setClaim(null);
        setClaimError("");
      }
    }

    async function loadCard() {
      try {
        const payload = await apiFetch(`/public/restaurants/${encodeURIComponent(slug)}/loyalty-card`, {
          headers: visitorHeaders(),
        });
        if (stopped) {
          return;
        }
        apply(payload);
      } catch (error) {
        if (stopped) {
          return;
        }
        if (error.status === 404) {
          enabled = false;
          phoneAllowed.current = false;
          setOff(true);
          setCard(null);
          return;
        }
        setProblem(publicErrorText(error, loyaltyCopy.cardUnavailable));
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      if (!enabled || !watch.current) {
        return;
      }
      timer = window.setTimeout(() => {
        if (stopped || !enabled || !watch.current) {
          return;
        }
        if (document.visibilityState === "visible") {
          loadCard().finally(() => {
            if (!stopped && enabled) {
              schedule();
            }
          });
        } else {
          schedule();
        }
      }, 4000);
    }

    function onVisibility() {
      if (document.visibilityState !== "visible" || stopped || !enabled || !watch.current) {
        return;
      }
      window.clearTimeout(timer);
      loadCard().finally(() => {
        if (!stopped && enabled) {
          schedule();
        }
      });
    }

    apiFetch(`/public/restaurants/${encodeURIComponent(slug)}`)
      .then(async (restaurant) => {
        if (stopped) {
          return;
        }
        if (!readFeatures(restaurant).loyalty) {
          phoneAllowed.current = false;
          setOff(true);
          return;
        }
        const icon = restaurantIconSrc(restaurant?.icon_url);
        if (icon) {
          setMark(icon);
        }
        phoneAllowed.current = true;
        enabled = true;
        await loadCard();
        if (!stopped && enabled) {
          schedule();
        }
      })
      .catch((error) => {
        if (stopped) {
          return;
        }
        if (error.status === 404) {
          phoneAllowed.current = false;
          setOff(true);
          return;
        }
        setProblem(publicErrorText(error, loyaltyCopy.cardUnavailable));
      });

    reloadCard.current = async () => {
      if (stopped || !enabled) {
        return;
      }
      await loadCard();
      if (!stopped && enabled) {
        schedule();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      reloadCard.current = async () => {};
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slug, pulse]);

  useEffect(() => {
    if (!claim?.expiresAt) {
      return undefined;
    }

    let timer = 0;
    function tick() {
      setNow(Date.now());
      timer = window.setTimeout(tick, 1000);
    }
    tick();

    return () => window.clearTimeout(timer);
  }, [claim?.expiresAt]);

  async function claimCode() {
    const remaining = claim ? secondsUntil(claim.expiresAt, now ?? Date.now()) : 0;
    if (claimBusy || !card || card.pendingRewards < 1 || remaining > 0) {
      return;
    }

    setClaimBusy(true);
    setClaimError("");
    try {
      const payload = await apiFetch(
        `/public/restaurants/${encodeURIComponent(slug)}/loyalty-card/claim-code`,
        { method: "POST", headers: visitorHeaders() },
      );
      claimedPending.current = card.pendingRewards;
      setClaim({
        code: typeof payload?.code === "string" ? payload.code : "",
        expiresAt: typeof payload?.expires_at === "string" ? payload.expires_at : "",
      });
      setNow(Date.now());
    } catch (error) {
      if (error.status === 404) {
        phoneAllowed.current = false;
        setOff(true);
        return;
      }
      setClaimError(publicErrorText(error, loyaltyCopy.noReward));
    } finally {
      setClaimBusy(false);
    }
  }

  if (off) {
    return null;
  }

  if (!loyaltyCardVisible(card)) {
    if (!notice && !problem) {
      return null;
    }
    return (
      <div className="mt-6 w-full text-center">
        {notice ? <p className={`text-sm font-semibold ${onPaper ? "text-burgundy" : "text-gold"}`}>{notice}</p> : null}
        {problem ? <p className="mt-2 text-sm font-medium text-burgundy">{problem}</p> : null}
      </div>
    );
  }

  const slots = stampSlots(card);
  const progress = stampProgress(card);
  const remaining = claim ? secondsUntil(claim.expiresAt, now ?? Date.now()) : 0;
  const liveCode = Boolean(claim?.code) && remaining > 0;

  return (
    <section className="mt-6 w-full rounded-[1.6rem] bg-paper p-5 text-ink shadow-[0_20px_50px_-28px_rgba(74,4,24,0.28)] ring-1 ring-burgundy/10">
      {notice ? <p className="text-sm font-semibold text-burgundy">{notice}</p> : null}
      <h2 className="font-display text-xl font-semibold text-burgundy-deep">بطاقة الولاء</h2>
      {card.rewardTextAr ? (
        <p className="mt-1 text-sm leading-6 text-ink/70">{card.rewardTextAr}</p>
      ) : null}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3 text-sm font-semibold">
          <p className="text-ink/70">
            <span dir="ltr" className="font-sans tabular-nums">
              {progress.filled}
              <span className="text-ink/35"> / </span>
              {progress.goal}
            </span>
            <span className="ms-1 text-ink/45">أختام</span>
          </p>
          <p dir="ltr" className="font-sans tabular-nums text-ink/70">
            {progress.percent}%
          </p>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e5e5ea]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.goal}
          aria-valuenow={progress.filled}
          aria-label={loyaltyCopy.goalLabel}
        >
          <div
            className="h-full rounded-full bg-[#007aff]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap justify-center gap-2">
        {slots.map((filled, index) => (
          <li
            key={index}
            className={`size-10 overflow-hidden rounded-full ${
              filled
                ? "bg-gold ring-2 ring-gold"
                : "bg-ivory ring-1 ring-burgundy/15"
            }`}
          >
            {filled && mark ? (
              <img src={mark} alt="" className="size-full object-cover" />
            ) : null}
          </li>
        ))}
      </ul>
      {card.pendingRewards >= 1 ? (
        <p className="mt-4 inline-flex rounded-full bg-gold/20 px-3 py-1 text-sm font-bold text-gold-deep">
          {rewardReadyLabel(card.pendingRewards)}
        </p>
      ) : null}
      {card.state === "paused" ? (
        <p className="mt-3 text-sm leading-6 text-ink/60">{loyaltyCopy.paused}</p>
      ) : null}
      {claim?.code ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink/50">{loyaltyCopy.codeLabel}</p>
          <p dir="ltr" className="font-sans text-4xl font-bold tracking-[0.28em] text-burgundy-deep">
            {claim.code}
          </p>
          <p dir="ltr" className="mt-1 font-sans text-sm font-semibold tabular-nums text-ink/60">
            {remaining > 0 ? countdownLabel(remaining) : loyaltyCopy.codeExpired}
          </p>
        </div>
      ) : null}
      {card.pendingRewards >= 1 && !liveCode ? (
        <button
          type="button"
          onClick={claimCode}
          disabled={claimBusy}
          className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-burgundy font-semibold text-on-primary disabled:opacity-40"
        >
          {claimBusy ? loyaltyCopy.claiming : claim ? loyaltyCopy.claimAgain : loyaltyCopy.claim}
        </button>
      ) : null}
      {claimError ? <p className="mt-3 text-sm font-semibold text-burgundy">{claimError}</p> : null}
      {problem ? <p className="mt-3 text-sm font-medium text-burgundy">{problem}</p> : null}
      {card.phoneLast4 ? (
        <p className="mt-5 border-t border-burgundy/10 pt-4 text-sm font-semibold text-ink/70">
          {loyaltyCopy.phoneSaved}
          <span dir="ltr" className="ms-2 font-sans tabular-nums tracking-wider text-burgundy-deep">
            {card.phoneLast4}
          </span>
        </p>
      ) : (
        <LoyaltyPhone
          slug={slug}
          allowed={phoneAllowed}
          onReload={() => reloadCard.current()}
          onUnavailable={() => {
            phoneAllowed.current = false;
            setOff(true);
            setCard(null);
          }}
        />
      )}
    </section>
  );
}
