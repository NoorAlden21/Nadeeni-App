"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimation, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, History, Keyboard, Loader2 } from "lucide-react";
import { PoweredBy } from "@/components/brand/powered-by";
import { ActionButton } from "@/components/cashier/action-button";
import { PageMotion } from "@/components/motion/page-motion";
import { PressButton } from "@/components/motion/press-button";
import { useSafeReducedMotion } from "@/components/motion/use-reduced-motion";
import { PublicMenu } from "@/components/customer/public-menu";
import { Card } from "@/components/ui/card";
import { fadeUp, spring, stagger } from "@/lib/motion";
// import { RestaurantContact } from "@/components/customer/restaurant-contact";
import { apiFetch, menuAssetSrc, restaurantIconSrc } from "@/lib/api/client";
import { readPublicMenu } from "@/lib/customer/public-menu";
import { readFeatures } from "@/lib/features";
import { rememberRestaurantTheme } from "@/lib/theme/restaurant-theme";
import { useRestaurantTheme } from "@/components/theme/use-restaurant-theme";
import {
  customerCopy,
  orderNumberProblem,
  publicErrorText,
  readVisitorId,
  rememberOrderIcon,
  rememberOrderSlug,
  rememberRestaurantIcon,
  rememberRestaurantSlug,
} from "@/lib/customer/public";

const enter = {
  hidden: stagger.hidden,
  show: { transition: { ...stagger.show.transition, delayChildren: 0.05 } },
};

const backIn = {
  hidden: { opacity: 0, x: 8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const logoIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: spring },
};

const cardRise = {
  hidden: { opacity: 0, y: 24 },
  show: fadeUp.show,
};

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
  const [door, setDoor] = useState("choose");
  const [savedOrder, setSavedOrder] = useState("");
  const [contact, setContact] = useState(null);
  const [nameEn, setNameEn] = useState("");
  const [leaving, setLeaving] = useState(false);
  const theme = useRestaurantTheme(contact);
  const reduceMotion = useSafeReducedMotion();
  const inputMotion = useAnimation();

  useEffect(() => {
    let stopped = false;

    setBrowsing(false);
    setDoor("choose");
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
        rememberRestaurantSlug(restaurant?.name, slug);
        setNameEn(typeof restaurant?.name_en === "string" ? restaurant.name_en.trim() : "");
        setIconUrl(icon);
        setContact(restaurant);
        rememberRestaurantIcon(restaurant?.name, icon);
        rememberRestaurantTheme(restaurant);

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

  useEffect(() => {
    if (!errorTick || reduceMotion) return;
    inputMotion.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.3 } });
  }, [errorTick, reduceMotion, inputMotion]);

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
    let navigate = false;
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
        rememberOrderSlug(result?.token, slug);
        rememberRestaurantSlug(name, slug);
      }

      const nextPath = statusPath(result);
      if (nextPath) {
        navigate = true;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setLeaving(true);
        window.setTimeout(() => router.push(nextPath), reduce ? 0 : 280);
      }
    } catch (requestError) {
      showError(publicErrorText(requestError, customerCopy.orderUnavailable));
    } finally {
      if (!navigate) setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <Screen theme={theme}>
        <p className="text-base font-medium text-burgundy-deep">{customerCopy.opening}</p>
      </Screen>
    );
  }

  if (missing) {
    return (
      <Screen theme={theme}>
        <p className="max-w-md text-center text-lg font-semibold leading-8 text-burgundy-deep">
          {customerCopy.restaurantMissing}
        </p>
      </Screen>
    );
  }

  if (features.menu && !features.pager) {
    return (
      <Screen align="start" theme={theme}>
        {menuProblem ? (
          <p role="alert" className="text-center text-base font-medium text-burgundy-deep">
            {menuProblem}
          </p>
        ) : (
          <PublicMenu
            name={name}
            nameEn={nameEn}
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
      <Screen theme={theme}>
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
          {/* <RestaurantContact contact={contact} className="justify-center" /> */}
        </div>
      </Screen>
    );
  }

  if (browsing && features.menu) {
    return (
      <Screen align="start" theme={theme}>
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
            nameEn={nameEn}
            iconUrl={iconUrl}
            contact={contact}
            banners={menu.banners}
            categories={menu.categories}
            loading={!menuLoaded}
            onBack={() => {
              setBrowsing(false);
              setDoor("choose");
            }}
          />
        )}
      </Screen>
    );
  }

  const offerChoice = features.menu && !menuProblem && door === "choose";

  if (offerChoice) {
    return (
      <Screen bare theme={theme}>
        <ChoiceDoor
          name={name}
          iconUrl={iconUrl}
          heroUrl={menuAssetSrc(menu.banners[0]?.imageUrl)}
          onTrack={() => setDoor("track")}
          onMenu={() => {
            setError("");
            window.scrollTo(0, 0);
            setBrowsing(true);
          }}
        />
      </Screen>
    );
  }

  const describedBy = error ? "order-number-hint order-number-error" : "order-number-hint";

  const numberEmpty = !number.trim();

  return (
    <Screen theme={theme} decor>
      <PageMotion>
        <motion.div
          className="flex flex-1 flex-col py-2 text-center"
          variants={enter}
          initial="hidden"
          animate="show"
        >
          {features.menu && !menuProblem ? (
            <motion.div variants={backIn} className="self-start">
              <PressButton
                type="button"
                onClick={() => setDoor("choose")}
                className="inline-flex min-h-11 items-center gap-1 px-1 text-[15px] font-bold text-burgundy-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burgundy/25"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
                {customerCopy.backToChoices}
              </PressButton>
            </motion.div>
          ) : null}
          <motion.div variants={enter} className="my-auto flex w-full flex-col items-center gap-6">
          <motion.div variants={logoIn} className="flex justify-center">
            {iconUrl ? (
              <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-paper p-1 shadow-track">
                <img src={iconUrl} alt="" className="size-full rounded-xl object-cover" />
                {reduceMotion ? null : (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-1/2 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,white_75%,transparent),transparent)]"
                    initial={{ x: "140%" }}
                    animate={{ x: "-140%" }}
                    transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
                  />
                )}
              </div>
            ) : null}
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-1">
            <p className="text-[13px] font-medium text-foreground/70">أهلاً بك في مطعم</p>
            {name ? (
              <h1 className="max-w-full font-display text-[1.75rem] leading-tight font-bold wrap-break-word text-burgundy-deep">
                {name}
              </h1>
            ) : null}
          </motion.div>

            <motion.div variants={fadeUp} className="w-full">
              <EntrySteps reduce={reduceMotion} />
            </motion.div>

            <motion.div className="w-full" variants={cardRise} animate={leaving ? { opacity: 0 } : undefined}>
              <Card className="rounded-track border border-line bg-paper px-4 py-4 text-center shadow-track ring-0">
                <label htmlFor="order-number" className="block text-[1.15rem] font-bold text-burgundy-deep">
                  رقم الطلب
                </label>
                <p id="order-number-hint" className="mt-2 text-[14px] leading-6 text-foreground/70">
                  اكتبوا رقم الطلب كما سجّله الكاشير.
                </p>
                <form onSubmit={(event) => handleSubmit(event)} className="mt-4 flex flex-col gap-4">
                  <motion.div animate={inputMotion}>
                    <div
                      className={`rounded-2xl border-[1.5px] bg-paper transition-[border-color,box-shadow] duration-200 ${
                        error
                          ? "border-[#C45C5C]"
                          : "border-line focus-within:border-burgundy"
                      }`}
                    >
                      <input
                        id="order-number"
                        name="order_number"
                        dir="ltr"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        autoComplete="off"
                        enterKeyHint="go"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={describedBy}
                        placeholder="000"
                        value={number}
                        onChange={(event) => {
                          setNumber(event.target.value);
                          setError("");
                        }}
                        className="h-16 w-full min-w-0 overflow-x-auto bg-transparent text-center font-sans text-[32px] font-bold tracking-[0.15em] text-burgundy-deep tabular-nums outline-none placeholder:text-[22px] placeholder:font-medium placeholder:tracking-[0.15em] placeholder:text-foreground/40"
                      />
                    </div>
                  </motion.div>
                  <AnimatePresence>
                    {error ? (
                      <motion.p
                        id="order-number-error"
                        role="alert"
                        key={errorTick}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[13px] leading-6 font-medium text-[#8C2F2F]"
                      >
                        {error}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                  <PressButton
                    type="submit"
                    disabled={busy || numberEmpty}
                    whileTap={busy || numberEmpty ? undefined : { scale: 0.98 }}
                    className={`inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burgundy/25 disabled:cursor-not-allowed ${
                      numberEmpty && !busy
                        ? "bg-background text-foreground/45"
                        : "cursor-pointer bg-burgundy text-on-primary"
                    }`}
                  >
                    <span>{busy ? "جاري التحقق..." : "تابع طلبي"}</span>
                    {busy ? (
                      <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <ArrowLeft className="size-5" aria-hidden="true" />
                    )}
                  </PressButton>
                </form>
              </Card>
            </motion.div>

            {menuProblem ? (
              <p role="alert" className="text-center text-sm font-medium text-[#8C2F2F]">
                {menuProblem}
              </p>
            ) : null}

            {savedOrder && numberEmpty && !busy ? (
              <motion.div variants={fadeUp} transition={{ delay: 0.2 }} className="w-full">
                <div className="rounded-2xl border border-dashed border-line bg-foam px-4 py-4">
                  <p className="flex items-center justify-center gap-2 text-[13px] font-medium text-foreground/70">
                    <History className="size-4" strokeWidth={2} aria-hidden="true" />
                    هل تبحث عن طلبك السابق؟
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSubmit(null, savedOrder)}
                    className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-line bg-foam px-4 text-[15px] font-bold text-burgundy-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burgundy/25"
                  >
                    <span>متابعة الطلب رقم {savedOrder}</span>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
          </motion.div>
      </PageMotion>
    </Screen>
  );
}

function EntrySteps({ reduce }) {
  const steps = [
    { id: "scan", label: "مسح الرمز", state: "done" },
    { id: "number", label: "إدخال الرقم", state: "active" },
    { id: "track", label: "تتبع الطلب", state: "idle" },
  ];

  return (
    <div className="mx-auto w-full max-w-[20rem]">
      <div className="relative flex items-start justify-between">
        <div className="absolute top-[17px] right-8 left-1/2 z-0 h-0.5 border-t-2 border-dashed border-burgundy" />
        {steps.map((step) => (
          <div key={step.id} className="relative z-10 flex w-16 flex-col items-center gap-2">
            <div
              className={`relative flex size-9 items-center justify-center rounded-full ${
                step.state === "done" ? "bg-burgundy-deep text-[color:var(--restaurant-on-deep,var(--color-background))]" : ""
              } ${step.state === "active" ? "bg-burgundy text-on-primary ring-2 ring-burgundy" : ""} ${
                step.state === "idle" ? "border border-dashed border-line bg-transparent text-burgundy/70" : ""
              }`}
            >
              {step.state === "active" && !reduce ? (
                <motion.span
                  aria-hidden="true"
                  className="absolute -inset-1 rounded-full border-2 border-burgundy"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
              <span className="relative z-10 flex">
                {step.state === "done" ? (
                  <svg viewBox="0 0 24 24" className="size-4" aria-label={step.label}>
                    <path d="M4.5 12.75l6 6 9-13.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
                {step.state === "active" ? <Keyboard className="size-4" strokeWidth={2} aria-label={step.label} /> : null}
                {step.state === "idle" ? (
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-label={step.label}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                ) : null}
              </span>
            </div>
            <span className={`text-[12px] ${step.state === "active" ? "font-semibold text-foreground" : "font-medium text-foreground/70"}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const choiceCanvas = "var(--choice-canvas, #f6efe6)";
const choiceLine = "var(--choice-line, #e4cf9a)";

function ChoiceDoor({ name = "", onTrack, onMenu, iconUrl = "", heroUrl = "" }) {
  const reduce = useReducedMotion();
  const [mark, setMark] = useState(iconUrl);
  const [hero, setHero] = useState(heroUrl);

  useEffect(() => {
    setMark(iconUrl);
  }, [iconUrl]);

  useEffect(() => {
    setHero(heroUrl);
  }, [heroUrl]);
  const options = [
    {
      title: customerCopy.chooseTrack,
      onClick: onTrack,
      icon: (
        <img src="/choice-track-icon.png" alt="" className="size-11 object-contain" />
      ),
    },
    {
      title: customerCopy.chooseMenu,
      onClick: onMenu,
      icon: (
        <img src="/choice-menu-icon.png" alt="" className="size-11 object-contain" />
      ),
    },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col" style={{ backgroundColor: choiceCanvas }}>
      <div className="relative h-[40vh] min-h-[15.5rem] max-h-[23rem] overflow-hidden">
        <motion.img
          src={hero || "/choice-dining.png"}
          alt=""
          className="absolute inset-0 size-full object-cover object-[center_36%]"
          initial={reduce ? false : { scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          onError={() => setHero("")}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, transparent 62%, color-mix(in srgb, ${choiceCanvas} 35%, transparent) 84%, ${choiceCanvas} 100%)`,
          }}
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 mx-auto -mt-9 flex w-full max-w-md flex-1 flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <motion.span
          className={`grid size-[4.25rem] place-items-center overflow-hidden rounded-full shadow-[0_12px_30px_-16px_rgba(74,4,24,0.5)] ${mark ? "ring-2 ring-gold" : ""}`}
          style={{ backgroundColor: choiceCanvas }}
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.15 }}
        >
          <img
            src={mark || "/choice-cloche.png"}
            alt=""
            className={mark ? "size-full object-cover" : "block size-[2.85rem] object-contain object-center"}
            onError={() => setMark("")}
          />
        </motion.span>
        <motion.h1
          className="mt-5 max-w-full text-center font-display text-[1.85rem] leading-tight font-bold wrap-break-word text-burgundy-deep"
          initial={reduce ? false : { y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.22, ease: "easeOut" }}
        >
          {name ? `${customerCopy.chooseWelcome} ${name}!` : "أهلاً بك!"}
        </motion.h1>
        <motion.p
          className="mt-3 flex items-center justify-center gap-3 text-center font-detail text-[0.95rem] font-medium text-gold"
          initial={reduce ? false : { y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.32, ease: "easeOut" }}
        >
          <span className="h-px w-12 shrink-0 bg-gold" aria-hidden="true" />
          <span>{customerCopy.choosePrompt}</span>
          <span className="h-px w-12 shrink-0 bg-gold" aria-hidden="true" />
        </motion.p>

        <div className="mt-7 flex w-full flex-col gap-3.5">
          {options.map((option, index) => (
            <motion.button
              key={option.title}
              type="button"
              onClick={option.onClick}
              initial={reduce ? false : { y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1, ease: "easeOut" }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-full border px-4 py-3.5 text-start shadow-[0_14px_30px_-22px_rgba(74,4,24,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              style={{ backgroundColor: choiceCanvas, borderColor: choiceLine }}
            >
              <span className="grid size-11 shrink-0 place-items-center">{option.icon}</span>
              <span className="h-9 w-px shrink-0 opacity-70" style={{ backgroundColor: choiceLine }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-detail text-lg font-bold text-burgundy-deep">{option.title}</span>
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-burgundy text-on-primary">
                <svg viewBox="0 0 24 24" className="size-4 rtl:-scale-x-100" aria-hidden="true" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.button>
          ))}
        </div>

        <motion.div
          dir="ltr"
          className="mt-auto flex flex-col items-center pt-12 text-burgundy"
          style={{
            "--restaurant-primary": "#7e062a",
            "--restaurant-secondary": "#cda649",
          }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
            <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
              <path d="M12 4.2a4.2 4.2 0 0 0-4.2 4.2v2.1c0 .7-.3 1.4-.8 1.9L6 14h12l-1-1.6c-.5-.5-.8-1.2-.8-1.9V8.4A4.2 4.2 0 0 0 12 4.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M10 14.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="h-px w-8 bg-gold" aria-hidden="true" />
          </div>
          <p className="mt-2 font-detail text-[0.68rem] font-semibold tracking-[0.38em]">NADEENI</p>
          <p className="mt-1 font-detail text-[0.58rem] font-medium tracking-[0.16em] text-burgundy/70">SMARTER RESTAURANT EXPERIENCE</p>
        </motion.div>
      </div>
    </div>
  );
}

function EntryDrift() {
  const reduce = useSafeReducedMotion();
  const controls = useAnimation();

  useEffect(() => {
    if (reduce) return undefined;
    const play = () => {
      if (document.hidden) {
        controls.stop();
        return;
      }
      controls.start({
        y: [0, -12, 0],
        transition: { duration: 9, repeat: Infinity, ease: "easeInOut" },
      });
    };
    play();
    document.addEventListener("visibilitychange", play);
    return () => {
      document.removeEventListener("visibilitychange", play);
      controls.stop();
    };
  }, [controls, reduce]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div animate={controls} className="absolute -top-16 -start-16 size-56 rounded-full bg-burgundy/10 blur-3xl" />
      <motion.div animate={controls} className="absolute -end-10 bottom-16 size-64 rounded-full bg-burgundy/10 blur-3xl" />
    </div>
  );
}

function Screen({ children, align = "center", bare = false, theme, decor = false }) {
  if (bare) {
    return (
      <main style={{ ...(theme || {}), backgroundColor: choiceCanvas }} className="min-h-dvh [overflow-anchor:none]">
        {children}
      </main>
    );
  }

  return (
    <main style={theme} className={`relative flex min-h-dvh flex-col px-4 [overflow-anchor:none] ${decor ? "bg-[var(--choice-canvas,var(--color-background))] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)+16px)]" : "bg-ivory pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12"} ${align === "start" ? "overflow-x-visible pt-[max(0.75rem,env(safe-area-inset-top))]" : decor ? "overflow-x-visible" : "overflow-x-clip pt-[max(1.25rem,env(safe-area-inset-top))]"}`}>
      {decor ? <EntryDrift /> : null}
      <div className={`relative z-10 flex w-full flex-col self-center ${decor ? "max-w-sm flex-1" : `max-w-5xl ${align === "start" ? "" : "my-auto"}`}`}>{children}</div>
      {align === "center" ? <PoweredBy className={`relative z-10 shrink-0 text-foreground/70 ${decor ? "mt-4" : ""}`} /> : null}
    </main>
  );
}