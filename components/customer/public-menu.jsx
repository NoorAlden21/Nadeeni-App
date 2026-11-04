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

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
      <path d="M3.2 4.4h9.4L9.2 8.8 8.2 9.7v6.1l-2.4-1.4V9.7L3.2 4.4z" />
      <path d="M14.2 5h6.6v1.7h-6.6zM13.4 11h7.4v1.7h-7.4zM13.4 17h7.4v1.7h-7.4z" />
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

function boardTitle(board) {
  if (board === "offer") return customerCopy.menuOffers;
  if (board === "new") return customerCopy.menuNew;
  return customerCopy.menuHeading;
}

function categoriesForBoard(categories, board) {
  if (board === "main") return categories;
  return categories.flatMap((category) => {
    const items = category.items.filter((item) => item.badge === board);
    return items.length ? [{ ...category, items }] : [];
  });
}

function ItemBadge({ badge }) {
  if (badge !== "new" && badge !== "offer") return null;
  const offer = badge === "offer";
  return (
    <span
      className={`absolute top-2 start-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        offer ? "bg-[#f7f1e4] text-gold-deep ring-1 ring-gold/60" : "bg-burgundy text-ivory"
      }`}
    >
      {offer ? customerCopy.badgeOffer : customerCopy.badgeNew}
    </span>
  );
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
          <ItemBadge badge={item.badge} />
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

const menuBoards = [
  { id: "offer", label: customerCopy.menuOffers },
  { id: "new", label: customerCopy.menuNew },
  { id: "main", label: customerCopy.menuMain },
];

function MenuBoardSheet({ board, onChoose, onClose }) {
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
          <h2 id="menu-board-title" className="font-display text-2xl font-bold text-ink">
            {customerCopy.menuPick}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={customerCopy.menuClose}
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
                  selected ? "bg-[#f3f1ec] text-ink" : "text-ink/75"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </motion.div>
    </dialog>
  );
}

function CategoryFilterSheet({ categories, active, onChoose, onClose }) {
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
            {customerCopy.menuCategories}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={customerCopy.menuClose}
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
                      selected ? "bg-[#f3f1ec]" : "hover:bg-[#f7f4ee]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className={`min-w-0 ${selected ? "font-semibold text-ink" : "text-ink/80"}`}>{item.name.ar}</span>
                      <span
                        dir="ltr"
                        translate="no"
                        className={`font-sans text-xs ${selected ? "font-semibold text-ink/55" : "text-ink/40"}`}
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

function LayoutSwitch({ layout, onChange }) {
  return (
    <div className="flex w-max shrink-0 items-center rounded-lg border border-black/10 bg-white sm:hidden">
      {[
        ["grid", customerCopy.menuGrid, <GridIcon key="grid" />],
        ["list", customerCopy.menuList, <ListIcon key="list" />],
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
              selected ? "bg-[#f3f1ec] text-ink" : "text-ink/55"
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
      ? "border-burgundy bg-burgundy text-ivory shadow-[0_8px_18px_-12px_rgba(74,4,24,0.85)]"
      : "border-black/10 bg-white text-ink/70"
  }`;
}

function CategoryStrip({ categories, active, onChoose }) {
  const listed = categories.some((item) => item.sourceIndex === active);

  return (
    <div
      role="tablist"
      aria-label={customerCopy.menuHeading}
      className="flex min-w-0 gap-2 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!listed}
        data-category-index={allCategories}
        onClick={(event) => onChoose(allCategories, event.currentTarget)}
        className={pillClass(!listed)}
      >
        {customerCopy.menuAll}
      </button>
      {categories.map((item) => {
        const isSelected = item.sourceIndex === active;
        return (
          <button
            key={`${item.name.ar}-${item.sourceIndex}`}
            type="button"
            role="tab"
            data-category-index={item.sourceIndex}
            aria-selected={isSelected}
            onClick={(event) => onChoose(item.sourceIndex, event.currentTarget)}
            className={pillClass(isSelected)}
          >
            {item.name.ar}
          </button>
        );
      })}
    </div>
  );
}

export function PublicMenu({ name, iconUrl, categories, loading = false, onBack }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(allCategories);
  const [board, setBoard] = useState("main");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useState("list");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const boarded = categoriesForBoard(categories, board);
  const visible = visibleCategories(boarded, query);
  const view = menuCards(visible, active);
  const sheetRef = useRef(null);
  const opened = useRef(false);
  const title = boardTitle(board);
  const heading = view.allSelected ? title : view.title;

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
    setFiltersOpen(false);
    const target = button || document.querySelector(`[data-category-index="${itemIndex}"]`);
    target?.scrollIntoView({ inline: "center", block: "nearest" });
  }

  function chooseBoard(next) {
    setBoard(next);
    setActive(allCategories);
    setPickerOpen(false);
  }

  const showStrip = visible.length > 0;
  const emptyMessage =
    categories.length === 0
      ? customerCopy.menuEmpty
      : boarded.length === 0 && board === "offer"
        ? customerCopy.menuOffersEmpty
        : boarded.length === 0 && board === "new"
          ? customerCopy.menuNewEmpty
          : customerCopy.menuNoMatch;

  return (
    <div className="flex w-full flex-col [overflow-anchor:none]">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={leave}
          aria-label={customerCopy.backToNumber}
          className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink/70 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <BackIcon />
        </button>
        {iconUrl ? (
          <img src={iconUrl} alt="" className="size-10 shrink-0 rounded-full bg-[#f3e6c8] object-cover ring-1 ring-black/5 sm:size-12 md:size-14" />
        ) : null}
        {name ? <h1 className="min-w-0 truncate text-sm font-semibold text-ink sm:text-base md:text-lg">{name}</h1> : null}
      </div>

      {!loading && categories.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex w-full items-center gap-2 sm:order-2 sm:w-1/3 sm:min-w-0">
            <div className="relative min-w-0 flex-1">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={customerCopy.menuSearch}
                aria-label={customerCopy.menuSearch}
                enterKeyHint="search"
                autoComplete="off"
                className="h-11 w-full rounded-full border border-black/10 bg-white ps-11 pe-4 text-sm text-ink outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-gold"
              />
            </div>
            <button
              type="button"
              aria-label={customerCopy.menuCategories}
              aria-expanded={filtersOpen}
              title={customerCopy.menuCategories}
              disabled={!showStrip}
              onClick={() => {
                setPickerOpen(false);
                setFiltersOpen(true);
              }}
              className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-burgundy text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-default disabled:opacity-40"
            >
              <FilterIcon />
            </button>
          </div>
          <div className="flex min-w-0 items-center sm:order-1 sm:w-2/3">
            <button
              type="button"
              aria-label={customerCopy.menuPick}
              aria-expanded={pickerOpen}
              title={customerCopy.menuPick}
              onClick={() => {
                setFiltersOpen(false);
                setPickerOpen(true);
              }}
              className="me-2 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <BarsIcon />
            </button>
            {showStrip ? (
              <div className="min-w-0 flex-1">
                <CategoryStrip categories={visible} active={active} onChoose={chooseCategory} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-16 text-center text-base font-semibold text-burgundy-deep">{customerCopy.menuLoading}</p>
      ) : view.cards.length > 0 ? (
        <section ref={sheetRef} aria-label={heading} className="mt-4 scroll-mt-4 sm:mt-6">
          <div className="mb-3 flex justify-end sm:hidden">
            <LayoutSwitch layout={layout} onChange={setLayout} />
          </div>
          <h2 className="mb-3.5 min-w-0 truncate font-display text-[1.35rem] leading-8 font-bold text-ink">{heading}</h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul
              key={`${board}-${layout}-${view.allSelected ? "all" : active}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className={
                layout === "list"
                  ? "flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
                  : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              }
            >
              {view.cards.map((item) => {
                const price = item.price === null ? "" : formatPrice(item.price);
                return (
                  <li key={item.key}>
                    {layout === "list" ? (
                      <button
                        type="button"
                        onClick={() => setDetail(item)}
                        className="flex w-full cursor-pointer flex-row items-stretch gap-3 rounded-2xl bg-white px-3 py-3 text-start shadow-[0_10px_30px_rgba(42,16,22,0.08)] ring-1 ring-black/[0.04] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[0.99] sm:hidden"
                      >
                        <span className="relative size-32 shrink-0 overflow-hidden rounded-2xl">
                          <RoundPhoto src={item.photoUrl} label={item.name.ar} className="size-full text-3xl" />
                          <ItemBadge badge={item.badge} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
                          <span className="min-w-0">
                            <span className="line-clamp-2 font-display text-base leading-tight font-bold text-ink">{item.name.ar}</span>
                            {item.description.ar ? (
                              <span className="mt-1 line-clamp-3 block text-sm leading-snug whitespace-pre-line text-ink/50">
                                {item.description.ar}
                              </span>
                            ) : null}
                          </span>
                          {price ? (
                            <span className="flex items-baseline gap-1">
                              <span dir="ltr" translate="no" className="font-sans text-base font-bold text-burgundy">
                                {price}
                              </span>
                              <span className="text-xs font-semibold text-ink/45">ل.س</span>
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setDetail(item)}
                      className={`${layout === "list" ? "hidden sm:flex" : "flex"} h-full w-full cursor-pointer flex-col rounded-[1.35rem] bg-white p-2 text-start shadow-[0_14px_32px_-20px_rgba(42,16,22,0.4)] ring-1 ring-black/[0.04] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[0.99]`}
                    >
                      <span className="relative block overflow-hidden rounded-[1.05rem]">
                        <RoundPhoto src={item.photoUrl} label={item.name.ar} className="aspect-[5/4] w-full text-3xl" />
                        <ItemBadge badge={item.badge} />
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
        </section>
      ) : (
        <section className="mt-6">
          {categories.length > 0 ? (
            <h2 className="mb-3.5 min-w-0 truncate font-display text-[1.35rem] leading-8 font-bold text-ink">{title}</h2>
          ) : null}
          <p className="rounded-[1.35rem] bg-white px-4 py-10 text-center text-base font-semibold text-burgundy-deep shadow-[0_14px_32px_-20px_rgba(42,16,22,0.28)] ring-1 ring-black/[0.04]">
            {emptyMessage}
          </p>
        </section>
      )}

      {pickerOpen ? <MenuBoardSheet board={board} onChoose={chooseBoard} onClose={() => setPickerOpen(false)} /> : null}
      {filtersOpen ? (
        <CategoryFilterSheet
          categories={visible}
          active={active}
          onChoose={chooseCategory}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
      {detail ? <ItemDialog item={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
