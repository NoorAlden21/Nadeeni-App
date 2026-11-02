"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PoweredBy } from "@/components/brand/powered-by";
import { OrderReview } from "@/components/customer/order-review";
import { apiFetch } from "@/lib/api/client";
import {
  customerCopy,
  isFinalStatus,
  publicErrorText,
  readOrderIcon,
  readVisitorId,
  vapidKeyBytes,
} from "@/lib/customer/public";
import { playReadyAlert, primeReadyAlert } from "@/lib/customer/ready-alert";

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
      {animate ? (
        [0, 0.22, 0.44].map((delay) => (
          <motion.span
            key={delay}
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-[2px] border-gold"
            initial={{ scale: 1, opacity: 0.75 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.6, delay, ease: "easeOut" }}
          />
        ))
      ) : null}
      <motion.span
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-gold-deep to-gold shadow-[0_0_40px_rgba(205,166,73,0.6)] text-burgundy-deep"
        initial={animate ? { scale: 0.5, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <svg viewBox="0 0 24 24" className="h-12 w-12" aria-hidden="true">
          <path
            d="M5 12.5 9.2 17 19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.span>
    </div>
  );
}

export function OrderStatus({ token }) {
  const reduceMotion = useReducedMotion();
  const [order, setOrder] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pushNote, setPushNote] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [support, setSupport] = useState("unknown");
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [iconUrl, setIconUrl] = useState("");
  const [iphone, setIphone] = useState(false);
  const seenStatus = useRef(null);
  const alerted = useRef(false);

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
    let stopped = false;
    let finished = false;
    let timer = 0;
    const visitorId = readVisitorId();

    async function load() {
      try {
        const next = await apiFetch(`/public/orders/${encodeURIComponent(token)}`, {
          headers: visitorId ? { "X-Visitor-Id": visitorId } : undefined,
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
        setIconUrl((current) => current || next?.icon_url || readOrderIcon(token, next?.restaurant_name));
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

  async function confirmNotice() {
    await primeReadyAlert();
    if (order?.status === "ready" && !alerted.current && playReadyAlert()) {
      alerted.current = true;
    }
    setNoticeOpen(false);
    if (support === "ready") {
      allowPush();
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }

  async function allowPush() {
    if (pushBusy || support !== "ready" || !order || isFinalStatus(order.status)) {
      return;
    }

    setPushBusy(true);
    setPushNote("");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
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

      const visitorId = readVisitorId();
      await apiFetch(`/public/orders/${encodeURIComponent(token)}/push-subscriptions`, {
        method: "POST",
        headers: visitorId ? { "X-Visitor-Id": visitorId } : undefined,
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
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-4">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 rounded-full border-[3px] border-burgundy/20 border-t-burgundy/80 animate-spin" />
            <p className="text-sm font-semibold text-burgundy-deep/60">{customerCopy.opening}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ivory px-4 py-10">
        <div className="flex w-full max-w-sm flex-col items-center rounded-[2rem] bg-white p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-burgundy/5">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-ink/5">
            <svg className="h-8 w-8 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg font-bold leading-relaxed text-burgundy-deep">
            {error || customerCopy.linkMissing}
          </p>
        </div>
      </main>
    );
  }

  const ready = order.status === "ready";
  const collected = order.status === "collected";
  const finalText = statusWords(order.status);
  const showPush = !isFinalStatus(order.status);

  // تحديد الخطوة الفعالة في التسلسل
  let activeStep = 1;
  if (ready) activeStep = 2;
  if (collected) activeStep = 3;

  // إخفاء التسلسل في حال الإلغاء أو انتهاء الصلاحية
  const showStepper =
    order.status !== "cancelled" && order.status !== "expired" && order.status !== "uncollected";

  return (
    <main
      className={`relative flex min-h-dvh flex-col overflow-x-clip px-4 transition-colors duration-1000 ease-in-out ${
        ready ? "bg-burgundy text-white" : "bg-ivory text-ink"
      }`}
    >
      {/* إضاءات خلفية ناعمة */}
      {ready ? (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-gold/20 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-burgundy-deep/40 blur-[100px]" />
        </div>
      ) : (
        <div className="absolute top-1/2 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/5 blur-[100px] pointer-events-none" />
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center py-10 text-center">
        
        {/* رأس الصفحة (اسم المطعم) */}
        <div className={`mb-6 flex items-center gap-2 rounded-full px-5 py-2 backdrop-blur-sm ${ready ? "bg-black/10 border border-white/10" : "bg-white/50 border border-burgundy/5 shadow-sm"}`}>
          {iconUrl ? (
            <img src={iconUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : null}
          <p className={`text-sm font-bold ${ready ? "text-white/90" : "text-burgundy-deep"}`}>
            {order.restaurant_name}
          </p>
        </div>

        {/* القسم الرئيسي للبطاقة */}
        <div className={`w-full rounded-[2.5rem] p-8 sm:p-10 ${
          ready 
            ? "bg-transparent" 
            : "bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-burgundy/5"
        }`}>
          
          {/* شريط التسلسل الذكي (Progress Stepper) */}
          {showStepper && (
            <div className="mb-12 w-full max-w-[16rem] mx-auto">
              <div className="relative flex justify-between">
                {/* خط الخلفية */}
                <div className={`absolute top-5 right-5 left-5 h-[2px] z-0 ${ready ? 'bg-white/20' : 'bg-burgundy/10'}`} />
                
                {/* خط التقدم */}
                <div 
                  className="absolute top-5 right-5 h-[2px] bg-gold z-0 transition-all duration-1000 ease-out"
                  style={{ width: activeStep === 1 ? '0%' : activeStep === 2 ? '50%' : '100%' }}
                />

                {/* الخطوة 1: التحضير */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-500 ${
                    activeStep === 1 ? 'bg-burgundy text-white' : 'bg-gold text-burgundy-deep shadow-sm'
                  }`}>
                    {activeStep === 1 && (
                      <div className="absolute inset-0 rounded-full border-2 border-burgundy opacity-75 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    )}
                    {activeStep > 1 ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span className={`absolute -bottom-6 text-xs font-bold whitespace-nowrap ${
                    activeStep === 1 ? 'text-burgundy-deep' : (ready ? 'text-white' : 'text-ink/60')
                  }`}>التحضير</span>
                </div>

                {/* الخطوة 2: جاهز */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-500 ${
                    activeStep === 2 ? 'bg-gold text-burgundy-deep shadow-[0_0_15px_rgba(205,166,73,0.5)]' : 
                    activeStep > 2 ? 'bg-gold text-white shadow-sm' : 
                    'border-2 bg-white/50 ' + (ready ? 'border-white/30 text-white/50' : 'border-burgundy/15 text-burgundy/30')
                  }`}>
                    {activeStep === 2 && (
                      <div className="absolute inset-0 rounded-full border-2 border-gold opacity-75 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    )}
                    {activeStep > 2 ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                    )}
                  </div>
                  <span className={`absolute -bottom-6 text-xs font-bold whitespace-nowrap ${
                    activeStep === 2 ? 'text-white' : 
                    activeStep > 2 ? 'text-ink/60' : 
                    (ready ? 'text-white/50' : 'text-ink/40')
                  }`}>جاهز</span>
                </div>

                {/* الخطوة 3: الاستلام */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-500 ${
                    activeStep === 3 ? 'bg-burgundy text-white shadow-md' : 
                    'border-2 bg-white/50 ' + (ready ? 'border-white/30 text-white/50' : 'border-burgundy/15 text-burgundy/30')
                  }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <span className={`absolute -bottom-6 text-xs font-bold whitespace-nowrap ${
                    activeStep === 3 ? 'text-burgundy-deep' : (ready ? 'text-white/50' : 'text-ink/40')
                  }`}>مكتمل</span>
                </div>

              </div>
            </div>
          )}
          
          {/* محتوى البطاقة (رقم الطلب والرسائل) */}
          {ready ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <ReadyMark animate={!reduceMotion} />
              <h1 className="mt-8 font-display text-4xl font-black tracking-tight text-white sm:text-5xl drop-shadow-md">
                {customerCopy.ready}
              </h1>
              
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-lg font-medium text-white/80">{customerCopy.pickup}</p>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-gold/20 px-6 py-3 border border-gold/30 backdrop-blur-md">
                  <span className="text-sm font-semibold text-gold-deep">رقم الطلب</span>
                  <span dir="ltr" className="font-sans text-3xl font-bold text-gold">{order.order_number}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="mb-1 text-sm font-bold text-ink/40">رقم طلبك</div>
              <p dir="ltr" className="font-sans text-6xl font-black tracking-wider text-burgundy-deep">
                {order.order_number}
              </p>
              
              {finalText ? (
                <div className="mt-8 rounded-xl bg-ink/5 px-6 py-3 border border-burgundy/5">
                  <h1 className="font-display text-2xl font-bold text-burgundy-deep">{finalText}</h1>
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <p className="relative inline-flex items-center gap-2 rounded-full bg-gold/15 px-5 py-2 text-sm font-bold text-gold-deep border border-gold/20">
                      {customerCopy.preparing}
                    </p>
                  </div>
                  <p className="mt-5 text-xs font-semibold text-ink/40 bg-ivory rounded-lg px-4 py-2 border border-burgundy/5">
                    {customerCopy.refreshing}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* قسم الإشعارات (Push Notifications) */}
        {showPush ? (
          <div className="mt-8 w-full">
            {support === "ready" ? (
              <button
                type="button"
                onClick={allowPush}
                disabled={pushBusy}
                className={`group relative inline-flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl px-6 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${
                  ready 
                    ? "bg-white text-burgundy-deep hover:bg-ivory shadow-lg" 
                    : "bg-burgundy-deep text-white hover:bg-burgundy shadow-md hover:shadow-lg"
                }`}
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {pushBusy ? "جاري التفعيل..." : customerCopy.allowPush}
              </button>
            ) : null}
            
            <div className={`mt-4 flex items-start gap-2 text-right text-xs font-medium leading-relaxed ${ready ? "text-white/60" : "text-ink/50"}`}>
              {(pushNote || support === "ios" || support === "unavailable") && (
                <svg className="mt-0.5 h-4 w-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              )}
              <p>
                {pushNote || (support === "ios" ? customerCopy.iosPush : support === "unavailable" ? customerCopy.pushUnavailable : "")}
              </p>
            </div>
          </div>
        ) : null}

        {error && order ? (
          <div className={`mt-6 rounded-xl p-3 text-sm font-bold border ${ready ? "bg-white/10 text-gold border-gold/20" : "bg-foam text-burgundy border-burgundy/10"}`}>
            {error}
          </div>
        ) : null}

        <OrderReview token={token} status={order.status} />
      </div>
      <PoweredBy className="relative z-10 pb-[max(1rem,env(safe-area-inset-bottom))]" />
      
      {noticeOpen && !isFinalStatus(order.status) ? (
        <ArrivalNotice iphone={iphone} onConfirm={confirmNotice} />
      ) : null}

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </main>
  );
}

function ArrivalNotice({ iphone, onConfirm }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-burgundy-deep/45 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="silent-title"
        className="w-full max-w-sm rounded-[1.75rem] bg-paper px-6 py-7 text-center shadow-[0_24px_60px_-24px_rgba(74,4,24,0.55)] ring-1 ring-burgundy/10"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-foam text-burgundy">
          <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31" />
            <path strokeLinecap="round" d="M4 4l16 16" />
          </svg>
        </div>
        <h2 id="silent-title" className="mt-4 font-display text-2xl font-semibold text-burgundy-deep">
          {customerCopy.silentTitle}
        </h2>
        <p className="mt-2 text-base leading-7 text-ink/70">{customerCopy.silentBody}</p>
        <p className="mt-2 text-sm leading-6 text-ink/60">{customerCopy.silentPermission}</p>
        {iphone ? <p className="mt-3 text-sm leading-6 text-burgundy">{customerCopy.keepOpen}</p> : null}
        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-burgundy font-semibold text-ivory"
        >
          {customerCopy.gotIt}
        </button>
      </div>
    </div>
  );
}