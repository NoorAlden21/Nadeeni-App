"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { QrDialog } from "@/components/cashier/qr-dialog";
import { OwnerCustomers, OwnerOrders } from "@/components/owner/owner-charts";
import { OwnerContact } from "@/components/owner/owner-contact";
import { OwnerReviews } from "@/components/owner/owner-reviews";
import { RestaurantMenu } from "@/components/menu/restaurant-menu";
import { SideNav } from "@/components/menu/screen-switch";
import { LogOut, Menu, X } from "lucide-react";
import { qrTargetUrl } from "@/lib/qr/download";
import { readFeatures } from "@/lib/features";
import { useRestaurantTheme } from "@/components/theme/use-restaurant-theme";
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

function RangeForm({ from, to, busy, onFrom, onTo, onSubmit }) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-4 rounded-[1.5rem] border border-burgundy/5 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
    >
      <label htmlFor="range-from" className="block">
        <span className="mb-2 block text-sm font-bold text-burgundy-deep">من تاريخ</span>
        <input
          id="range-from"
          type="date"
          dir="ltr"
          required
          value={from}
          onChange={(event) => onFrom(event.target.value)}
          className={fieldClass}
        />
      </label>
      <label htmlFor="range-to" className="block">
        <span className="mb-2 block text-sm font-bold text-burgundy-deep">إلى تاريخ</span>
        <input
          id="range-to"
          type="date"
          dir="ltr"
          required
          value={to}
          onChange={(event) => onTo(event.target.value)}
          className={fieldClass}
        />
      </label>
      <ActionButton type="submit" disabled={busy} className="h-12 w-full rounded-xl sm:w-32">
        عرض
      </ActionButton>
    </form>
  );
}

function RangeError({ message }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
      <p role="alert" className="text-center text-sm font-semibold text-red-600">
        {message}
      </p>
    </div>
  );
}

function PeriodPanel({ from, to, busy, loaded, error, loading, onFrom, onTo, onSubmit, children }) {
  return (
    <>
      <RangeForm from={from} to={to} busy={busy} onFrom={onFrom} onTo={onTo} onSubmit={onSubmit} />
      {!loaded ? (
        <div className="flex items-center justify-center p-10">
          <p className="animate-pulse text-sm font-medium text-ink/50">{loading}</p>
        </div>
      ) : null}
      {error ? <RangeError message={error} /> : null}
      {children}
    </>
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
  const [screen, setScreen] = useState("customers");
  const [navOpen, setNavOpen] = useState(false);
  const [contact, setContact] = useState(null);
  const [menuOff, setMenuOff] = useState(false);
  const onUnauthenticatedRef = useRef(onUnauthenticated);
  const onInactiveRef = useRef(onInactive);
  const theme = useRestaurantTheme(user?.restaurant);
  const menuOn = readFeatures(user.restaurant).menu && !menuOff;
  const screens = [
    { id: "orders", label: "الطلبات" },
    { id: "customers", label: "الزبائن" },
    { id: "reviews", label: "تقييمات الزبائن" },
    { id: "contact", label: "التواصل" },
    menuOn ? { id: "menu", label: "القائمة" } : null,
  ].filter(Boolean);
  const visible = screens.some((item) => item.id === screen) ? screen : "customers";
  const showNav = screens.length > 1;
  const sectionTitle = screens.find((item) => item.id === visible)?.label || "الزبائن";

  useEffect(() => {
    if (!navOpen) {
      return undefined;
    }

    function onKey(event) {
      if (event.key === "Escape") {
        setNavOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  function pickScreen(id) {
    setScreen(id);
    setNavOpen(false);
  }

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
    <div style={theme} className="min-h-dvh overflow-x-clip bg-[#fcfbfc]">
      {showNav ? (
        <>
          {navOpen ? (
            <button
              type="button"
              aria-label="إغلاق الأقسام"
              className="fixed inset-0 z-30 bg-burgundy-deep/40 md:hidden"
              onClick={() => setNavOpen(false)}
            />
          ) : null}
          <aside
            id="owner-nav"
            className={`${navOpen ? "flex" : "hidden md:flex"} fixed inset-y-0 start-0 z-40 w-64 flex-col border-e border-burgundy/10 bg-paper pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-detail`}
          >
            <div className="flex items-center gap-3 border-b border-burgundy/10 px-4 py-4">
              <BrandMark className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-burgundy-deep">لوحة المالك</p>
                {user.restaurant?.name ? (
                  <p className="truncate text-sm text-ink/55">{user.restaurant.name}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="إغلاق الأقسام"
                onClick={() => setNavOpen(false)}
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-burgundy hover:bg-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:hidden"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-3 pt-3">
              <SideNav value={visible} onChange={pickScreen} options={screens} />
            </div>
            <div className="mt-auto flex flex-col gap-2 border-t border-burgundy/10 p-3">
              <button
                type="button"
                onClick={onUnauthenticated}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-start gap-2 rounded-2xl px-3 text-sm font-medium text-ink/55 transition duration-300 hover:bg-foam hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <LogOut className="size-5 shrink-0" aria-hidden="true" />
                خروج
              </button>
            </div>
          </aside>
        </>
      ) : null}

      <div className={showNav ? "md:ps-64" : ""}>
      <header className="sticky top-0 z-20 border-b border-burgundy/5 bg-white pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-4 px-4 py-3 sm:min-h-[5rem] sm:px-8">
          {showNav ? (
            <button
              type="button"
              aria-expanded={navOpen}
              aria-controls="owner-nav"
              onClick={() => setNavOpen(true)}
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl text-burgundy ring-1 ring-burgundy/10 hover:bg-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:hidden"
            >
              <Menu className="size-5" />
              <span className="sr-only">فتح الأقسام</span>
            </button>
          ) : null}
          <BrandMark className={`h-10 w-10 sm:h-12 sm:w-12 ${showNav ? "md:hidden" : ""}`} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold text-burgundy-deep sm:text-2xl">
              {sectionTitle}
            </h1>
            {user.restaurant?.name ? (
              <p className={`truncate text-sm font-medium text-ink/50 ${showNav ? "md:hidden" : ""}`}>{user.restaurant.name}</p>
            ) : null}
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={showSharedQr}
              disabled={!user.restaurant?.slug}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-wash px-4 text-sm font-semibold text-gold-deep shadow-sm ring-1 ring-inset ring-gold/30 transition duration-300 hover:bg-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-40"
            >
              رمز المطعم
            </button>
            {showNav ? null : <HeaderButton onClick={onUnauthenticated}>تسجيل الخروج</HeaderButton>}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:gap-8 sm:px-8 sm:pt-8 sm:pb-12">
        {visible === "menu" ? (
          <RestaurantMenu
            token={token}
            onUnauthenticated={onUnauthenticated}
            onInactive={onInactive}
            onFeatureUnavailable={() => setMenuOff(true)}
          />
        ) : visible === "contact" ? (
          <OwnerContact
            token={token}
            restaurant={contact ? { ...user.restaurant, ...contact } : user.restaurant}
            onSaved={setContact}
            onUnauthenticated={onUnauthenticated}
            onInactive={onInactive}
          />
        ) : visible === "orders" ? (
          <PeriodPanel
            from={from}
            to={to}
            busy={busy}
            loaded={loaded}
            error={error}
            loading="يتم تحميل الطلبات..."
            onFrom={setFrom}
            onTo={setTo}
            onSubmit={handleSubmit}
          >
            {stats ? <OwnerOrders stats={stats} from={stats.from || from} to={stats.to || to} /> : null}
          </PeriodPanel>
        ) : visible === "reviews" ? (
          <PeriodPanel
            from={from}
            to={to}
            busy={busy}
            loaded={loaded}
            error={error}
            loading="يتم تحميل التقييمات..."
            onFrom={setFrom}
            onTo={setTo}
            onSubmit={handleSubmit}
          >
            {reviews ? (
              <OwnerReviews
                reviews={reviews}
                timeZone={stats?.timezone || timeZone}
                from={reviews.from || stats?.from || from}
                to={reviews.to || stats?.to || to}
              />
            ) : loaded && !error ? (
              <p className="rounded-2xl bg-ivory/80 px-4 py-3 text-sm text-ink/60">تعذر تحميل التقييمات.</p>
            ) : null}
          </PeriodPanel>
        ) : (
          <PeriodPanel
            from={from}
            to={to}
            busy={busy}
            loaded={loaded}
            error={error}
            loading="يتم تحميل الزبائن..."
            onFrom={setFrom}
            onTo={setTo}
            onSubmit={handleSubmit}
          >
            {stats ? <OwnerCustomers stats={stats} from={stats.from || from} to={stats.to || to} /> : null}
          </PeriodPanel>
        )}
      </main>
      <QrDialog qr={qr} onDismiss={() => setQr(null)} />
      </div>
    </div>
  );
}