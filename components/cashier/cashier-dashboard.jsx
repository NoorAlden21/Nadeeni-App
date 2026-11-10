"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { CancelDialog } from "@/components/cashier/cancel-dialog";
import { OrderComposer } from "@/components/cashier/order-composer";
import { LoyaltyRedeem } from "@/components/cashier/loyalty-redeem";
import { OrderLane } from "@/components/cashier/order-lane";
import { QrDialog } from "@/components/cashier/qr-dialog";
import { UncollectDialog } from "@/components/cashier/uncollect-dialog";
import { RestaurantMenu } from "@/components/menu/restaurant-menu";
import { SideNav } from "@/components/menu/screen-switch";
import { useRestaurantTheme } from "@/components/theme/use-restaurant-theme";
import { Bell, CircleCheck, Clock3, LogOut, Menu, QrCode, X } from "lucide-react";
import {
  cashierCopy,
  isDuplicateNumber,
  mergeOrder,
  orderNumberErrorText,
  staffErrorText,
} from "@/lib/cashier/orders";
import { isFeatureUnavailable, readFeatures } from "@/lib/features";

function HeaderButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 text-sm font-medium text-ink/55 underline-offset-4 transition duration-300 hover:text-burgundy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
    >
      {children}
    </button>
  );
}

export function CashierDashboard({ token, user, onUnauthenticated, onInactive }) {
  const [orders, setOrders] = useState([]);
  const [delivered, setDelivered] = useState(0);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState(null);
  const [listError, setListError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [now, setNow] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [uncollectTarget, setUncollectTarget] = useState(null);
  const [uncollecting, setUncollecting] = useState(false);
  const [qr, setQr] = useState(null);
  const [screen, setScreen] = useState("orders");
  const [navOpen, setNavOpen] = useState(false);
  const [pagerOff, setPagerOff] = useState(false);
  const [menuOff, setMenuOff] = useState(false);
  const [loyaltyOff, setLoyaltyOff] = useState(false);
  const onUnauthenticatedRef = useRef(onUnauthenticated);
  const onInactiveRef = useRef(onInactive);
  const busyIds = useRef(new Set());
  const theme = useRestaurantTheme(user?.restaurant);
  const timeZone = user.restaurant?.timezone || "Asia/Damascus";
  const features = readFeatures(user.restaurant);
  const pager = features.pager && !pagerOff;
  const menuOn = features.menu && !menuOff;
  const loyaltyOn = features.loyalty && !loyaltyOff;
  const screens = [
    pager ? { id: "orders", label: "الطلبات" } : null,
    menuOn ? { id: "menu", label: "القائمة" } : null,
    loyaltyOn ? { id: "loyalty", label: "تسليم مكافأة" } : null,
  ].filter(Boolean);
  const visible = screens.some((item) => item.id === screen) ? screen : screens[0]?.id || "none";
  const showNav = screens.length > 1;
  const sectionTitle = screens.find((item) => item.id === visible)?.label || "لوحة الكاشير";

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
    let timer = 0;

    function refresh() {
      setNow(Date.now());
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          refresh();
        }
        schedule();
      }, 30000);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    refresh();
    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!pager) {
      return undefined;
    }

    let stopped = false;
    let timer = 0;

    async function load() {
      try {
        const [list, collected] = await Promise.all([
          apiFetch("/orders", { token }),
          apiFetch("/orders?status=collected", { token }),
        ]);
        if (stopped) {
          return;
        }
        setOrders(Array.isArray(list) ? list : []);
        setDelivered(Array.isArray(collected) ? collected.length : 0);
        setListError("");
        setLoaded(true);
      } catch (error) {
        if (stopped) {
          return;
        }
        if (error.status === 401) {
          onUnauthenticatedRef.current();
          return;
        }
        if (error.status === 403 && error.body?.message === "inactive") {
          onInactiveRef.current();
          return;
        }
        if (isFeatureUnavailable(error)) {
          setPagerOff(true);
          setOrders([]);
          setDelivered(0);
          setListError("");
          setLoaded(true);
          return;
        }
        setListError(staffErrorText(error));
        setLoaded(true);
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (stopped) {
          return;
        }
        if (document.visibilityState === "visible") {
          load().finally(() => {
            if (!stopped) schedule();
          });
        } else {
          schedule();
        }
      }, 4000);
    }

    function onVisibilityChange() {
      if (document.visibilityState !== "visible" || stopped) {
        return;
      }
      window.clearTimeout(timer);
      load().finally(() => {
        if (!stopped) schedule();
      });
    }

    load().finally(() => {
      if (!stopped) schedule();
    });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, pager]);

  const waiting = orders.filter((order) => order.status === "waiting");
  const ready = orders.filter((order) => order.status === "ready");

  function handleFailure(error) {
    if (error.status === 401) {
      onUnauthenticated();
      return;
    }
    if (error.status === 403 && error.body?.message === "inactive") {
      onInactive();
      return;
    }
    if (isFeatureUnavailable(error)) {
      setPagerOff(true);
      return;
    }
    setMessage({ tone: "error", text: staffErrorText(error) });
  }

  function handleDraftChange(value) {
    setDraft(value);
    if (message?.tone === "error") {
      setMessage(null);
    }
  }

  async function showOrderQr(id) {
    try {
      const order = await apiFetch(`/orders/${encodeURIComponent(id)}`, { token });
      if (!order?.cashier_qr?.url) {
        setMessage({ tone: "error", text: cashierCopy.notFound });
        return;
      }
      setQr({
        title: "رمز الطلب",
        url: order.cashier_qr.url,
        orderNumber: order.order_number,
        orderId: order.id,
      });
    } catch (error) {
      handleFailure(error);
    }
  }

  async function showSharedQr() {
    try {
      const body = await apiFetch("/restaurant/shared-qr", { token });
      if (!body?.url) {
        setMessage({ tone: "error", text: cashierCopy.generic });
        return;
      }
      setQr({ title: "رمز المطعم", url: body.url });
    } catch (error) {
      handleFailure(error);
    }
  }

  async function handleAdd() {
    const orderNumber = draft.trim();
    if (!orderNumber || adding) {
      return false;
    }
    if ([...orderNumber].length > 32) {
      setMessage({ tone: "error", text: cashierCopy.tooLong });
      return false;
    }

    setAdding(true);
    try {
      const order = await apiFetch("/orders", {
        token,
        method: "POST",
        body: { order_number: orderNumber },
      });
      setOrders((current) => mergeOrder(current, order));
      setDraft("");
      setMessage(null);
      if (user.restaurant?.preferred_qr_mode === "per_order" && order.cashier_qr?.url) {
        setQr({
          title: "رمز الطلب",
          url: order.cashier_qr.url,
          orderNumber: order.order_number,
          orderId: order.id,
        });
      }
      return true;
    } catch (error) {
      if (isDuplicateNumber(error)) {
        setMessage({ tone: "error", text: cashierCopy.duplicate });
        try {
          const list = await apiFetch("/orders", { token });
          if (Array.isArray(list)) {
            setOrders(list);
            const existing = list.find(
              (item) =>
                item.order_number === orderNumber &&
                (item.status === "waiting" || item.status === "ready"),
            );
            if (existing?.id) {
              const full = await apiFetch(`/orders/${encodeURIComponent(existing.id)}`, { token });
              if (full?.cashier_qr?.url) {
                setQr({
                  title: "رمز الطلب",
                  url: full.cashier_qr.url,
                  orderNumber: full.order_number,
                  orderId: full.id,
                });
              }
            }
          }
        } catch (loadError) {
          if (loadError.status === 401 || (loadError.status === 403 && loadError.body?.message === "inactive")) {
            handleFailure(loadError);
          }
        }
        return false;
      }
      if (error.status === 422) {
        setMessage({ tone: "error", text: orderNumberErrorText(error) });
        return false;
      }
      handleFailure(error);
      return false;
    } finally {
      setAdding(false);
    }
  }

  async function runOrderAction(id, path, onSuccess) {
    if (busyIds.current.has(id)) {
      return;
    }
    busyIds.current.add(id);
    try {
      const order = await apiFetch(`/orders/${encodeURIComponent(id)}${path}`, {
        token,
        method: "POST",
      });
      setOrders((current) => mergeOrder(current, order));
      onSuccess(order);
    } catch (error) {
      handleFailure(error);
    } finally {
      busyIds.current.delete(id);
    }
  }

  function handleNotify(id) {
    runOrderAction(id, "/notify", (order) => {
      setMessage({
        tone: "status",
        text: order.already_notified ? cashierCopy.alreadyNotified : cashierCopy.notified,
      });
    });
  }

  function handleDeliver(id) {
    runOrderAction(id, "/collect", () => {
      setDelivered((count) => count + 1);
      setMessage(null);
    });
  }

  function handleResend(id) {
    runOrderAction(id, "/resend", () => {
      setMessage({ tone: "status", text: cashierCopy.resent });
    });
  }

  function requestUncollect(id) {
    const order = orders.find((item) => item.id === id && item.status === "ready");
    if (!order) {
      return;
    }
    setUncollectTarget(order);
  }

  async function confirmUncollect() {
    if (!uncollectTarget || uncollecting) {
      return;
    }

    setUncollecting(true);
    try {
      const order = await apiFetch(`/orders/${encodeURIComponent(uncollectTarget.id)}/uncollect`, {
        token,
        method: "POST",
      });
      setOrders((current) => mergeOrder(current, order));
      setUncollectTarget(null);
      setMessage(null);
    } catch (error) {
      setUncollectTarget(null);
      handleFailure(error);
    } finally {
      setUncollecting(false);
    }
  }

  function requestCancel(id) {
    const order = orders.find((item) => item.id === id && item.status === "waiting");
    if (!order) {
      return;
    }
    setCancelTarget(order);
  }

  async function confirmCancel() {
    if (!cancelTarget || canceling) {
      return;
    }

    setCanceling(true);
    try {
      const order = await apiFetch(`/orders/${encodeURIComponent(cancelTarget.id)}/cancel`, {
        token,
        method: "POST",
      });
      setOrders((current) => mergeOrder(current, order));
      setCancelTarget(null);
      setMessage(null);
    } catch (error) {
      setCancelTarget(null);
      handleFailure(error);
    } finally {
      setCanceling(false);
    }
  }

  async function handleUpdate(id, rawNumber) {
    const orderNumber = rawNumber.trim();
    if (!orderNumber) {
      return { ok: false, error: cashierCopy.emptyNumber };
    }
    if ([...orderNumber].length > 32) {
      return { ok: false, error: cashierCopy.tooLong };
    }

    try {
      const order = await apiFetch(`/orders/${encodeURIComponent(id)}`, {
        token,
        method: "PATCH",
        body: { order_number: orderNumber },
      });
      setOrders((current) => mergeOrder(current, order));
      setMessage(null);
      if (qr?.orderId === id) {
        const full = await apiFetch(`/orders/${encodeURIComponent(id)}`, { token });
        if (full?.cashier_qr?.url) {
          setQr({
            title: "رمز الطلب",
            url: full.cashier_qr.url,
            orderNumber: full.order_number,
            orderId: full.id,
          });
        }
      }
      return { ok: true };
    } catch (error) {
      if (error.status === 401 || (error.status === 403 && error.body?.message === "inactive")) {
        handleFailure(error);
        return { ok: false, error: "" };
      }
      return { ok: false, error: orderNumberErrorText(error) };
    }
  }

  return (
    <div style={theme} className="min-h-dvh overflow-x-clip bg-ivory">
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
            id="cashier-nav"
            className={`${navOpen ? "flex" : "hidden md:flex"} fixed inset-y-0 start-0 z-40 w-64 flex-col border-e border-burgundy/10 bg-paper pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-detail`}
          >
            <div className="flex items-center gap-3 border-b border-burgundy/10 px-4 py-4">
              <BrandMark className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-burgundy-deep">لوحة الكاشير</p>
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
      <header className="sticky top-0 z-20 border-b border-burgundy/10 bg-ivory pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-3 py-2 sm:min-h-[4.75rem] sm:px-6">
          {showNav ? (
            <button
              type="button"
              aria-expanded={navOpen}
              aria-controls="cashier-nav"
              onClick={() => setNavOpen(true)}
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl text-burgundy ring-1 ring-burgundy/10 hover:bg-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:hidden"
            >
              <Menu className="size-5" />
              <span className="sr-only">فتح الأقسام</span>
            </button>
          ) : null}
          <BrandMark className={`h-10 w-10 sm:h-12 sm:w-12 ${showNav ? "md:hidden" : ""}`} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold text-burgundy-deep sm:text-2xl lg:text-3xl">
              {showNav ? sectionTitle : "لوحة الكاشير"}
            </h1>
            {user.restaurant?.name ? (
              <p className={`truncate text-sm text-ink/55 ${showNav ? "md:hidden" : ""}`}>{user.restaurant.name}</p>
            ) : null}
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <ActionButton variant="soft" onClick={showSharedQr}>
              <QrCode className="size-5 shrink-0" aria-hidden="true" />
              رمز المطعم
            </ActionButton>
            {showNav ? null : (
              <HeaderButton onClick={onUnauthenticated}>
                <LogOut className="size-5 shrink-0" aria-hidden="true" />
                خروج
              </HeaderButton>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 sm:pt-8 sm:pb-8">
        {visible === "none" ? (
          <p className="text-base font-medium text-burgundy-deep">{cashierCopy.featureUnavailable}</p>
        ) : visible === "menu" ? (
          <RestaurantMenu
            token={token}
            onUnauthenticated={onUnauthenticated}
            onInactive={onInactive}
            onFeatureUnavailable={() => setMenuOff(true)}
          />
        ) : visible === "loyalty" ? (
          <LoyaltyRedeem
            token={token}
            onUnauthenticated={onUnauthenticated}
            onInactive={onInactive}
            onFeatureUnavailable={() => setLoyaltyOff(true)}
          />
        ) : (
          <>
        <section aria-label="ملخص الطلبات" className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "قيد التحضير", value: waiting.length, icon: Clock3, ground: "bg-foam", mark: "bg-[#efd4dc] text-burgundy" },
            { label: "جاهزة للاستلام", value: ready.length, icon: Bell, ground: "bg-gold/20", mark: "bg-gold/25 text-gold-deep", live: true },
            { label: "تم تسليمها", value: delivered, icon: CircleCheck, ground: "bg-ivory", mark: "bg-[#e7f6ee] text-[#1f7a4d]" },
          ].map((item) => (
            <article
              key={item.label}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 shadow-[0_16px_40px_-28px_rgba(74,4,24,0.35)] ring-1 ring-burgundy/10 sm:gap-3 sm:px-4 ${item.ground} ${item.live && loaded && item.value > 0 ? "ring-2 ring-gold" : ""}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${item.mark}`}>
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-sans text-3xl leading-none font-bold text-burgundy-deep tabular-nums" dir="ltr">
                  {loaded ? item.value : "–"}
                </p>
                <p className="mt-1 font-detail text-sm leading-5 font-semibold text-burgundy-deep">{item.label}</p>
              </div>
            </article>
          ))}
        </section>

        <OrderComposer
          draft={draft}
          message={message}
          busy={adding}
          onDraftChange={handleDraftChange}
          onSubmit={handleAdd}
        />

        {!loaded ? (
          <p className="text-sm font-medium text-ink/50">{cashierCopy.loadingOrders}</p>
        ) : null}
        {listError ? (
          <p role="alert" className="text-sm font-medium text-burgundy">
            {listError}
          </p>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
          <OrderLane
            title="قيد الانتظار"
            kicker="يُحضَّر الآن"
            empty="لا يوجد طلبات قيد الانتظار حالياً"
            tone="waiting"
            now={now}
            orders={waiting}
            timeZone={timeZone}
            showEmpty={loaded}
            onShowQr={showOrderQr}
            primary={{
              label: "جاهز",
              hint: "تنبيه الزبون",
              onAction: handleNotify,
            }}
            onUpdate={handleUpdate}
            secondary={{
              label: "إلغاء",
              variant: "ghost",
              onAction: requestCancel,
            }}
          />
          <OrderLane
            title="جاهز للاستلام"
            kicker="بانتظار الزبون"
            empty="لا يوجد طلبات بانتظار الاستلام حالياً"
            tone="ready"
            now={now}
            orders={ready}
            timeZone={timeZone}
            showEmpty={loaded}
            trailing={{
              label: "لم يُستلم",
              onAction: requestUncollect,
            }}
            primary={{
              label: "تم الاستلام",
              onAction: handleDeliver,
            }}
            secondary={{
              label: "إعادة التنبيه",
              onAction: handleResend,
            }}
          />
        </div>
          </>
        )}
      </main>
      </div>
      <UncollectDialog
        order={uncollectTarget}
        pending={uncollecting}
        onConfirm={confirmUncollect}
        onDismiss={() => {
          if (!uncollecting) setUncollectTarget(null);
        }}
      />
      <CancelDialog
        order={cancelTarget}
        pending={canceling}
        onConfirm={confirmCancel}
        onDismiss={() => {
          if (!canceling) setCancelTarget(null);
        }}
      />
      <QrDialog qr={qr} onDismiss={() => setQr(null)} />
    </div>
  );
}
