"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { formatStamp } from "@/lib/admin/format";
import { formatOrderTime } from "@/lib/cashier/orders";
import { isFeatureUnavailable } from "@/lib/features";
import {
  loyaltyCopy,
  loyaltyPatch,
  loyaltyProgramProblem,
  loyaltyStopWarning,
  readActivityPage,
  readLoyaltyProgram,
  readLoyaltySummary,
  readRedemptionRow,
  readStampRow,
} from "@/lib/loyalty";
import { statsErrorText } from "@/lib/owner/stats";

const fieldClass =
  "h-12 w-full rounded-xl border border-burgundy/10 bg-white px-4 text-base text-ink outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/20 shadow-sm";

function loyaltyErrorText(error) {
  if (error?.status === 422) {
    return loyaltyCopy.offerError;
  }
  return statsErrorText(error);
}

function PageButtons({ page, onPage }) {
  if (!page || page.lastPage <= 1) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <button
        type="button"
        disabled={page.currentPage <= 1}
        onClick={() => onPage(page.currentPage - 1)}
        className="inline-flex h-10 cursor-pointer items-center rounded-xl px-3 text-sm font-semibold text-burgundy disabled:opacity-40"
      >
        {loyaltyCopy.previous}
      </button>
      <p dir="ltr" className="font-sans text-sm tabular-nums text-ink/50">
        {page.currentPage} / {page.lastPage}
      </p>
      <button
        type="button"
        disabled={page.currentPage >= page.lastPage}
        onClick={() => onPage(page.currentPage + 1)}
        className="inline-flex h-10 cursor-pointer items-center rounded-xl px-3 text-sm font-semibold text-burgundy disabled:opacity-40"
      >
        {loyaltyCopy.next}
      </button>
    </div>
  );
}

export function OwnerLoyalty({ token, timeZone, onUnauthenticated, onInactive, onFeatureUnavailable }) {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState("");
  const [pendingBody, setPendingBody] = useState(null);
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState("");
  const [page, setPage] = useState(1);
  const onUnauthenticatedRef = useRef(onUnauthenticated);
  const onInactiveRef = useRef(onInactive);
  const onFeatureUnavailableRef = useRef(onFeatureUnavailable);

  useEffect(() => {
    onUnauthenticatedRef.current = onUnauthenticated;
    onInactiveRef.current = onInactive;
    onFeatureUnavailableRef.current = onFeatureUnavailable;
  }, [onUnauthenticated, onInactive, onFeatureUnavailable]);

  function leave(requestError) {
    if (requestError.status === 401) {
      onUnauthenticatedRef.current();
      return true;
    }
    if (requestError.status === 403 && requestError.body?.message === "inactive") {
      onInactiveRef.current();
      return true;
    }
    if (isFeatureUnavailable(requestError)) {
      onFeatureUnavailableRef.current();
      return true;
    }
    return false;
  }

  useEffect(() => {
    let stopped = false;

    apiFetch("/restaurant/loyalty", { token })
      .then((payload) => {
        if (stopped) {
          return;
        }
        const program = readLoyaltyProgram(payload);
        setSaved(program);
        setDraft(program);
      })
      .catch((requestError) => {
        if (stopped || leave(requestError)) {
          return;
        }
        setError(loyaltyErrorText(requestError));
      });

    return () => {
      stopped = true;
    };
  }, [token]);

  useEffect(() => {
    let stopped = false;

    apiFetch(`/restaurant/loyalty/activity?page=${page}`, { token })
      .then((payload) => {
        if (stopped) {
          return;
        }
        setActivity({
          stamps: readActivityPage(payload?.stamps),
          redemptions: readActivityPage(payload?.redemptions),
        });
        setActivityError("");
      })
      .catch((requestError) => {
        if (stopped || leave(requestError)) {
          return;
        }
        setActivityError(loyaltyErrorText(requestError));
      });

    return () => {
      stopped = true;
    };
  }, [token, page]);

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  }

  async function save(body) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = await apiFetch("/restaurant/loyalty", { token, method: "PATCH", body });
      const program = readLoyaltyProgram(payload);
      setSaved(program);
      setDraft(program);
      setNotice(loyaltyCopy.saved);
      setWarning("");
      setPendingBody(null);
    } catch (requestError) {
      if (!leave(requestError)) {
        setError(loyaltyErrorText(requestError));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!saved || !draft || busy) {
      return;
    }

    const problem = loyaltyProgramProblem(saved, draft);
    if (problem) {
      setError(problem);
      setNotice("");
      return;
    }

    const body = loyaltyPatch(saved, draft);
    if (Object.keys(body).length === 0) {
      setError(loyaltyCopy.noChange);
      setNotice("");
      return;
    }

    if (saved.enabled && body.enabled === false) {
      setBusy(true);
      setError("");
      try {
        const summary = await apiFetch("/restaurant/loyalty/summary", { token });
        setPendingBody(body);
        setWarning(loyaltyStopWarning(readLoyaltySummary(summary)));
      } catch (requestError) {
        if (!leave(requestError)) {
          setError(loyaltyErrorText(requestError));
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    await save(body);
  }

  const stamps = (activity?.stamps?.data || []).map(readStampRow);
  const redemptions = (activity?.redemptions?.data || []).map(readRedemptionRow);

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="flex max-w-xl flex-col gap-4 rounded-[1.5rem] border border-burgundy/5 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] sm:p-6"
      >
        <div>
          <h2 className="font-display text-xl font-semibold text-burgundy-deep">برنامج الولاء</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">{loyaltyCopy.snapshotNote}</p>
        </div>
        {!draft ? (
          <p className="text-sm font-medium text-ink/50">يتم تحميل البرنامج.</p>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-burgundy-deep">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => update("enabled", event.target.checked)}
                className="size-4 accent-burgundy"
              />
              {loyaltyCopy.enable}
            </label>
            <label htmlFor="loyalty-goal" className="block">
              <span className="mb-2 block text-sm font-bold text-burgundy-deep">{loyaltyCopy.goalLabel}</span>
              <input
                id="loyalty-goal"
                dir="ltr"
                inputMode="numeric"
                value={draft.stampsRequired}
                onChange={(event) => update("stampsRequired", event.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                className={fieldClass}
              />
            </label>
            <label htmlFor="loyalty-ar" className="block">
              <span className="mb-2 block text-sm font-bold text-burgundy-deep">{loyaltyCopy.rewardAr}</span>
              <input
                id="loyalty-ar"
                maxLength={255}
                value={draft.rewardTextAr}
                onChange={(event) => update("rewardTextAr", event.target.value)}
                className={fieldClass}
              />
            </label>
            <label htmlFor="loyalty-en" className="block">
              <span className="mb-2 block text-sm font-bold text-burgundy-deep">{loyaltyCopy.rewardEn}</span>
              <input
                id="loyalty-en"
                dir="ltr"
                maxLength={255}
                value={draft.rewardTextEn}
                onChange={(event) => update("rewardTextEn", event.target.value)}
                className={fieldClass}
              />
              <span className="mt-1 block text-sm text-ink/45">{loyaltyCopy.rewardEnHint}</span>
            </label>
          </>
        )}
        {error ? (
          <p role="alert" className="text-sm font-semibold text-burgundy">
            {error}
          </p>
        ) : null}
        {notice ? <p className="text-sm font-semibold text-burgundy-deep">{notice}</p> : null}
        <ActionButton type="submit" disabled={busy || !draft} className="w-full sm:w-40">
          {busy ? loyaltyCopy.saving : loyaltyCopy.save}
        </ActionButton>
      </form>

      <section className="rounded-[1.5rem] border border-burgundy/5 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] sm:p-6">
        <h2 className="font-display text-xl font-semibold text-burgundy-deep">{loyaltyCopy.activity}</h2>
        {activityError ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-burgundy">
            {activityError}
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-burgundy-deep">{loyaltyCopy.stamps}</h3>
            {stamps.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">{loyaltyCopy.noStamps}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {stamps.map((stamp, index) => (
                  <li key={`${stamp.collectedAt}-${stamp.orderNumber}-${index}`} className="rounded-2xl bg-ivory/80 px-4 py-3 ring-1 ring-burgundy/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <p dir="ltr" className="font-sans text-lg font-semibold text-burgundy-deep">
                        {stamp.orderNumber || "—"}
                      </p>
                      <p className="text-sm text-ink/45">
                        {stamp.collectedAt
                          ? `${formatStamp(stamp.collectedAt, timeZone)} ${formatOrderTime(stamp.collectedAt, timeZone)}`
                          : ""}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-ink/70">{stamp.cashierName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {stamp.fastCollect ? (
                        <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold text-gold-deep">
                          {loyaltyCopy.fastCollect}
                        </span>
                      ) : null}
                      {!stamp.assigned ? (
                        <span className="rounded-full bg-foam px-2.5 py-0.5 text-xs font-semibold text-burgundy">
                          {loyaltyCopy.unassigned}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <PageButtons page={activity?.stamps} onPage={setPage} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-burgundy-deep">{loyaltyCopy.redemptions}</h3>
            {redemptions.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">{loyaltyCopy.noRedemptions}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {redemptions.map((item, index) => (
                  <li key={`${item.createdAt}-${index}`} className="rounded-2xl bg-ivory/80 px-4 py-3 ring-1 ring-burgundy/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-burgundy-deep">{item.rewardTextAr}</p>
                      <p className="text-sm text-ink/45">
                        {item.createdAt
                          ? `${formatStamp(item.createdAt, timeZone)} ${formatOrderTime(item.createdAt, timeZone)}`
                          : ""}
                      </p>
                    </div>
                    {item.rewardTextEn ? <p className="mt-1 text-sm text-ink/55">{item.rewardTextEn}</p> : null}
                    <p className="mt-1 text-sm text-ink/70">
                      {item.cashierName}
                      {" · "}
                      <span dir="ltr" className="font-sans tabular-nums">
                        {item.stampsSpent}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <PageButtons page={activity?.redemptions} onPage={setPage} />
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(warning)}
        title={loyaltyCopy.stopTitle}
        titleId="loyalty-stop-title"
        body={warning}
        confirmLabel={loyaltyCopy.stopConfirm}
        pending={busy}
        onConfirm={() => {
          if (pendingBody) {
            save(pendingBody);
          }
        }}
        onDismiss={() => {
          if (!busy) {
            setWarning("");
            setPendingBody(null);
            if (saved) {
              setDraft(saved);
            }
          }
        }}
      />
    </div>
  );
}
