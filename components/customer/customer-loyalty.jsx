"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, restaurantIconSrc } from "@/lib/api/client";
import { publicErrorText, visitorHeaders } from "@/lib/customer/public";
import { readFeatures } from "@/lib/features";
import {
  countdownLabel,
  loyaltyCardVisible,
  loyaltyCopy,
  readLoyaltyCard,
  rewardReadyLabel,
  secondsUntil,
  stampProgress,
  stampSlots,
} from "@/lib/loyalty";

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
          setOff(true);
          return;
        }
        const icon = restaurantIconSrc(restaurant?.icon_url);
        if (icon) {
          setMark(icon);
        }
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
          setOff(true);
          return;
        }
        setProblem(publicErrorText(error, loyaltyCopy.cardUnavailable));
      });

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
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
    </section>
  );
}
