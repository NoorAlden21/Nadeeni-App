"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { menuAssetSrc } from "@/lib/api/client";
// import { RestaurantContact } from "@/components/customer/restaurant-contact";
import { customerCopy } from "@/lib/customer/public";
import { restaurantTitle } from "@/lib/theme/restaurant-theme";
import { categoryIndexAtMarker } from "@/lib/customer/public-menu";
import { formatPrice } from "@/lib/menu/menu";
import { Funnel } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function useAsset(src) {
  const [failedSrc, setFailedSrc] = useState("");
  const resolved = menuAssetSrc(src);
  const visible = Boolean(resolved) && failedSrc !== resolved;
  return {
    visible,
    resolved,
    fail() {
      setFailedSrc(resolved);
    },
  };
}

function RoundPhoto({ src, label, className, fit = "cover" }) {
  const asset = useAsset(src);
  if (asset.visible) {
    return (
      // The address is an absolute API file. A missing image is 404.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset.resolved}
        alt=""
        loading="lazy"
        onError={asset.fail}
        className={`${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
      />
    );
  }

  const mark = [...String(label || "•")][0] || "•";
  return (
    <span aria-hidden="true" className={`grid place-items-center bg-photo font-detail font-semibold text-burgundy ${className}`}>
      {mark}
    </span>
  );
}

function BackIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-4 ${className}`} fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 start-4 size-[1.15rem] -translate-y-1/2 text-ink/35" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="currentColor">
      <path d="M4 4h6.5v6.5H4V4zm9.5 0H20v6.5h-6.5V4zM4 13.5h6.5V20H4v-6.5zm9.5 0H20V20h-6.5v-6.5z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="currentColor">
      <circle cx="5" cy="6.5" r="1.6" />
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="5" cy="17.5" r="1.6" />
      <path d="M9 5.4h11v2.2H9V5.4zm0 5.5h11v2.2H9v-2.2zm0 5.5h11v2.2H9v-2.2z" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function BannerPhoto({ src }) {
  const asset = useAsset(src);
  if (!asset.visible) {
    return <div className="aspect-[16/9] w-full bg-burgundy-deep sm:aspect-[2.2/1]" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset.resolved} alt="" onError={asset.fail} className="aspect-[16/9] w-full object-cover sm:aspect-[2.2/1]" />
  );
}

function BannerHero({ banners }) {
  const [index, setIndex] = useState(0);
  const signature = banners.map((banner) => banner.imageUrl).join("|");
  const current = banners[index] || banners[0];

  useEffect(() => {
    setIndex(0);
  }, [signature]);

  if (!current) {
    return null;
  }

  return (
    <div className="relative mt-4 -mx-4 overflow-hidden sm:-mx-8 lg:-mx-12">
      <BannerPhoto key={current.imageUrl} src={current.imageUrl} />
      {banners.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
          {banners.map((banner, slideIndex) => (
            <button
              key={`${banner.imageUrl}-${slideIndex}`}
              type="button"
              aria-label={`${slideIndex + 1}`}
              aria-current={slideIndex === index ? "true" : undefined}
              onClick={() => setIndex(slideIndex)}
              className={`size-2 cursor-pointer rounded-full ${slideIndex === index ? "bg-white" : "bg-white/50"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

function foldText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ");
}

const menuEnglish = {
  menuHeading: "Menu",
  menuSearch: "Search",
  menuGrid: "Grid",
  menuList: "List",
  menuEmpty: "No items on the menu right now.",
  menuLoading: "Loading the menu.",
  menuNoMatch: "No items match the search.",
  menuCategories: "Categories",
  menuPick: "Choose a menu",
  menuMain: "Main menu",
  menuNew: "New items",
  menuOffers: "Offers",
  menuNewEmpty: "No new items right now.",
  menuOffersEmpty: "No offers right now.",
  badgeNew: "New",
  badgeOffer: "Offer",
  menuClose: "Close",
  menuPriceLabel: "Price",
  menuSuggested: "Suggestions",
  backToNumber: "Back",
  currency: "SYP",
};

function phrase(key, lang) {
  if (lang === "en" && menuEnglish[key]) return menuEnglish[key];
  if (key === "currency") return "ل.س";
  return customerCopy[key];
}

function localized(field, lang) {
  const arabic = field?.ar || "";
  const english = field?.en || "";
  if (lang === "en") return english || arabic;
  return arabic || english;
}

function boardTitle(board, lang) {
  if (board === "offer") return phrase("menuOffers", lang);
  if (board === "new") return phrase("menuNew", lang);
  return phrase("menuHeading", lang);
}

function categoriesForBoard(categories, board) {
  if (board === "main") return categories;
  return categories.flatMap((category) => {
    const items = category.items.filter((item) => item.badge === board);
    return items.length ? [{ ...category, items }] : [];
  });
}

function ItemBadge({ badge, lang }) {
  if (badge !== "new" && badge !== "offer") return null;
  const offer = badge === "offer";
  return (
    <span
      className={`absolute top-2 start-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        offer ? "bg-wash text-gold-deep ring-1 ring-gold/60" : "bg-burgundy text-on-primary"
      }`}
    >
      {offer ? phrase("badgeOffer", lang) : phrase("badgeNew", lang)}
    </span>
  );
}

function visibleCategories(categories, query) {
  const needle = foldText(query);
  return categories.flatMap((category, sourceIndex) => {
    if (!needle) return [{ ...category, sourceIndex }];
    const categoryHit = foldText(`${category.name.ar} ${category.name.en || ""}`).includes(needle);
    const items = categoryHit
      ? category.items
      : category.items.filter((item) =>
          foldText(`${item.name.ar} ${item.name.en || ""} ${item.description.ar || ""} ${item.description.en || ""}`).includes(needle),
        );
    if (items.length === 0) return [];
    return [{ ...category, items, sourceIndex }];
  });
}

function menuCards(groups) {
  return groups.flatMap((group) =>
    group.items.map((item, itemIndex) => ({
      ...item,
      categoryName: group.name.ar,
      sourceIndex: group.sourceIndex,
      key: `${group.sourceIndex}-${item.name.ar}-${itemIndex}`,
    })),
  );
}

function ItemDialog({ item, onClose, lang }) {
  const price = item.price === null ? "" : formatPrice(item.price);
  const itemName = localized(item.name, lang);
  const descriptionText = localized(item.description, lang);
  const description = descriptionText && descriptionText.trim() !== itemName.trim() ? descriptionText : "";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        closeLabel={phrase("menuClose", lang)}
        dir={lang === "en" ? "ltr" : "rtl"}
        className="max-h-[min(40rem,calc(100dvh-2rem))] gap-0 overflow-y-auto bg-white p-0 font-detail"
      >
        <div className="relative bg-soft">
          <RoundPhoto src={item.photoUrl} label={itemName} className="aspect-[4/3] w-full text-5xl" />
          <ItemBadge badge={item.badge} lang={lang} />
        </div>
        <div className="px-5 pt-5 pb-6">
          <DialogHeader className="items-stretch gap-2 text-start">
            <DialogTitle className="text-start font-detail text-2xl leading-8 font-bold text-burgundy">
              {itemName}
            </DialogTitle>
            <DialogDescription className={description ? "text-start text-sm leading-7 whitespace-pre-line text-ink/60" : "sr-only"}>
              {description || itemName}
            </DialogDescription>
          </DialogHeader>
          {price ? (
            <p className="mt-4 font-sans text-xl font-bold text-burgundy">
              {phrase("currency", lang)} <span dir="ltr" translate="no">{price}</span>
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const menuBoards = [
  { id: "offer", key: "menuOffers" },
  { id: "new", key: "menuNew" },
  { id: "main", key: "menuMain" },
];

function MenuBoardSheet({ board, onChoose, onClose, lang }) {
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (!dialog.open) return;
      dialog.addEventListener("close", (event) => event.stopImmediatePropagation(), { capture: true, once: true });
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="menu-board-title"
      className="mx-auto mb-0 mt-auto w-full max-w-lg rounded-t-[1.6rem] border-0 bg-transparent p-0 text-ink backdrop:bg-black/50"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
        className="rounded-t-[1.6rem] bg-paper px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_30px_60px_-28px_rgba(74,4,24,0.55)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="menu-board-title" className="font-detail text-2xl font-bold text-ink">
            {phrase("menuPick", lang)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={phrase("menuClose", lang)}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          {menuBoards.map((option) => {
            const selected = option.id === board;
            return (
              <button
                key={option.id}
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onChoose(option.id)}
                className={`cursor-pointer rounded-xl px-4 py-3 text-start text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  selected ? "bg-soft text-ink" : "text-ink/75"
                }`}
              >
                {phrase(option.key, lang)}
              </button>
            );
          })}
        </div>
      </motion.div>
    </dialog>
  );
}

function CategoryFilterSheet({ categories, active, onChoose, onClose, lang }) {
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (!dialog.open) return;
      dialog.addEventListener("close", (event) => event.stopImmediatePropagation(), { capture: true, once: true });
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="menu-categories-title"
      className="inset-x-0 bottom-0 m-0 mt-auto flex max-h-[75dvh] min-h-[50dvh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl border-0 bg-paper p-0 text-ink shadow-2xl backdrop:bg-black/50 md:inset-auto md:m-auto md:max-h-[80dvh] md:min-h-0 md:w-[min(42rem,calc(100%-2rem))] md:max-w-[42rem] md:rounded-3xl"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 pt-4 pb-3">
          <h2 id="menu-categories-title" className="text-lg font-bold text-ink">
            {phrase("menuCategories", lang)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={phrase("menuClose", lang)}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <ul>
            {categories.map((item) => {
              const selected = item.sourceIndex === active;
              return (
                <li key={`${item.name.ar}-${item.sourceIndex}`} className="py-1">
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onChoose(item.sourceIndex)}
                    className={`block w-full cursor-pointer rounded-lg px-4 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      selected ? "bg-soft" : "hover:bg-[#f7f4ee]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className={`min-w-0 ${selected ? "font-semibold text-ink" : "text-ink/80"}`}>{localized(item.name, lang)}</span>
                      <span
                        dir="ltr"
                        translate="no"
                        className={`font-detail text-xs ${selected ? "font-semibold text-ink/55" : "text-ink/40"}`}
                      >
                        {item.items.length}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </dialog>
  );
}

function LayoutSwitch({ layout, onChange, lang }) {
  return (
    <div className="flex w-max shrink-0 items-center rounded-lg border border-black/10 bg-white sm:hidden">
      {[
        ["grid", phrase("menuGrid", lang), <GridIcon key="grid" />],
        ["list", phrase("menuList", lang), <ListIcon key="list" />],
      ].map(([id, label, icon]) => {
        const selected = layout === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              selected ? "bg-soft text-ink" : "text-ink/55"
            }`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

function pillClass(selected) {
  return `shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
    selected
      ? "border-burgundy bg-burgundy text-on-primary shadow-[0_8px_18px_-12px_rgba(74,4,24,0.85)]"
      : "border-black/10 bg-white text-ink/70"
  }`;
}

function CategoryStrip({ categories, active, onChoose, stripRef, lang }) {
  return (
    <nav
      ref={stripRef}
      aria-label={phrase("menuHeading", lang)}
      className="flex min-w-0 gap-2 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {categories.map((item) => {
        const isSelected = item.sourceIndex === active;
        return (
          <button
            key={`${item.name.ar}-${item.sourceIndex}`}
            type="button"
            data-category-index={item.sourceIndex}
            aria-current={isSelected ? "true" : undefined}
            onClick={() => onChoose(item.sourceIndex)}
            className={pillClass(isSelected)}
          >
            {localized(item.name, lang)}
          </button>
        );
      })}
    </nav>
  );
}

function MenuItemCard({ item, layout, onOpen, lang, index = 0 }) {
  const reduce = useReducedMotion();
  const price = item.price === null ? "" : formatPrice(item.price);
  const itemName = localized(item.name, lang);
  const descriptionText = localized(item.description, lang);
  const description = descriptionText && descriptionText.trim() !== itemName.trim() ? descriptionText : "";
  const enter = reduce ? false : { y: 16, opacity: 0 };
  const settle = { y: 0, opacity: 1 };
  const motionProps = {
    initial: enter,
    animate: settle,
    transition: { duration: 0.4, delay: Math.min(index, 6) * 0.07, ease: "easeOut" },
    whileTap: reduce ? undefined : { scale: 0.98 },
  };
  return (
    <li>
      {layout === "list" ? (
        <motion.button
          type="button"
          onClick={() => onOpen(item)}
          dir={lang === "en" ? "ltr" : "rtl"}
          {...motionProps}
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-white px-3 py-3 text-start shadow-[0_10px_30px_rgba(42,16,22,0.08)] ring-1 ring-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:hidden"
        >
          <span dir={lang === "en" ? "ltr" : "rtl"} className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <span className="line-clamp-2 font-detail text-lg leading-tight font-bold text-burgundy">{itemName}</span>
            {description ? (
              <span className="line-clamp-2 text-sm leading-snug text-ink/50">{description}</span>
            ) : null}
            {price ? (
              <span dir="ltr" translate="no" className="text-sm font-semibold text-ink/70">
                {phrase("currency", lang)} {price}
              </span>
            ) : null}
          </span>
          <span className="relative size-24 shrink-0 overflow-hidden rounded-2xl">
            <RoundPhoto src={item.photoUrl} label={itemName} className="size-full text-2xl" />
            <ItemBadge badge={item.badge} lang={lang} />
          </span>
        </motion.button>
      ) : null}
      <motion.button
        type="button"
        onClick={() => onOpen(item)}
        {...motionProps}
        className={`${layout === "list" ? "hidden sm:flex" : "flex"} h-full w-full cursor-pointer flex-col rounded-[1.35rem] bg-white p-2 text-start shadow-[0_14px_32px_-20px_rgba(42,16,22,0.4)] ring-1 ring-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold`}
      >
        <span className="relative block overflow-hidden rounded-[1.05rem]">
          <RoundPhoto src={item.photoUrl} label={localized(item.name, lang)} className="aspect-[5/4] w-full text-3xl" />
          <ItemBadge badge={item.badge} lang={lang} />
        </span>
        <span className="flex flex-1 flex-col items-center px-1.5 pt-3 pb-1.5 text-center">
          <span className="line-clamp-2 w-full text-center font-detail text-[15px] leading-6 font-semibold text-ink">{localized(item.name, lang)}</span>
          {price ? (
            <span className="mt-3 flex w-full items-baseline justify-center gap-1.5 border-t border-black/[0.06] pt-2">
              <span dir="ltr" translate="no" className="font-detail text-sm font-bold text-burgundy">
                {price}
              </span>
              <span className="text-[11px] font-semibold text-ink/45">{phrase("currency", lang)}</span>
            </span>
          ) : null}
        </span>
      </motion.button>
    </li>
  );
}

export function PublicMenu({ name, nameEn = "", iconUrl, contact = null, banners = [], categories, loading = false, onBack }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [board, setBoard] = useState("main");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useState("list");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const [lang, setLang] = useState("en");
  const shownName = restaurantTitle({ name, name_en: nameEn }, lang);
  const boarded = categoriesForBoard(categories, board);
  const visible = visibleCategories(boarded, query);
  const cards = menuCards(visible);
  const shown = visible.some((item) => item.sourceIndex === active) ? active : (visible[0]?.sourceIndex ?? active);
  const menuRef = useRef(null);
  const barRef = useRef(null);
  const categoryBarRef = useRef(null);
  const stripRef = useRef(null);
  const sheetRef = useRef(null);
  const pauseSpy = useRef(false);
  const pauseToken = useRef(0);
  const readSpy = useRef(() => {});
  const title = boardTitle(board, lang);
  const sectionKey = visible.map((item) => `${item.sourceIndex}:${item.items.length}`).join("|");
  const itemGridClass =
    layout === "list"
      ? "flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
      : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    const root = menuRef.current;
    if (!bar || !root) return undefined;
    const apply = () => {
      const header = bar.offsetHeight;
      const chips = categoryBarRef.current?.offsetHeight ?? 0;
      root.style.setProperty("--menu-sticky", `${header}px`);
      root.style.setProperty("--menu-anchor", `${header + chips}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    if (categoryBarRef.current) observer.observe(categoryBarRef.current);
    return () => observer.disconnect();
  }, [sectionKey, loading, visible.length, banners.length]);

  useEffect(() => {
    const root = sheetRef.current;
    if (!root || visible.length === 0) return undefined;

    let frame = 0;
    function read() {
      if (pauseSpy.current) return;
      const headerBottom = barRef.current?.getBoundingClientRect().bottom ?? 0;
      const chips = categoryBarRef.current?.getBoundingClientRect();
      const chipsStuck = chips && chips.top <= headerBottom + 1;
      const marker = (chipsStuck ? chips.bottom : headerBottom) + 24;
      const sections = [...root.querySelectorAll("[data-menu-section]")].map((node) => {
        const rect = node.getBoundingClientRect();
        return { index: Number(node.dataset.menuSection), top: rect.top, bottom: rect.bottom };
      });
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const next = categoryIndexAtMarker(sections, { marker, viewportHeight: window.innerHeight, atEnd });
      if (next === null || Number.isNaN(next)) return;
      setActive((current) => (current === next ? current : next));
    }

    readSpy.current = read;

    function onScroll() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(read);
    }

    frame = window.requestAnimationFrame(read);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sectionKey, visible.length]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return undefined;
    const chip = strip.querySelector(`[data-category-index="${shown}"]`);
    if (!chip) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const stripBox = strip.getBoundingClientRect();
      const chipBox = chip.getBoundingClientRect();
      const fullyVisible = chipBox.left >= stripBox.left + 8 && chipBox.right <= stripBox.right - 8;
      if (fullyVisible) return;
      const delta = chipBox.left + chipBox.width / 2 - (stripBox.left + stripBox.width / 2);
      strip.scrollBy({ left: delta, behavior: reduceMotion ? "auto" : "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shown, sectionKey, reduceMotion]);

  function leave() {
    if (!onBack) return;
    window.scrollTo(0, 0);
    onBack();
  }

  function revealCategory(itemIndex) {
    const section = sheetRef.current?.querySelector(`[data-menu-section="${itemIndex}"]`);
    if (!section) {
      pauseSpy.current = false;
      return;
    }
    const token = pauseToken.current + 1;
    pauseToken.current = token;
    pauseSpy.current = true;
    section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    const follow = () => stop(true);
    function stop(sync) {
      window.removeEventListener("scrollend", stop);
      window.removeEventListener("wheel", follow);
      window.removeEventListener("touchmove", follow);
      if (pauseToken.current !== token) return;
      pauseSpy.current = false;
      if (sync) readSpy.current();
    }
    window.addEventListener("scrollend", stop);
    window.addEventListener("wheel", follow, { passive: true });
    window.addEventListener("touchmove", follow, { passive: true });
    window.setTimeout(stop, reduceMotion ? 80 : 900);
  }

  function chooseCategory(itemIndex) {
    setActive(itemIndex);
    setFiltersOpen(false);
    pauseSpy.current = true;
    window.setTimeout(() => revealCategory(itemIndex), 40);
  }

  function chooseBoard(next) {
    const nextVisible = visibleCategories(categoriesForBoard(categories, next), query);
    setBoard(next);
    setActive(nextVisible[0]?.sourceIndex ?? 0);
    setPickerOpen(false);
    pauseSpy.current = true;
    window.scrollTo(0, 0);
    window.setTimeout(() => {
      pauseSpy.current = false;
    }, 80);
  }

  const showStrip = visible.length > 0;
  const emptyMessage =
    categories.length === 0
      ? phrase("menuEmpty", lang)
      : boarded.length === 0 && board === "offer"
        ? phrase("menuOffersEmpty", lang)
        : boarded.length === 0 && board === "new"
          ? phrase("menuNewEmpty", lang)
          : phrase("menuNoMatch", lang);

  return (
    <div ref={menuRef} dir={lang === "en" ? "ltr" : "rtl"} className="flex w-full flex-col font-detail [overflow-anchor:none]">
      <div ref={barRef} className="sticky top-0 z-30 -mx-4 bg-ivory/95 px-4 backdrop-blur-md sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="flex min-w-0 items-center gap-3 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={leave}
              aria-label={phrase("backToNumber", lang)}
              className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink/70 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <BackIcon className={lang === "en" ? "-scale-x-100" : ""} />
            </button>
          ) : null}
          {iconUrl ? (
            <img src={iconUrl} alt="" className="size-10 shrink-0 rounded-full bg-photo object-cover ring-1 ring-black/5 sm:size-12 md:size-14" />
          ) : null}
          {shownName ? <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink sm:text-base md:text-lg">{shownName}</h1> : <span className="flex-1" />}
          <div role="group" aria-label={lang === "en" ? "Language" : "اللغة"} className="ms-auto flex shrink-0 rounded-full bg-white p-1 ring-1 ring-burgundy/15">
            <button
              type="button"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${lang === "en" ? "bg-burgundy text-on-primary" : "text-burgundy"}`}
            >
              EN
            </button>
            <button
              type="button"
              aria-pressed={lang === "ar"}
              onClick={() => setLang("ar")}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${lang === "ar" ? "bg-burgundy text-on-primary" : "text-burgundy"}`}
            >
              AR
            </button>
          </div>
          {/* <RestaurantContact contact={contact} icons /> */}
        </div>

        {!loading && categories.length > 0 ? (
          <div className="flex items-center gap-2 pb-3">
            <div className="relative min-w-0 flex-1">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={phrase("menuSearch", lang)}
                aria-label={phrase("menuSearch", lang)}
                enterKeyHint="search"
                autoComplete="off"
                className="h-11 w-full rounded-full border border-black/10 bg-white ps-11 pe-4 text-sm text-ink outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-gold"
              />
            </div>
            <button
              type="button"
              aria-label={phrase("menuCategories", lang)}
              aria-expanded={filtersOpen}
              title={phrase("menuCategories", lang)}
              disabled={!showStrip}
              onClick={() => {
                setPickerOpen(false);
                setFiltersOpen(true);
              }}
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white text-burgundy shadow-[0_8px_18px_-12px_rgba(74,4,24,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-default disabled:opacity-40"
            >
              <Funnel size={20} weight="regular" />
            </button>
          </div>
        ) : null}
      </div>

      {banners.length > 0 ? (
        <BannerHero banners={banners} />
      ) : null}

      {!loading && showStrip ? (
        <div
          ref={categoryBarRef}
          className="sticky z-20 -mx-4 bg-ivory/95 px-4 py-2 backdrop-blur-md sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12"
          style={{ top: "var(--menu-sticky, 4.75rem)" }}
        >
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              aria-label={phrase("menuPick", lang)}
              aria-expanded={pickerOpen}
              title={phrase("menuPick", lang)}
              onClick={() => {
                setFiltersOpen(false);
                setPickerOpen(true);
              }}
              className="me-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <BarsIcon />
            </button>
            <div className="min-w-0 flex-1">
              <CategoryStrip categories={visible} active={shown} onChoose={chooseCategory} stripRef={stripRef} lang={lang} />
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-16 text-center text-base font-semibold text-burgundy-deep">{phrase("menuLoading", lang)}</p>
      ) : cards.length > 0 ? (
        <div ref={sheetRef} className="mt-4 sm:mt-6">
          {board !== "main" ? (
            <h2 className="mb-4 font-detail text-[1.35rem] leading-8 font-bold text-ink">{title}</h2>
          ) : null}
          <div className="flex flex-col gap-8">
            {visible.map((group, groupIndex) => (
              <section
                key={`${board}-${group.sourceIndex}`}
                data-menu-section={group.sourceIndex}
                aria-labelledby={`menu-category-${group.sourceIndex}`}
                className="scroll-mt-[calc(var(--menu-anchor,var(--menu-sticky,9rem))+0.75rem)]"
              >
                <motion.div
                  className="mb-3.5 flex items-center justify-between gap-3"
                  initial={reduceMotion ? false : { y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35, delay: groupIndex * 0.05, ease: "easeOut" }}
                >
                  <h2 id={`menu-category-${group.sourceIndex}`} className="min-w-0 truncate font-detail text-[1.35rem] leading-8 font-bold text-ink">
                    {localized(group.name, lang)}
                  </h2>
                  {groupIndex === 0 ? <LayoutSwitch layout={layout} onChange={setLayout} lang={lang} /> : null}
                </motion.div>
                <ul className={itemGridClass}>
                  {cards
                    .filter((item) => item.sourceIndex === group.sourceIndex)
                    .map((item, itemIndex) => (
                      <MenuItemCard key={item.key} item={item} layout={layout} onOpen={setDetail} lang={lang} index={itemIndex} />
                    ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <section className="mt-6">
          {categories.length > 0 ? (
            <h2 className="mb-3.5 min-w-0 truncate font-detail text-[1.35rem] leading-8 font-bold text-ink">{title}</h2>
          ) : null}
          <p className="rounded-[1.35rem] bg-white px-4 py-10 text-center text-base font-semibold text-burgundy-deep shadow-[0_14px_32px_-20px_rgba(42,16,22,0.28)] ring-1 ring-black/[0.04]">
            {emptyMessage}
          </p>
        </section>
      )}

      {pickerOpen ? <MenuBoardSheet board={board} lang={lang} onChoose={chooseBoard} onClose={() => setPickerOpen(false)} /> : null}
      {filtersOpen ? (
        <CategoryFilterSheet
          categories={visible}
          active={shown}
          lang={lang}
          onChoose={chooseCategory}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
      {detail ? (
        <ItemDialog item={detail} lang={lang} onClose={() => setDetail(null)} />
      ) : null}
    </div>
  );
}
