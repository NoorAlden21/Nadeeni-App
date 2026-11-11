"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSafeReducedMotion } from "@/components/motion/use-reduced-motion";
import { PoweredBy } from "@/components/brand/powered-by";
import { OrderReview } from "@/components/customer/order-review";
import { PlayWhileWaiting } from "@/components/games/play-while-waiting";
import { IosInfoCard } from "@/components/motion/ios-info-card";
import { OrderNumber } from "@/components/motion/order-number";
import { PageMotion } from "@/components/motion/page-motion";
import { PressButton } from "@/components/motion/press-button";
import { ScrollHeader } from "@/components/motion/scroll-header";
import { StatusStepper } from "@/components/motion/status-stepper";
import { fadeUp } from "@/lib/motion";
import { apiFetch, restaurantIconSrc } from "@/lib/api/client";
import {
  customerCopy,
  isFinalStatus,
  publicErrorText,
  readOrderIcon,
  readOrderRestaurantSlug,
  rememberOrderSlug,
  rememberRestaurantSlug,
  vapidKeyBytes,
  visitorHeaders,
} from "@/lib/customer/public";
import { CustomerLoyalty } from "@/components/customer/customer-loyalty";
import { playReadyAlert, primeReadyAlert } from "@/lib/customer/ready-alert";
import { readStoredTheme, rememberRestaurantTheme } from "@/lib/theme/restaurant-theme";
import { useRestaurantTheme } from "@/components/theme/use-restaurant-theme";

function statusWords(status) {
  if (status === "collected") return customerCopy.collected;
  if (status === "cancelled") return customerCopy.cancelled;
  if (status === "uncollected") return customerCopy.uncollected;
  if (status === "expired") return customerCopy.expired;
  return "";
}

function ReadyMark({ animate }) {
  return (
    <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
      {animate
        ? [0, 0.4, 0.8].map((delay) => (
            <motion.span
              key={delay}
              aria-hidden="true"
              className="absolute size-24 rounded-full border-2 border-track-brand"
              initial={{ scale: 1, opacity: 0.65 }}
              animate={{ scale: [1, 1.85], opacity: [0.65, 0] }}
              transition={{ duration: 1.35, delay, ease: "easeOut", repeat: 2, repeatDelay: 0.45 }}
            />
          ))
        : null}
      <motion.span
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-track-brand text-track-on shadow-track-halo-lg"
        initial={animate ? { scale: 0.55, opacity: 0 } : false}
        animate={animate ? { scale: [0.55, 1.08, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <svg viewBox="0 0 24 24" className="h-12 w-12" aria-hidden="true">
          <motion.path
            d="M5 12.5 9.2 17 19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animate ? { pathLength: 0, opacity: 0 } : false}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: animate ? 0.12 : 0, ease: "easeOut" }}
          />
        </svg>
      </motion.span>
    </div>
  );
}

export function OrderStatus({ token }) {
  const reduceMotion = useSafeReducedMotion();
  const [order, setOrder] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pushNote, setPushNote] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [support, setSupport] = useState("unknown");
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [iconUrl, setIconUrl] = useState("");
  const [iphone, setIphone] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const seenStatus = useRef(null);
  const alerted = useRef(false);
  const gameWasOpen = useRef(false);
  const readySeen = useRef(false);
  const scrollerRef = useRef(null);
  const [bellTick, setBellTick] = useState(0);
  const [palette, setPalette] = useState(null);
  const theme = useRestaurantTheme(palette);

  useEffect(() => {
    setIphone(/iPhone/.test(navigator.userAgent));
    setIconUrl(readOrderIcon(token));
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const canPush =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    if (ios && !standalone) {
      setSupport("ios");
    } else if (!canPush) {
      setSupport("unavailable");
    } else {
      setSupport("ready");
    }
  }, [token]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return undefined;
    }

    function onReadyAgain(event) {
      if (event.data?.type !== "nadeeni-ready") {
        return;
      }
      playReadyAlert();
    }

    navigator.serviceWorker.addEventListener("message", onReadyAgain);
    return () => navigator.serviceWorker.removeEventListener("message", onReadyAgain);
  }, []);

  useEffect(() => {
    let stopped = false;
    let finished = false;
    let timer = 0;
    async function load() {
      try {
        const next = await apiFetch(`/public/orders/${encodeURIComponent(token)}`, {
          headers: visitorHeaders(),
        });
        if (stopped) {
          return;
        }
        const previous = seenStatus.current;
        seenStatus.current = next?.status ?? null;
        if (previous && previous !== "ready" && next?.status === "ready" && playReadyAlert()) {
          alerted.current = true;
        }
        setOrder(next);
        setIconUrl(
          (current) =>
            current || restaurantIconSrc(next?.icon_url) || readOrderIcon(token, next?.restaurant_name),
        );
        setError("");
        if (isFinalStatus(next?.status)) {
          finished = true;
        }
      } catch (requestError) {
        if (stopped) {
          return;
        }
        if (requestError.status === 404) {
          finished = true;
          setOrder(null);
        }
        setError(publicErrorText(requestError));
      } finally {
        if (!stopped) {
          setLoaded(true);
        }
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (stopped || finished) {
          return;
        }
        if (document.visibilityState === "visible") {
          load().finally(() => {
            if (!stopped && !finished) {
              schedule();
            }
          });
        } else {
          schedule();
        }
      }, 4000);
    }

    function onVisibilityChange() {
      if (document.visibilityState !== "visible" || stopped || finished) {
        return;
      }
      window.clearTimeout(timer);
      load().finally(() => {
        if (!stopped && !finished) {
          schedule();
        }
      });
    }

    load().finally(() => {
      if (!stopped && !finished) {
        schedule();
      }
    });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token]);

  useEffect(() => {
    if (!order) {
      return;
    }
    const next = readOrderRestaurantSlug(token, order.restaurant_name, order.slug);
    if (next) {
      rememberOrderSlug(token, next);
      rememberRestaurantSlug(order.restaurant_name, next);
    }
    setRestaurantSlug(next);
  }, [token, order?.restaurant_name, order?.slug]);

  useEffect(() => {
    const name = typeof order?.restaurant_name === "string" ? order.restaurant_name : "";
    const slug = readOrderRestaurantSlug(token, name, order?.slug);
    const stored = name ? readStoredTheme(name) : null;
    if (stored && (stored.primary_color || stored.secondary_color)) {
      setPalette(stored);
    }
    if (!slug) return undefined;

    let stopped = false;
    apiFetch(`/public/restaurants/${encodeURIComponent(slug)}`)
      .then((restaurant) => {
        if (stopped || !restaurant || typeof restaurant !== "object") return;
        rememberRestaurantTheme(restaurant);
        if (name && name !== restaurant.name && name !== restaurant.name_en) {
          rememberRestaurantTheme({ ...restaurant, name });
        }
        setPalette({
          primary_color: restaurant.primary_color ?? null,
          secondary_color: restaurant.secondary_color ?? null,
        });
      })
      .catch(() => {});

    return () => {
      stopped = true;
    };
  }, [token, order?.restaurant_name, order?.slug]);

  useEffect(() => {
    if (order?.status && order.status !== "waiting" && gameWasOpen.current) {
      gameWasOpen.current = false;
      window.scrollTo(0, 0);
    }
  }, [order?.status]);

  useEffect(() => {
    if (order?.status === "ready") {
      if (!readySeen.current) {
        readySeen.current = true;
        setBellTick((value) => value + 1);
      }
      return;
    }
    readySeen.current = false;
  }, [order?.status]);

  function confirmNotice() {
    const permissionRequest =
      typeof Notification !== "undefined" && Notification.permission === "default"
        ? Notification.requestPermission()
        : null;
    const registrationRequest =
      "serviceWorker" in navigator ? navigator.serviceWorker.register("/sw.js") : null;

    setNoticeOpen(false);
    void enableAlerts(permissionRequest, registrationRequest);
  }

  async function enableAlerts(permissionRequest, registrationRequest) {
    await primeReadyAlert();
    if (order?.status === "ready" && !alerted.current && playReadyAlert()) {
      alerted.current = true;
    }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const canPush =
      Boolean(registrationRequest) &&
      "PushManager" in window &&
      "Notification" in window &&
      Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

    if ((ios && !standalone) || !canPush || pushBusy || !order || isFinalStatus(order.status)) {
      registrationRequest?.catch(() => {});
      return;
    }

    setPushBusy(true);
    setPushNote("");
    try {
      const permission = permissionRequest ? await permissionRequest : Notification.permission;
      const registration = await registrationRequest;
      if (permission !== "granted" || !registration) {
        setPushNote(customerCopy.pushUnavailable);
        return;
      }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyBytes(key),
        }));

      await apiFetch(`/public/orders/${encodeURIComponent(token)}/push-subscriptions`, {
        method: "POST",
        headers: visitorHeaders(),
        body: subscription.toJSON(),
      });
      setPushNote(customerCopy.pushAsked);
    } catch (requestError) {
      if (requestError?.status) {
        setPushNote(publicErrorText(requestError));
      } else {
        setPushNote(customerCopy.pushUnavailable);
      }
    } finally {
      setPushBusy(false);
    }
  }

  if (!loaded) {
    return (
      <PageMotion>
      <main style={theme} className="order-track flex min-h-dvh flex-col items-center justify-center bg-track-bg px-4 text-track-text">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 rounded-full border-[3px] border-track-line border-t-track-deep animate-spin" />
            <p className="text-[14px] font-medium text-track-muted">{customerCopy.opening}</p>
          </div>
        </div>
      </main>
      </PageMotion>
    );
  }

  if (!order) {
    return (
      <PageMotion>
      <main style={theme} className="order-track flex min-h-dvh items-center justify-center bg-track-bg px-4 py-10 text-track-text">
        <div className="flex w-full max-w-[430px] flex-col items-center rounded-track border border-track-line bg-track-surface px-5 py-6 text-center shadow-track">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-track-soft">
            <svg className="size-8 text-track-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[18px] font-bold leading-relaxed text-track-ink">
            {error || customerCopy.linkMissing}
          </p>
        </div>
      </main>
      </PageMotion>
    );
  }

  const ready = order.status === "ready";
  const collected = order.status === "collected";
  const finalText = statusWords(order.status);
  const showPush = !isFinalStatus(order.status);
  const pushText =
    pushNote ||
    (support === "ios" ? customerCopy.iosPush : support === "unavailable" ? customerCopy.pushUnavailable : "");

  // تحديد الخطوة الفعالة في التسلسل
  let activeStep = 1;
  if (ready) activeStep = 2;
  if (collected || reviewed) activeStep = 3;

  // إخفاء التسلسل في حال الإلغاء أو انتهاء الصلاحية
  const showStepper =
    order.status !== "cancelled" && order.status !== "expired" && order.status !== "uncollected";

  const showIosCard = showPush && !ready && support === "ios" && !pushNote;

  return (
    <PageMotion>
    <main
      ref={scrollerRef}
      style={theme}
      className="order-track relative flex h-dvh flex-col overflow-y-auto bg-track-bg px-4 text-track-text"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-track-brand opacity-10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[430px] flex-1 flex-col items-center gap-6 pb-16 pt-4 text-center">
        
        <ScrollHeader scrollerRef={scrollerRef} ready={ready} iconUrl={iconUrl} name={order.restaurant_name} />

        {/* القسم الرئيسي للبطاقة */}
        <motion.div
          className="w-full rounded-track border border-track-line bg-track-surface px-5 py-6 shadow-track"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
        >
          {showStepper ? <StatusStepper activeStep={activeStep} ready={ready} bellTick={bellTick} /> : null}
          
          <AnimatePresence mode="wait" initial={false}>
            {ready ? (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col items-center"
              >
                <ReadyMark animate={!reduceMotion} />
                <h1 aria-live="polite" className="mt-4 text-[2rem] font-extrabold leading-none text-track-ink">
                  {customerCopy.ready}
                </h1>
                <p className="mt-2 text-[15px] font-medium text-track-muted">{customerCopy.pickup}</p>
                <div className="mt-6 w-full rounded-track-md border border-dashed border-track-strong bg-track-soft px-4 py-6">
                  <p className="text-[13px] font-medium text-track-muted">رقم الطلب</p>
                  <OrderNumber
                    value={order.order_number}
                    status={order.status}
                    className="mt-2 font-sans text-[4rem] font-extrabold leading-none tracking-[-0.04em] text-track-deep tabular-nums min-[390px]:text-[4.5rem]"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={order.status}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col items-center"
              >
                <div className="w-full rounded-track-md border border-dashed border-track-strong bg-track-soft px-4 py-6">
                  <p className="text-[13px] font-medium text-track-muted">رقم طلبك</p>
                  <OrderNumber
                    value={order.order_number}
                    status={order.status}
                    className="mt-2 font-sans text-[4rem] font-extrabold leading-none tracking-[-0.04em] text-track-deep tabular-nums min-[390px]:text-[4.5rem]"
                  />
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={finalText || customerCopy.preparing}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    aria-live="polite"
                  >
                    {finalText ? (
                      <h1 className="mt-6 text-[18px] font-bold text-track-ink">{finalText}</h1>
                    ) : (
                      <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-track-soft px-4 py-1.5 text-[13px] font-bold text-track-deep">
                        <span className="size-2 rounded-full bg-track-brand animate-pulse motion-reduce:animate-none" />
                        {customerCopy.preparing}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
          {order.status === "waiting" ? (
            <PlayWhileWaiting
              orderNumber={order.order_number}
              onOpenChange={(open) => {
                gameWasOpen.current = open;
              }}
            />
          ) : null}
        </motion.div>

        {showIosCard ? <IosInfoCard text={customerCopy.iosPush} /> : null}
        {showPush && pushText && !ready && !showIosCard ? (
          <div className="flex w-full items-start gap-3 rounded-track-md border border-track-line bg-track-soft p-4 text-right">
            <svg className="mt-0.5 size-4 shrink-0 text-track-deep" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-[13px] font-medium leading-6 text-track-text">{pushText}</p>
          </div>
        ) : null}

        {error && order ? (
          <div className="w-full rounded-track-md border border-track-strong bg-track-soft p-4 text-[14px] font-bold text-track-deep">
            {error}
          </div>
        ) : null}

        {restaurantSlug ? (
          <CustomerLoyalty
            slug={restaurantSlug}
            stampAdded={order.loyalty_stamp_added === true}
          />
        ) : null}

        <OrderReview token={token} status={order.status} onReviewed={() => setReviewed(true)} />
      </div>
      <PoweredBy className="relative z-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]" />
      
      {noticeOpen && !isFinalStatus(order.status) ? (
        <ArrivalNotice iphone={iphone} theme={theme} onConfirm={confirmNotice} />
      ) : null}
    </main>
    </PageMotion>
  );
}

function ArrivalNotice({ iphone, theme, onConfirm }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div style={theme} className="order-track fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,16,22,0.45)] px-4 text-track-text">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="silent-title"
        className="w-full max-w-[430px] rounded-track border border-track-line bg-track-surface px-5 py-6 text-center shadow-track"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-track-md bg-track-soft text-track-deep">
          <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31" />
            <path strokeLinecap="round" d="M4 4l16 16" />
          </svg>
        </div>
        <h2 id="silent-title" className="mt-4 text-[20px] font-bold text-track-ink">
          {customerCopy.silentTitle}
        </h2>
        <p className="mt-2 text-[15px] leading-7 text-track-text">{customerCopy.silentBody}</p>
        <p className="mt-2 text-[13px] leading-6 text-track-muted">{customerCopy.silentPermission}</p>
        {iphone ? <p className="mt-3 text-[13px] leading-6 text-track-deep">{customerCopy.keepOpen}</p> : null}
        <PressButton
          onClick={onConfirm}
          className="mt-6 inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-track-md bg-track-brand text-[15px] font-bold text-track-on shadow-track-press transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(255,194,14,0.45)]"
        >
          {customerCopy.gotIt}
        </PressButton>
      </div>
    </div>,
    document.body,
  );
}