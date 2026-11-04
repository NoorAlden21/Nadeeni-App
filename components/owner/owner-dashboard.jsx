"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { QrDialog } from "@/components/cashier/qr-dialog";
import { OwnerCharts } from "@/components/owner/owner-charts";
import { OwnerReviews } from "@/components/owner/owner-reviews";
import { RestaurantMenu } from "@/components/menu/restaurant-menu";
import { ScreenSwitch } from "@/components/menu/screen-switch";
import { qrTargetUrl } from "@/lib/qr/download";
import { defaultRange, rangeError, statsErrorText } from "@/lib/owner/stats";

const fieldClass =
  "h-12 w-full rounded-xl border border-burgundy/10 bg-white px-4 text-base text-ink outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/20 shadow-sm";

function HeaderButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-burgundy shadow-sm ring-1 ring-burgundy/10 transition duration-300 hover:bg-foam hover:text-burgundy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      {children}
    </button>
  );
}

export function OwnerDashboard({ token, user, onUnauthenticated, onInactive }) {
  const timeZone = user.restaurant?.timezone || "Asia/Damascus";
  const initialRange = defaultRange(timeZone);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(null);
  const [screen, setScreen] = useState("stats");
  const onUnauthenticatedRef = useRef(onUnauthenticated);
  const onInactiveRef = useRef(onInactive);

  useEffect(() => {
    onUnauthenticatedRef.current = onUnauthenticated;
    onInactiveRef.current = onInactive;
  }, [onUnauthenticated, onInactive]);

  useEffect(() => {
    let stopped = false;

    async function load() {
      try {
        const next = await apiFetch(
          `/restaurant/stats?from=${initialRange.from}&to=${initialRange.to}`,
          { token },
        );
        if (stopped) {
          return;
        }
        setStats(next);
        setError("");
        try {
          const reviewPage = await apiFetch(
            `/restaurant/reviews?from=${initialRange.from}&to=${initialRange.to}`,
            { token },
          );
          if (!stopped) {
            setReviews(reviewPage);
          }
        } catch (reviewError) {
          if (stopped) {
            return;
          }
          if (reviewError.status === 401) {
            onUnauthenticatedRef.current();
            return;
          }
          if (reviewError.status === 403 && reviewError.body?.message === "inactive") {
            onInactiveRef.current();
            return;
          }
          setReviews(null);
        }
      } catch (requestError) {
        if (stopped) {
          return;
        }
        if (requestError.status === 401) {
          onUnauthenticatedRef.current();
          return;
        }
        if (requestError.status === 403 && requestError.body?.message === "inactive") {
          onInactiveRef.current();
          return;
        }
        setError(statsErrorText(requestError));
      } finally {
        if (!stopped) {
          setLoaded(true);
        }
      }
    }

    load();

    return () => {
      stopped = true;
    };
  }, [token, initialRange.from, initialRange.to]);

  async function handleSubmit(event) {
    event.preventDefault();
    const invalid = rangeError(from, to);
    if (invalid) {
      setError(invalid);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const next = await apiFetch(`/restaurant/stats?from=${from}&to=${to}`, { token });
      setStats(next);
      try {
        const reviewPage = await apiFetch(`/restaurant/reviews?from=${from}&to=${to}`, { token });
        setReviews(reviewPage);
      } catch (reviewError) {
        if (reviewError.status === 401) {
          onUnauthenticated();
          return;
        }
        if (reviewError.status === 403 && reviewError.body?.message === "inactive") {
          onInactive();
          return;
        }
        setReviews(null);
      }
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

  function showSharedQr() {
    const slug = user.restaurant?.slug;
    if (!slug) {
      return;
    }

    setQr({
      title: "رمز المطعم",
      url: qrTargetUrl(`${window.location.origin}/r/${encodeURIComponent(slug)}`),
    });
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#fcfbfc]">
      <header className="sticky top-0 z-20 border-b border-burgundy/5 bg-white pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-4 px-4 py-3 sm:min-h-[5rem] sm:px-8">
          <BrandMark className="h-10 w-10 sm:h-12 sm:w-12" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold text-burgundy-deep sm:text-2xl">
              {screen === "menu" ? "قائمة المطعم" : "إحصاءات المطعم"}
            </h1>
            {user.restaurant?.name ? (
              <p className="truncate text-sm font-medium text-ink/50">{user.restaurant.name}</p>
            ) : null}
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={showSharedQr}
              disabled={!user.restaurant?.slug}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#f7f1e4] px-4 text-sm font-semibold text-gold-deep shadow-sm ring-1 ring-inset ring-gold/30 transition duration-300 hover:bg-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-40"
            >
              رمز المطعم
            </button>
            <HeaderButton onClick={onUnauthenticated}>تسجيل الخروج</HeaderButton>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 pb-3 sm:px-8">
          <ScreenSwitch
            value={screen}
            onChange={setScreen}
            options={[
              { id: "stats", label: "الإحصاءات" },
              { id: "menu", label: "القائمة" },
            ]}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:gap-8 sm:px-8 sm:pt-8 sm:pb-12">
        {screen === "menu" ? (
          <RestaurantMenu token={token} onUnauthenticated={onUnauthenticated} onInactive={onInactive} />
        ) : (
          <>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 rounded-[1.5rem] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-burgundy/5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
        >
          <label htmlFor="stats-from" className="block">
            <span className="mb-2 block text-sm font-bold text-burgundy-deep">من تاريخ</span>
            <input
              id="stats-from"
              type="date"
              dir="ltr"
              required
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label htmlFor="stats-to" className="block">
            <span className="mb-2 block text-sm font-bold text-burgundy-deep">إلى تاريخ</span>
            <input
              id="stats-to"
              type="date"
              dir="ltr"
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={fieldClass}
            />
          </label>
          <ActionButton type="submit" disabled={busy} className="h-12 w-full sm:w-32 rounded-xl">
            عرض
          </ActionButton>
        </form>

        {!loaded ? (
          <div className="flex items-center justify-center p-10">
            <p className="text-sm font-medium text-ink/50 animate-pulse">يتم تحميل الإحصاءات...</p>
          </div>
        ) : null}
        
        {error ? (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100">
            <p role="alert" className="text-sm font-semibold text-red-600 text-center">
              {error}
            </p>
          </div>
        ) : null}

        {stats ? <OwnerCharts stats={stats} from={stats.from || from} to={stats.to || to} /> : null}
        {reviews ? (
          <OwnerReviews
            reviews={reviews}
            timeZone={stats?.timezone || timeZone}
            from={reviews.from || stats?.from || from}
            to={reviews.to || stats?.to || to}
          />
        ) : null}
          </>
        )}
      </main>
      <QrDialog qr={qr} onDismiss={() => setQr(null)} />
    </div>
  );
}