"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PoweredBy } from "@/components/brand/powered-by";
import { ActionButton } from "@/components/cashier/action-button";
import { PublicMenu } from "@/components/customer/public-menu";
import { RestaurantContact } from "@/components/customer/restaurant-contact";
import { apiFetch, restaurantIconSrc } from "@/lib/api/client";
import { readPublicMenu } from "@/lib/customer/public-menu";
import { readFeatures } from "@/lib/features";
import {
  customerCopy,
  orderNumberProblem,
  publicErrorText,
  readVisitorId,
  rememberOrderIcon,
  rememberRestaurantIcon,
} from "@/lib/customer/public";

export function RestaurantEntry({ slug }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [errorTick, setErrorTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState({ banners: [], categories: [] });
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [menuProblem, setMenuProblem] = useState("");
  const [features, setFeatures] = useState({ pager: false, menu: false, ordering: false, kitchen: false });
  const [browsing, setBrowsing] = useState(false);
  const [savedOrder, setSavedOrder] = useState("");
  const [contact, setContact] = useState(null);

  useEffect(() => {
    let stopped = false;

    setBrowsing(false);
    setMenu({ banners: [], categories: [] });
    setMenuLoaded(false);
    setMenuProblem("");
    setFeatures({ pager: false, menu: false, ordering: false, kitchen: false });
    setContact(null);

    if (typeof window !== "undefined") {
      const last = localStorage.getItem(`nadeeni_last_order_${slug}`);
      if (last) setSavedOrder(last);
    }

    apiFetch(`/public/restaurants/${encodeURIComponent(slug)}`)
      .then(async (restaurant) => {
        if (stopped) return;
        const icon = restaurantIconSrc(restaurant?.icon_url);
        setName(restaurant?.name || "");
        setIconUrl(icon);
        setContact(restaurant);
        rememberRestaurantIcon(restaurant?.name, icon);

        const flags = readFeatures(restaurant);
        if (!flags.menu) {
          setFeatures(flags);
          setMenuLoaded(true);
          return;
        }

        try {
          const payload = await apiFetch(`/public/restaurants/${encodeURIComponent(slug)}/menu`);
          if (stopped) return;
          setMenu(readPublicMenu(payload));
          setFeatures(flags);
        } catch (menuError) {
          if (stopped) return;
          if (menuError.status === 404) {
            setFeatures({ ...flags, menu: false });
            setMenu({ banners: [], categories: [] });
          } else {
            setFeatures(flags);
            setMenuProblem(publicErrorText(menuError, customerCopy.restaurantMissing));
          }
        } finally {
          if (!stopped) setMenuLoaded(true);
        }
      })
      .catch((requestError) => {
        if (stopped) return;
        if (requestError.status === 404) {
          setMissing(true);
          return;
        }
        showError(publicErrorText(requestError, customerCopy.restaurantMissing));
      })
      .finally(() => {
        if (!stopped) setLoaded(true);
      });

    return () => {
      stopped = true;
    };
  }, [slug]);

  function statusPath(result) {
    if (result?.url) {
      try {
        const parsed = new URL(result.url, window.location.origin);
        if (parsed.pathname.startsWith("/o/")) {
          return `${parsed.pathname}${parsed.search}`;
        }
      } catch {
        // The token below still opens this site's status page.
      }
    }
    if (result?.token) return `/o/${encodeURIComponent(result.token)}`;
    return "";
  }

  function showError(text) {
    setError(text);
    setErrorTick((tick) => tick + 1);
  }

  async function handleSubmit(event, overrideNumber = null) {
    if (event) event.preventDefault();
    if (busy || !features.pager) return;

    const targetNumber = overrideNumber || number;
    const problem = orderNumberProblem(targetNumber);
    if (problem) {
      showError(problem);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const visitorId = readVisitorId();
      const result = await apiFetch(`/public/restaurants/${encodeURIComponent(slug)}/register`, {
        method: "POST",
        body: {
          order_number: targetNumber.trim(),
          ...(visitorId ? { visitor_id: visitorId } : {}),
        },
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(`nadeeni_last_order_${slug}`, targetNumber.trim());
        rememberOrderIcon(result?.token, iconUrl);
      }

      const nextPath = statusPath(result);
      if (nextPath) {
        router.push(nextPath);
      }
    } catch (requestError) {
      showError(publicErrorText(requestError, customerCopy.orderUnavailable));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <Screen>
        <p className="text-base font-medium text-burgundy-deep">{customerCopy.opening}</p>
      </Screen>
    );
  }

  if (missing) {
    return (
      <Screen>
        <p className="max-w-md text-center text-lg font-semibold leading-8 text-burgundy-deep">
          {customerCopy.restaurantMissing}
        </p>
      </Screen>
    );
  }

  if (features.menu && !features.pager) {
    return (
      <Screen align="start">
        {menuProblem ? (
          <p role="alert" className="text-center text-base font-medium text-burgundy-deep">
            {menuProblem}
          </p>
        ) : (
          <PublicMenu
            name={name}
            iconUrl={iconUrl}
            contact={contact}
            banners={menu.banners}
            categories={menu.categories}
            loading={!menuLoaded}
          />
        )}
      </Screen>
    );
  }

  if (!features.pager) {
    return (
      <Screen>
        <div className="flex flex-col items-center text-center">
          <p className="text-xl font-extrabold text-gold-deep sm:text-2xl">أهلاً بك في مطعم</p>
          {name ? (
            <div className="mt-3 flex items-center gap-3">
              {iconUrl ? (
                <img src={iconUrl} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-burgundy/10 sm:h-14 sm:w-14" />
              ) : null}
              <h1 className="max-w-full font-display text-4xl font-bold wrap-break-word text-burgundy-deep sm:text-5xl">
                {name}
              </h1>
            </div>
          ) : null}
          <RestaurantContact contact={contact} className="justify-center" />
        </div>
      </Screen>
    );
  }

  if (browsing && features.menu) {
    return (
      <Screen align="start">
        {menuProblem ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p role="alert" className="text-base font-medium text-burgundy-deep">{menuProblem}</p>
            <ActionButton variant="quiet" onClick={() => setBrowsing(false)}>
              {customerCopy.backToNumber}
            </ActionButton>
          </div>
        ) : (
          <PublicMenu
            name={name}
            iconUrl={iconUrl}
            contact={contact}
            banners={menu.banners}
            categories={menu.categories}
            loading={!menuLoaded}
            onBack={() => setBrowsing(false)}
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p
            key={errorTick}
            role="alert"
            className="pointer-events-auto w-full max-w-md rounded-2xl bg-foam px-4 py-3 text-center text-sm font-medium leading-6 text-burgundy shadow-[0_18px_40px_-20px_rgba(74,4,24,0.55)] ring-1 ring-burgundy/15 motion-safe:animate-shake"
          >
            {error}
          </p>
        </div>
      ) : null}
      <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-16">
        
        {/* القسم الأيمن / العلوي */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
          <div className="mb-8 flex flex-col items-center lg:mb-10 lg:items-start">
            <p className="text-xl font-extrabold text-gold-deep sm:text-2xl">أهلاً بك في مطعم</p>
            {name ? (
              <div className="mt-3 flex items-center gap-3">
                {iconUrl ? (
                  <img src={iconUrl} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-burgundy/10 sm:h-14 sm:w-14" />
                ) : null}
                <h1 className="max-w-full font-display text-4xl font-bold wrap-break-word text-burgundy-deep sm:text-5xl lg:text-6xl">
                  {name}
                </h1>
              </div>
            ) : null}
            <RestaurantContact contact={contact} className="justify-center lg:justify-start" />
          </div>

          {/* تسلسل النظام (Progress Stepper) بدلاً من الفاتورة */}
          <div className="mb-8 w-full max-w-[18rem] sm:max-w-xs lg:mb-12">
            <div className="relative grid grid-cols-3">
              <div className="absolute top-5 right-[calc(100%/6)] left-[calc(100%/6)] z-0 h-[2px] bg-burgundy/10" />
              <div className="absolute top-5 right-[calc(100%/6)] z-0 h-[2px] w-[calc(100%/3)] bg-gold" />

              {/* الخطوة الأولى: مسح الرمز (تمت) */}
              <div className="relative z-10 flex flex-col items-center gap-2 opacity-60">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-white shadow-sm transition-transform hover:scale-105">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-ink/70">مسح الرمز</span>
              </div>

              {/* الخطوة الثانية: إدخال الرقم (الحالية - مع أنيميشن) */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-burgundy text-white">
                  {/* تأثير النبض (Ping) */}
                  <div className="absolute inset-0 rounded-full border-2 border-burgundy opacity-75 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                  </svg>
                </div>
                <span className="text-xs font-extrabold text-burgundy-deep">إدخال الرقم</span>
              </div>

              {/* الخطوة الثالثة: الاستلام (قيد الانتظار) */}
              <div className="relative z-10 flex flex-col items-center gap-2 opacity-40">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-burgundy/20 bg-white text-burgundy/40">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-ink/60">تتبع الطلب</span>
              </div>
            </div>
          </div>

          <p className="mt-3 max-w-md text-base leading-7 text-ink/70 sm:text-lg">
            اكتبوا رقم الطلب كما سجّله الكاشير.
          </p>
        </div>

        {/* القسم الأيسر / السفلي (الفورم) */}
        <div className="flex w-full flex-col gap-5 rounded-[1.75rem] bg-paper p-5 ring-1 ring-burgundy/10 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
          <form onSubmit={(e) => handleSubmit(e)} className="flex flex-col gap-5 relative z-10">
            <div>
              <label htmlFor="order-number" className="mb-3 block text-center text-sm font-semibold text-burgundy-deep lg:text-start">
                رقم الطلب
              </label>
              <div className="rounded-2xl bg-ivory px-3 ring-1 ring-burgundy/15 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-gold sm:px-5">
                <input
                  id="order-number"
                  name="order_number"
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  autoComplete="off"
                  enterKeyHint="go"
                  placeholder="0047"
                  value={number}
                  onChange={(event) => {
                    setNumber(event.target.value);
                    setError("");
                  }}
                  className="h-16 w-full min-w-0 overflow-x-auto bg-transparent text-center font-sans text-3xl font-semibold tracking-[0.12em] text-burgundy-deep outline-none placeholder:text-xl placeholder:font-medium placeholder:tracking-normal placeholder:text-ink/25 sm:h-20 sm:text-4xl lg:h-24 lg:text-5xl"
                />
              </div>
             
            </div>

            <ActionButton type="submit" size="lg" disabled={busy} className="w-full shadow-sm hover:shadow-md transition-shadow">
              {busy ? "جاري التحقق..." : "تابع طلبي"}
            </ActionButton>
          </form>

          {features.menu && !menuProblem ? (
            <ActionButton
              variant="quiet"
              className="w-full"
              onClick={() => {
                setError("");
                window.scrollTo(0, 0);
                setBrowsing(true);
              }}
            >
              {customerCopy.browseMenu}
            </ActionButton>
          ) : null}
          {menuProblem ? (
            <p role="alert" className="text-center text-sm font-medium text-burgundy">
              {menuProblem}
            </p>
          ) : null}

          {savedOrder && !number && !busy && (
            <div className="mt-1 flex flex-col items-center border-t border-burgundy/5 pt-4 relative z-10">
              <p className="mb-2 text-xs font-medium text-ink/50">هل تبحث عن طلبك السابق؟</p>
              <button 
                onClick={() => handleSubmit(null, savedOrder)}
                className="flex items-center gap-2 rounded-xl bg-gold/10 px-4 py-2 text-sm font-bold text-gold-deep transition hover:bg-gold/20"
              >
                <span>متابعة الطلب رقم {savedOrder}</span>
                <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </Screen>
  );
}

function Screen({ children, align = "center" }) {
  return (
    <main className={`flex min-h-dvh flex-col bg-ivory px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [overflow-anchor:none] sm:px-8 lg:px-12 ${align === "start" ? "overflow-x-visible pt-[max(0.75rem,env(safe-area-inset-top))]" : "overflow-x-clip pt-[max(2rem,env(safe-area-inset-top))]"}`}>
      <div className={`${align === "start" ? "" : "my-auto"} w-full max-w-5xl self-center`}>{children}</div>

      {align === "center" ? <PoweredBy className="text-ink/70" /> : null}
    </main>
  );
}