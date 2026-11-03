"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { menuAssetSrc } from "@/lib/api/client";
import { customerCopy } from "@/lib/customer/public";
import { formatPrice } from "@/lib/menu/menu";

const allCategories = -1;

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

function RoundPhoto({ src, label, className }) {
  const asset = useAsset(src);
  if (asset.visible) {
    return (
      // The address is an absolute API file. A missing image is 404.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={asset.resolved} alt="" loading="lazy" onError={asset.fail} className={`object-cover ${className}`} />
    );
  }

  const mark = [...String(label || "•")][0] || "•";
  return (
    <span aria-hidden="true" className={`grid place-items-center bg-[#f3e6c8] font-display font-semibold text-burgundy ${className}`}>
      {mark}
    </span>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

function PriceTag({ amount }) {
  if (!amount) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f7f1e4] px-2.5 py-1 ring-1 ring-gold/50">
      <span dir="ltr" translate="no" className="font-sans text-sm font-bold text-burgundy-deep">
        {amount}
      </span>
      <span className="text-[11px] font-bold text-gold-deep">ل.س</span>
    </span>
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

function visibleCategories(categories, query) {
  const needle = foldText(query);
  return categories.flatMap((category, sourceIndex) => {
    if (!needle) return [{ ...category, sourceIndex }];
    const categoryHit = foldText(category.name.ar).includes(needle);
    const items = categoryHit
      ? category.items
      : category.items.filter((item) => foldText(`${item.name.ar} ${item.description.ar || ""}`).includes(needle));
    if (items.length === 0) return [];
    return [{ ...category, items, sourceIndex }];
  });
}

function menuCards(visible, active) {
  const category = visible.find((item) => item.sourceIndex === active) || null;
  const groups = category ? [category] : visible;
  return {
    allSelected: !category,
    title: category ? category.name.ar : customerCopy.menuAll,
    cards: groups.flatMap((group) =>
      group.items.map((item, itemIndex) => ({
        ...item,
        categoryName: group.name.ar,
        key: `${group.sourceIndex}-${item.name.ar}-${itemIndex}`,
      })),
    ),
  };
}

function ItemDialog({ item, onClose }) {
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const price = item.price === null ? "" : formatPrice(item.price);

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
      aria-labelledby="menu-item-title"
      className="mb-0 mt-auto w-full max-w-lg rounded-t-[1.6rem] border-0 bg-transparent p-0 text-ink backdrop:bg-burgundy-deep/50 sm:m-auto sm:rounded-[1.6rem]"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
        className="max-h-[92dvh] overflow-y-auto rounded-t-[1.6rem] bg-paper shadow-[0_30px_60px_-28px_rgba(74,4,24,0.55)] sm:rounded-[1.6rem]"
      >
        <div className="relative">
          <RoundPhoto src={item.photoUrl} label={item.name.ar} className="aspect-[4/3] w-full text-5xl sm:aspect-[16/10]" />
          <button
            type="button"
            onClick={onClose}
            aria-label={customerCopy.menuClose}
            className="absolute top-3 end-3 inline-flex size-10 cursor-pointer items-center justify-center rounded-2xl bg-ivory/95 text-burgundy shadow-sm ring-1 ring-burgundy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="text-xs font-bold text-gold-deep">{item.categoryName}</p>
          <div className="flex items-start justify-between gap-3">
            <h2 id="menu-item-title" className="font-display text-3xl leading-10 font-bold text-burgundy-deep">
              {item.name.ar}
            </h2>
            <PriceTag amount={price} />
          </div>
          {item.description.ar ? <p className="text-base leading-8 text-ink/70">{item.description.ar}</p> : null}
          <p className="text-xs leading-5 text-ink/45">{customerCopy.menuPrices}</p>
        </div>
      </motion.div>
    </dialog>
  );
}

function CategoryStrip({ categories, active, onChoose }) {
  const scrollerRef = useRef(null);
  const spread = categories.length > 0 && categories.length <= 4;

  return (
    <div
      ref={scrollerRef}
      role="tablist"
      aria-label={customerCopy.menuHeading}
      className={
        spread
          ? "grid grid-cols-4 gap-2.5"
          : "flex gap-2.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      }
    >
      {categories.map((item) => {
        const isSelected = item.sourceIndex === active;
        return (
          <button
            key={`${item.name.ar}-${item.sourceIndex}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={(event) => onChoose(item.sourceIndex, event.currentTarget)}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-[1.15rem] bg-white px-1.5 py-3 shadow-[0_10px_24px_-18px_rgba(42,16,22,0.45)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              spread ? "min-w-0" : "w-[4.7rem] shrink-0"
            } ${isSelected ? "ring-2 ring-burgundy" : "ring-1 ring-black/[0.04]"}`}
          >
            <RoundPhoto src={item.iconUrl} label={item.name.ar} className="size-12 rounded-full text-sm" />
            <span className={`line-clamp-2 w-full text-center text-[11px] leading-4 font-medium ${isSelected ? "font-semibold text-burgundy-deep" : "text-ink/60"}`}>
              {item.name.ar}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PublicMenu({ name, iconUrl, categories, loading = false, onBack }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(allCategories);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const visible = visibleCategories(categories, query);
  const view = menuCards(visible, active);
  const sheetRef = useRef(null);
  const opened = useRef(false);
  const heading = view.allSelected ? customerCopy.menuHeading : view.title;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    sheetRef.current?.scrollIntoView({ block: "start" });
  }, [active]);

  function leave() {
    window.scrollTo(0, 0);
    onBack();
  }

  function chooseCategory(itemIndex, button) {
    setActive(itemIndex);
    button?.scrollIntoView({ inline: "center", block: "nearest" });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col [overflow-anchor:none]">
      <div className="relative flex min-h-11 items-center justify-center">
        <button
          type="button"
          onClick={leave}
          aria-label={customerCopy.backToNumber}
          className="absolute start-0 inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink/70 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <BackIcon />
        </button>
        <div className="flex max-w-[16rem] items-center gap-1.5 px-10">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="size-6 shrink-0 rounded-full object-cover ring-1 ring-black/5" />
          ) : null}
          {name ? <h1 className="truncate text-sm font-semibold text-ink">{name}</h1> : null}
        </div>
      </div>

      {!loading && categories.length > 0 ? (
        <div className="mt-3 flex flex-col gap-4">
          <div className="relative">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={customerCopy.menuSearch}
              aria-label={customerCopy.menuSearch}
              enterKeyHint="search"
              autoComplete="off"
              className="h-12 w-full rounded-full border-0 bg-white ps-11 pe-4 text-sm text-ink shadow-[0_10px_28px_-16px_rgba(42,16,22,0.4)] ring-1 ring-black/[0.04] outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-gold"
            />
          </div>
          {visible.length > 0 ? (
            <CategoryStrip categories={visible} active={active} onChoose={chooseCategory} />
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-16 text-center text-base font-semibold text-burgundy-deep">{customerCopy.menuLoading}</p>
      ) : view.cards.length > 0 ? (
        <section ref={sheetRef} aria-label={heading} className="mt-6 scroll-mt-4">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate font-display text-[1.35rem] leading-8 font-bold text-ink">{heading}</h2>
            <button
              type="button"
              onClick={() => setActive(allCategories)}
              className="shrink-0 cursor-pointer text-sm font-bold text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {customerCopy.menuAll}
            </button>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul
              key={view.allSelected ? "all" : String(active)}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className="grid grid-cols-2 gap-3"
            >
              {view.cards.map((item) => {
                const price = item.price === null ? "" : formatPrice(item.price);
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => setDetail(item)}
                      className="flex h-full w-full cursor-pointer flex-col rounded-[1.35rem] bg-white p-2 text-start shadow-[0_14px_32px_-20px_rgba(42,16,22,0.4)] ring-1 ring-black/[0.04] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[0.99]"
                    >
                      <span className="block overflow-hidden rounded-[1.05rem]">
                        <RoundPhoto src={item.photoUrl} label={item.name.ar} className="aspect-[5/4] w-full text-3xl" />
                      </span>
                      <span className="flex flex-1 flex-col items-center px-1.5 pt-3 pb-1.5 text-center">
                        <span className="line-clamp-2 w-full text-center font-display text-[15px] leading-6 font-semibold text-ink">{item.name.ar}</span>
                        {price ? (
                          <span className="mt-3 flex w-full items-baseline justify-center gap-1.5 border-t border-black/[0.06] pt-2">
                            <span dir="ltr" translate="no" className="font-sans text-sm font-bold text-burgundy">
                              {price}
                            </span>
                            <span className="text-[11px] font-semibold text-ink/45">ل.س</span>
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </AnimatePresence>
          <p className="mt-6 text-center text-[11px] leading-5 text-ink/40">{customerCopy.menuPrices}</p>
        </section>
      ) : (
        <p className="mt-8 rounded-[1.35rem] bg-white px-4 py-10 text-center text-base font-semibold text-burgundy-deep shadow-[0_14px_32px_-20px_rgba(42,16,22,0.28)] ring-1 ring-black/[0.04]">
          {categories.length > 0 ? customerCopy.menuNoMatch : customerCopy.menuEmpty}
        </p>
      )}

      {detail ? <ItemDialog item={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
