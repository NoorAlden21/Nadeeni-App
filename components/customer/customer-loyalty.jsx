"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { LoyaltyMeter, StampRow } from "@/components/motion/loyalty-motion";
import { PressButton } from "@/components/motion/press-button";
import { spring } from "@/lib/motion";
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

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const fieldClass =
  "mt-2 h-[52px] w-full rounded-track-md border-[1.5px] border-track-line bg-track-surface px-4 text-[15px] text-track-text outline-none transition-[border-color,box-shadow] duration-200 focus:border-track-brand focus:ring-4 focus:ring-[rgba(255,194,14,0.25)]";

const primaryButton =
  "inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-track-md bg-track-brand text-[15px] font-bold text-track-on shadow-track-press transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(255,194,14,0.45)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

const labelClass = "mt-4 block text-[14px] font-bold text-track-ink";

function LoyaltyPhone({ slug, allowed, onReload, onUnavailable }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("phone");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendState, setSendState] = useState("idle");
  const alive = useRef(true);
  const shake = useAnimation();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }
    shake.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.3 } });
  }, [error, shake]);

  function fail(requestError) {
    if (requestError.status === 404) {
      onUnavailable();
      return;
    }
    setError(phoneProblem(requestError));
  }

  async function requestCode() {
    if (busy || sendState === "success" || !allowed.current) {
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
    let sent = false;
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
      setNotice(loyaltyCopy.codeSent);
      setSendState("success");
      sent = true;
    } catch (requestError) {
      fail(requestError);
    } finally {
      setBusy(false);
    }
    if (!sent || step !== "phone") {
      if (sent) {
        setSendState("idle");
      }
      return;
    }
    await wait(1500);
    if (!alive.current) {
      return;
    }
    setSendState("idle");
    setStep("code");
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
    <form method="post" onSubmit={onSubmit} className="mt-6 border-t border-track-line pt-4 text-start">
      <p className="text-[13px] leading-6 text-track-muted">{loyaltyCopy.phoneOptional}</p>
      <motion.div animate={shake}>
        {step === "phone" ? (
          <>
            <label htmlFor="loyalty-phone" className={labelClass}>
              {loyaltyCopy.phoneLabel}
            </label>
            <input
              id="loyalty-phone"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05XXXXXXXX"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setError("");
              }}
              className={`${fieldClass} font-sans tabular-nums`}
            />
            <label htmlFor="loyalty-name" className={labelClass}>
              {loyaltyCopy.nameLabel}
              <span className="ms-2 text-[12px] font-medium text-track-muted">{loyaltyCopy.nameOptional}</span>
            </label>
            <input
              id="loyalty-name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
            {sendState === "success" ? (
              <p className="mt-4 text-[13px] font-medium leading-6 text-track-deep">{notice}</p>
            ) : null}
            <PressButton
              type="submit"
              disabled={busy || sendState === "success"}
              className={`mt-4 ${primaryButton}`}
            >
              {sendState === "success" ? (
                <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} aria-hidden="true">
                  <Check className="size-5" strokeWidth={2} />
                </motion.span>
              ) : busy ? (
                <>
                  <Loader2 className="size-5 animate-spin" strokeWidth={2} aria-hidden="true" />
                  <span className="sr-only">{loyaltyCopy.sendingCode}</span>
                </>
              ) : (
                loyaltyCopy.sendCode
              )}
            </PressButton>
          </>
        ) : (
          <>
            <p className="mt-4 text-[13px] font-medium leading-6 text-track-deep">{notice}</p>
            <p className="mt-1 text-[13px] leading-6 text-track-muted">{loyaltyCopy.phoneCodeHint}</p>
            <p className="mt-4 text-[14px] font-bold text-track-ink">
              {loyaltyCopy.phonePending}{" "}
              <bdi className="font-sans tabular-nums tracking-wider">{phone.slice(-4)}</bdi>
            </p>
            <label htmlFor="loyalty-name" className={labelClass}>
              {loyaltyCopy.nameLabel}
              <span className="ms-2 text-[12px] font-medium text-track-muted">{loyaltyCopy.nameOptional}</span>
            </label>
            <input
              id="loyalty-name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
            <label htmlFor="loyalty-phone-code" className={labelClass}>
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
              className={`${fieldClass} text-center font-sans text-2xl font-bold tracking-[0.28em] text-track-ink tabular-nums`}
            />
            <PressButton
              type="submit"
              disabled={busy}
              className={`mt-4 ${primaryButton}`}
            >
              {busy ? loyaltyCopy.verifyingPhone : loyaltyCopy.verifyPhone}
            </PressButton>
            <PressButton
              disabled={busy}
              onClick={requestCode}
              className="mt-2 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-track-md text-[14px] font-bold text-track-deep transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(255,194,14,0.45)] disabled:opacity-40"
            >
              {loyaltyCopy.requestCode}
            </PressButton>
            <PressButton
              disabled={busy}
              onClick={() => {
                setStep("phone");
                setNotice("");
                setCode("");
                setError("");
              }}
              className="mt-1 inline-flex h-10 w-full cursor-pointer items-center justify-center text-[13px] font-medium text-track-muted transition-opacity duration-200 disabled:opacity-40"
            >
              {loyaltyCopy.changePhone}
            </PressButton>
          </>
        )}
      </motion.div>
      <AnimatePresence>
        {error ? (
          <motion.p
            key={error}
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-3 text-[13px] font-medium text-track-deep"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </form>
  );
}

export function CustomerLoyalty({ slug, stampAdded }) {
  const [card, setCard] = useState(null);
  const [off, setOff] = useState(false);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const [claim, setClaim] = useState(null);
  const [claimError, setClaimError] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [now, setNow] = useState(null);
  const [pulse, setPulse] = useState(0);
  const noted = useRef(false);
  const claimedPending = useRef(null);
  const watch = useRef(false);
  const phoneAllowed = useRef(false);
  const reloadCard = useRef(async () => {});
  const prevMarks = useRef(null);
  const [slamIndex, setSlamIndex] = useState(-1);

  useEffect(() => {
    if (!card) {
      return;
    }
    const filled = stampProgress(card).filled;
    const pending = card.pendingRewards;
    const previous = prevMarks.current;
    prevMarks.current = { filled, pending };
    if (!previous) {
      return;
    }
    if (filled > previous.filled) {
      setSlamIndex(filled - 1);
      return;
    }
    if (pending > previous.pending && Number.isInteger(card.stampsRequired)) {
      setSlamIndex(card.stampsRequired - 1);
    }
  }, [card]);

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
      <div className="w-full text-center">
        {notice ? <p className="text-[14px] font-bold text-track-deep">{notice}</p> : null}
        {problem ? <p className="mt-2 text-[13px] font-medium text-track-deep">{problem}</p> : null}
      </div>
    );
  }

  const slots = stampSlots(card);
  const progress = stampProgress(card);
  const remaining = claim ? secondsUntil(claim.expiresAt, now ?? Date.now()) : 0;
  const liveCode = Boolean(claim?.code) && remaining > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.16 }}
      className="w-full rounded-track border border-track-line bg-track-surface px-5 py-6 text-center shadow-track"
    >
      {notice ? <p className="mb-2 text-[14px] font-bold text-track-deep">{notice}</p> : null}
      <h2 className="text-[20px] font-bold text-track-deep">بطاقة الولاء</h2>
      {card.rewardTextAr ? (
        <p className="mt-2 text-[14px] leading-6 text-track-text [unicode-bidi:plaintext]">{card.rewardTextAr}</p>
      ) : null}
      <LoyaltyMeter
        percent={progress.percent}
        filled={progress.filled}
        goal={progress.goal}
        label={loyaltyCopy.goalLabel}
      />
      <StampRow slots={slots} slamIndex={slamIndex} />
      {card.pendingRewards >= 1 ? (
        <p className="mt-4 inline-flex rounded-full bg-track-soft px-3 py-1 text-[13px] font-bold text-track-deep">
          {rewardReadyLabel(card.pendingRewards)}
        </p>
      ) : null}
      {card.state === "paused" ? (
        <p className="mt-4 text-[13px] leading-6 text-track-muted">{loyaltyCopy.paused}</p>
      ) : null}
      {claim?.code ? (
        <div className="mt-4">
          <p className="text-[13px] font-medium text-track-muted">{loyaltyCopy.codeLabel}</p>
          <p dir="ltr" className="font-sans text-[2rem] font-extrabold tracking-[0.28em] text-track-ink tabular-nums">
            {claim.code}
          </p>
          <p dir="ltr" className="mt-1 font-sans text-[13px] font-bold tabular-nums text-track-muted">
            {remaining > 0 ? countdownLabel(remaining) : loyaltyCopy.codeExpired}
          </p>
        </div>
      ) : null}
      {card.pendingRewards >= 1 && !liveCode ? (
        <PressButton
          onClick={claimCode}
          disabled={claimBusy}
          className={`mt-4 ${primaryButton}`}
        >
          {claimBusy ? loyaltyCopy.claiming : claim ? loyaltyCopy.claimAgain : loyaltyCopy.claim}
        </PressButton>
      ) : null}
      {claimError ? <p className="mt-3 text-[13px] font-medium text-track-deep">{claimError}</p> : null}
      {problem ? <p className="mt-3 text-[13px] font-medium text-track-deep">{problem}</p> : null}
      <AnimatePresence mode="wait">
        {card.phoneLast4 ? (
          <motion.p
            key="saved"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-6 border-t border-track-line pt-4 text-[14px] font-bold text-track-ink"
          >
            {loyaltyCopy.phoneSaved}{" "}
            <bdi className="font-sans tabular-nums tracking-wider">{card.phoneLast4}</bdi>
          </motion.p>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
