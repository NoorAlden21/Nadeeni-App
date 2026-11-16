"use client";

import { Ban, Eye, EyeOff } from "lucide-react";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast, Toaster } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { OptimizedImage } from "@/components/media/optimized-image";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
import { isFeatureUnavailable } from "@/lib/features";
import { formatPrice, imageFileError, itemCountLabel, menuErrorText, nextSortOrder, sortOrdersForMove } from "@/lib/menu/menu";
import { MenuFormDialog } from "@/components/menu/menu-form-dialog";

function Glyph({ children, className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-5 shrink-0 ${className}`}
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function PlusIcon() {
  return (
    <Glyph>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </Glyph>
  );
}

function PencilIcon() {
  return (
    <Glyph>
      <path d="M4 20h4L18.2 9.8a1.8 1.8 0 0 0 0-2.5L16.7 5.8a1.8 1.8 0 0 0-2.5 0L4 16v4Z" />
      <path d="m13.2 6.8 4 4" />
    </Glyph>
  );
}

function ChevronUpIcon() {
  return (
    <Glyph>
      <path d="m6 14 6-6 6 6" />
    </Glyph>
  );
}

function ChevronDownIcon({ className = "" }) {
  return (
    <Glyph className={className}>
      <path d="m6 10 6 6 6-6" />
    </Glyph>
  );
}

function BanIcon() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="7.2" />
      <path d="m7.2 7.2 9.6 9.6" />
    </Glyph>
  );
}

function CheckIcon() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="7.2" />
      <path d="m8.4 12.2 2.4 2.4 4.8-5" />
    </Glyph>
  );
}

function TrashIcon() {
  return (
    <Glyph>
      <path d="M4.5 7.2h15" />
      <path d="M9.2 7.2V5.4h5.6v1.8" />
      <path d="m8.2 7.2.7 11.2h6.2l.7-11.2" />
    </Glyph>
  );
}

function RowButton({ icon, children, tone = "default", ...props }) {
  const tones = {
    default: "bg-white text-burgundy-deep ring-burgundy/15 hover:bg-foam",
    quiet: "bg-wash text-gold-deep ring-gold/30 hover:bg-gold/25",
    danger: "bg-white text-burgundy ring-burgundy/15 hover:bg-foam",
  };

  return (
    <button
      type="button"
      className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold whitespace-nowrap ring-1 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-40 ${tones[tone]}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

const headCell = "px-3 py-3 text-start text-xs font-bold text-burgundy-deep/70";
const bodyCell = "px-3 py-2 align-middle";

function Pill({ on, onLabel, offLabel }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ${
        on ? "bg-foam text-burgundy ring-burgundy/10" : "bg-ivory text-ink/45 ring-burgundy/10"
      }`}
    >
      {on ? onLabel : offLabel}
    </span>
  );
}

function DotsIcon() {
  return (
    <Glyph>
      <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

function CustomerVisibilityButton({
  visible,
  disabled,
  name,
  onClick,
  tone = "category",
  activeText = "إخفاء عن الزبون",
  inactiveText = "إظهار للزبون",
  activeTitle,
  inactiveTitle,
}) {
  const text = visible ? activeText : inactiveText;
  const itemTone = tone === "item";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={visible}
      title={visible ? activeTitle || `إخفاء ${name}` : inactiveTitle || `إظهار ${name}`}
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 ${
        itemTone
          ? visible
            ? "rounded-xl bg-transparent px-2 text-gold-deep hover:bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]"
            : "rounded-xl bg-transparent px-2 text-muted-foreground hover:bg-muted"
          : visible
            ? "rounded-xl bg-transparent px-2 text-primary hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
            : "rounded-xl bg-transparent px-2 text-muted-foreground hover:bg-muted"
      }`}
    >
      {itemTone ? (
        <Ban className="size-4 shrink-0" aria-hidden="true" />
      ) : visible ? (
        <Eye className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <EyeOff className="size-4 shrink-0" aria-hidden="true" />
      )}
      {text}
    </button>
  );
}

function placeMenu(trigger, menu) {
  const rect = trigger.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const pad = 12;
  const offset = 6;
  const bounds = document.documentElement;
  const viewWidth = bounds.clientWidth;
  const viewHeight = window.innerHeight;
  const below = rect.bottom + offset;
  const above = rect.top - offset - height;
  let top = below;
  if (below + height > viewHeight - pad && above >= pad) {
    top = above;
  } else if (below + height > viewHeight - pad) {
    top = Math.max(pad, viewHeight - pad - height);
  }
  let left = rect.right - width;
  if (left < pad) {
    left = pad;
  }
  if (left + width > viewWidth - pad) {
    left = Math.max(pad, viewWidth - pad - width);
  }
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.right = "auto";
}

function RowMenu({ label, children }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }
    const trigger = buttonRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) {
      return undefined;
    }

    function place() {
      placeMenu(trigger, menu);
    }
    place();

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function onPointerDown(event) {
      const target = event.target;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => setOpen((current) => !current)}
        className={`relative inline-flex size-9 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-foreground outline-none ring-0 before:absolute before:-inset-1 hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] data-[state=open]:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] data-[state=open]:ring-0 ${
          open ? "" : "focus-visible:ring-2 focus-visible:ring-ring"
        }`}
      >
        <DotsIcon />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              dir="rtl"
              data-side="bottom"
              data-align="start"
              className="fixed z-50 min-w-44 rounded-xl bg-paper p-1 text-foreground shadow-[0_16px_40px_-24px_color-mix(in_srgb,var(--color-primary)_35%,transparent)] ring-1 ring-border"
            >
              {typeof children === "function" ? children(() => setOpen(false)) : children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MenuItem({ destructive = false, disabled = false, title, onSelect, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      title={title}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onSelect();
        }
      }}
      className={`flex min-h-11 w-full cursor-pointer items-center rounded-lg px-3 py-2 text-start text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive ? "text-destructive" : "text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Thumb({ src, label, frame = "size-10 shrink-0 rounded-lg" }) {
  const [failedSrc, setFailedSrc] = useState("");
  const failed = Boolean(src) && failedSrc === src;

  if (src && !failed) {
    return (
      <span className={`relative block overflow-hidden ${frame} ring-1 ring-burgundy/10`}>
        <OptimizedImage src={src} alt="" fill sizes="40px" onError={() => setFailedSrc(src)} className="object-cover" />
      </span>
    );
  }

  const mark = [...String(label || "•")][0] || "•";
  return (
    <span
      aria-hidden="true"
      className={`grid ${frame} place-items-center bg-foam font-display text-base font-semibold text-burgundy`}
    >
      {mark}
    </span>
  );
}

function blankCategory(sort) {
  return {
    name_ar: "",
    name_en: "",
    sort_order: String(sort),
    is_active: true,
  };
}

function blankItem(categoryId, sort) {
  return {
    category_id: String(categoryId),
    name_ar: "",
    name_en: "",
    description_ar: "",
    description_en: "",
    price: "",
    sort_order: String(sort),
    is_available: true,
    badge: "",
  };
}

function categoryForm(category) {
  return {
    name_ar: category.name?.ar || "",
    name_en: category.name?.en || "",
    sort_order: String(category.sort_order ?? 0),
    is_active: Boolean(category.is_active),
  };
}

function itemForm(item) {
  return {
    category_id: String(item.category_id),
    name_ar: item.name?.ar || "",
    name_en: item.name?.en || "",
    description_ar: item.description?.ar || "",
    description_en: item.description?.en || "",
    price: String(item.price ?? ""),
    sort_order: String(item.sort_order ?? 0),
    is_available: Boolean(item.is_available),
    badge: item.badge === "new" || item.badge === "offer" ? item.badge : "",
  };
}

function ItemsDialog({ category, busy, onClose, onCreate, onEdit, onToggle, onMove, onDelete }) {
  const dialogRef = useRef(null);
  const items = Array.isArray(category?.items) ? category.items : [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (category && !dialog.open) {
      dialog.showModal();
    } else if (!category && dialog.open) {
      dialog.close();
    }
  }, [category]);

  function handleBackdrop(event) {
    if (event.target === dialogRef.current && !busy) {
      dialogRef.current.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="menu-items-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) {
          event.preventDefault();
        }
      }}
      onClick={handleBackdrop}
      className="m-auto max-h-[min(44rem,calc(100%-2rem))] w-[min(68rem,calc(100%-2rem))] overflow-y-auto rounded-[1.6rem] border-0 bg-paper p-5 text-ink shadow-[0_24px_60px_-28px_rgba(74,4,24,0.55)] backdrop:bg-ink/40"
    >
      {category ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="menu-items-title" className="font-display text-2xl font-semibold text-burgundy-deep">
                عناصر {category.name?.ar}
              </h2>
              <p className="mt-1 text-sm text-ink/50">{itemCountLabel(items.length)}</p>
            </div>
            <ActionButton variant="quiet" onClick={onCreate} disabled={busy}>
              <PlusIcon />
              عنصر جديد
            </ActionButton>
          </div>

          {items.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-burgundy/15 px-4 py-10 text-center text-sm text-ink/45">
              لا عناصر في هذا التصنيف.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-burgundy/10">
              <table className="w-full min-w-[640px] border-collapse bg-white">
                <thead className="bg-wash">
                  <tr className="border-b border-burgundy/10">
                    <th className={headCell}>العنصر</th>
                    <th className={headCell}>الوصف</th>
                    <th className={headCell}>السعر</th>
                    <th className={headCell}>الحالة</th>
                    <th className={headCell}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, itemIndex) => (
                    <tr
                      key={item.id}
                      className={`border-b border-burgundy/5 last:border-0 ${item.is_available ? "" : "opacity-70"}`}
                    >
                      <td className={bodyCell}>
                        <div className="flex items-center gap-3">
                          <Thumb src={item.photo_url} label={item.name?.ar} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-burgundy-deep">{item.name?.ar}</p>
                            {item.badge === "new" || item.badge === "offer" ? (
                              <p className="text-xs font-semibold text-gold-deep">{item.badge === "new" ? "جديد" : "عرض"}</p>
                            ) : null}
                            {item.name?.en ? (
                              <p dir="ltr" className="truncate text-end text-xs text-ink/45">
                                {item.name.en}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className={`${bodyCell} max-w-48 text-sm text-ink/55`}>
                        <p className="truncate">{item.description?.ar || "—"}</p>
                      </td>
                      <td className={bodyCell}>
                        <p dir="ltr" translate="no" className="text-end font-sans text-base font-semibold text-burgundy-deep">
                          {formatPrice(item.price)}
                        </p>
                      </td>
                      <td className={bodyCell}>
                        <Pill on={item.is_available} onLabel="متاح" offLabel="غير متاح" />
                      </td>
                      <td className={bodyCell}>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <RowButton icon={<PencilIcon />} disabled={busy} onClick={() => onEdit(item)}>
                            تعديل
                          </RowButton>
                          <RowButton icon={item.is_available ? <BanIcon /> : <CheckIcon />} disabled={busy} onClick={() => onToggle(item)}>
                            {item.is_available ? "إيقاف" : "إتاحة"}
                          </RowButton>
                          <RowButton
                            icon={<ChevronUpIcon />}
                            disabled={busy || itemIndex === 0}
                            onClick={() => onMove(items, itemIndex, "up")}
                          >
                            تقديم
                          </RowButton>
                          <RowButton
                            icon={<ChevronDownIcon />}
                            disabled={busy || itemIndex === items.length - 1}
                            onClick={() => onMove(items, itemIndex, "down")}
                          >
                            تأخير
                          </RowButton>
                          <RowButton icon={<TrashIcon />} tone="danger" disabled={busy} onClick={() => onDelete(item)}>
                            حذف
                          </RowButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => dialogRef.current?.close()}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold text-ink/55 underline-offset-4 hover:text-burgundy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
            >
              إغلاق
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

let dragSource = null;

function GripIcon() {
  return (
    <Glyph>
      <circle cx="9" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

function DragHandle({ label, disabled, payload }) {
  return (
    <button
      type="button"
      draggable={!disabled}
      aria-label={label}
      title={label}
      disabled={disabled}
      onDragStart={(event) => {
        dragSource = payload;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", payload.key);
      }}
      onDragEnd={() => {
        dragSource = null;
      }}
      className="relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-muted-foreground ring-0 before:absolute before:-inset-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:pointer-events-none disabled:opacity-40"
    >
      <GripIcon />
    </button>
  );
}

function dropReorder(event, payload, onStep) {
  event.preventDefault();
  const source = dragSource;
  dragSource = null;
  if (!source || source.list !== payload.list || source.index === payload.index) {
    return;
  }
  onStep(source.index, source.index < payload.index ? "down" : "up");
}

const BannerCard = memo(function BannerCard({ banner, index, total, busy, fileKey, onToggle, onReplace, onMove, onDelete }) {
  const fileRef = useRef(null);
  const first = index <= 0;
  const last = index >= total - 1;
  return (
    <li className={`min-w-0 rounded-2xl bg-paper ring-1 ring-border ${banner.is_active ? "" : "opacity-70"}`}>
      <div className="overflow-hidden rounded-t-2xl">
        {/* The address is an absolute API file. A missing image is 404. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.image_url} alt="" className="aspect-video w-full object-cover" />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <CustomerVisibilityButton
          visible={Boolean(banner.is_active)}
          disabled={busy}
          name="اللافتة"
          onClick={onToggle}
        />
        <input
          ref={fileRef}
          key={fileKey}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onReplace}
          className="sr-only"
        />
        <RowMenu label="إجراءات اللافتة">
          {(close) => (
            <>
              <MenuItem
                onSelect={() => {
                  close();
                  fileRef.current?.click();
                }}
              >
                استبدال
              </MenuItem>
              <MenuItem
                disabled={busy || first}
                title={first ? "هذه اللافتة الأولى" : "تقديم"}
                onSelect={() => {
                  close();
                  onMove("up");
                }}
              >
                تقديم
              </MenuItem>
              <MenuItem
                disabled={busy || last}
                title={last ? "هذه اللافتة الأخيرة" : "تأخير"}
                onSelect={() => {
                  close();
                  onMove("down");
                }}
              >
                تأخير
              </MenuItem>
              <div className="my-1 h-px bg-border" role="separator" />
              <MenuItem
                destructive
                onSelect={() => {
                  close();
                  onDelete();
                }}
              >
                حذف
              </MenuItem>
            </>
          )}
        </RowMenu>
      </div>
    </li>
  );
});

const CategoryRows = memo(function CategoryRows({
  category,
  items,
  name,
  open,
  busy,
  sourceIndex,
  total,
  reorderEnabled,
  onToggleOpen,
  onToggleActive,
  onEdit,
  onDelete,
  onShowItems,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  onToggleItem,
  onMove,
  onMoveItem,
}) {
  const [over, setOver] = useState(false);
  const [overItemId, setOverItemId] = useState(null);
  const first = sourceIndex <= 0;
  const last = sourceIndex >= total - 1;
  const itemsReady = Array.isArray(category.items);
  const countLabel = itemCountLabel(items.length);
  const countNumber = /^(\d+)/.exec(countLabel);
  return (
    <>
      <li
        className={`border-b border-border transition hover:bg-muted ${
          category.is_active ? "" : "opacity-60"
        } ${over ? "bg-primary/10" : ""}`}
        onClick={(event) => {
          if (event.target.closest("button, a, input, label, [role='menu']")) {
            return;
          }
          onToggleOpen();
        }}
        onDragOver={(event) => {
          if (!reorderEnabled || dragSource?.list !== "category") {
            return;
          }
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          setOver(false);
          if (!reorderEnabled) {
            return;
          }
          dropReorder(event, { list: "category", index: sourceIndex }, onMove);
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
            <DragHandle
              label={`ترتيب ${name}`}
              disabled={busy || !reorderEnabled}
              payload={{ list: "category", index: sourceIndex, key: `category-${category.id}` }}
            />
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`category-items-${category.id}`}
              aria-label={`${open ? "طي" : "فتح"} أصناف ${name}`}
              onClick={onToggleOpen}
              className="relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-foreground ring-0 before:absolute before:-inset-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDownIcon className={`transition duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
            <Thumb src={category.icon_url} label={name} />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold text-burgundy-deep">{name}</span>
                {category.is_active ? null : (
                  <Badge className="shrink-0 bg-muted px-1.5 py-0 text-[11px] font-medium text-muted-foreground ring-0">
                    مخفي
                  </Badge>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {category.name?.en ? (
                  <>
                    <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
                      {category.name.en}
                    </span>
                    <span style={{ unicodeBidi: "isolate" }}> · </span>
                  </>
                ) : null}
                <span dir="rtl" style={{ unicodeBidi: "isolate" }}>
                  {countNumber ? (
                    <>
                      <span style={{ unicodeBidi: "isolate" }}>{countNumber[1]}</span>
                      {countLabel.slice(countNumber[1].length)}
                    </>
                  ) : (
                    countLabel
                  )}
                </span>
              </p>
            </div>
          <CustomerVisibilityButton
            visible={Boolean(category.is_active)}
            disabled={busy}
            name={name}
            onClick={onToggleActive}
          />
            <RowMenu label={`إجراءات ${name}`}>
              {(close) => (
                <>
                  <MenuItem
                    onSelect={() => {
                      close();
                      onEdit();
                    }}
                  >
                    تعديل
                  </MenuItem>
                  <MenuItem
                    onSelect={() => {
                      close();
                      onShowItems();
                    }}
                  >
                    عرض العناصر
                  </MenuItem>
                  <MenuItem
                    disabled={busy}
                    onSelect={() => {
                      close();
                      onCreateItem();
                    }}
                  >
                    عنصر جديد
                  </MenuItem>
                  <MenuItem
                    disabled={busy || !reorderEnabled || first}
                    title={first ? "هذا التصنيف الأول" : "تقديم"}
                    onSelect={() => {
                      close();
                      onMove(sourceIndex, "up");
                    }}
                  >
                    تقديم
                  </MenuItem>
                  <MenuItem
                    disabled={busy || !reorderEnabled || last}
                    title={last ? "هذا التصنيف الأخير" : "تأخير"}
                    onSelect={() => {
                      close();
                      onMove(sourceIndex, "down");
                    }}
                  >
                    تأخير
                  </MenuItem>
                  <div className="my-1 h-px bg-border" role="separator" />
                  <MenuItem
                    destructive
                    onSelect={() => {
                      close();
                      onDelete();
                    }}
                  >
                    حذف
                  </MenuItem>
                </>
              )}
            </RowMenu>
        </div>
      {open ? (
        <div id={`category-items-${category.id}`} className="py-2 ps-6 pe-3">
            {!itemsReady ? (
              <div className="flex flex-col gap-2" aria-hidden="true">
                <div className="h-12 animate-pulse rounded-xl bg-muted" />
                <div className="h-12 animate-pulse rounded-xl bg-muted" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">لا عناصر في هذا التصنيف.</p>
            ) : (
              <ul className="flex flex-col border-s border-s-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]">
                {items.map((item, itemIndex) => {
                  const itemFirst = itemIndex <= 0;
                  const itemLast = itemIndex >= items.length - 1;
                  const itemName = item.name?.ar || "";
                  return (
                    <li
                      key={item.id}
                      className={`flex cursor-pointer items-center gap-2 border-b border-border px-2 py-1.5 last:border-b-0 ${
                        overItemId === item.id
                          ? "bg-primary/10"
                          : "bg-[color-mix(in_srgb,var(--color-primary)_4%,transparent)]"
                      } ${item.is_available ? "" : "opacity-60"}`}
                      onClick={(event) => {
                        if (event.target.closest("button, a, input, label, [role='menu']")) {
                          return;
                        }
                        onEditItem(item);
                      }}
                      onDragOver={(event) => {
                        if (!reorderEnabled || dragSource?.list !== `item-${category.id}`) {
                          return;
                        }
                        event.preventDefault();
                        setOverItemId(item.id);
                      }}
                      onDragLeave={() => setOverItemId((current) => (current === item.id ? null : current))}
                      onDrop={(event) => {
                        setOverItemId(null);
                        if (!reorderEnabled) {
                          return;
                        }
                        dropReorder(event, { list: `item-${category.id}`, index: itemIndex }, onMoveItem);
                      }}
                    >
                      <DragHandle
                        label={`ترتيب ${itemName}`}
                        disabled={busy || !reorderEnabled}
                        payload={{ list: `item-${category.id}`, index: itemIndex, key: `item-${item.id}` }}
                      />
                      <Thumb src={item.photo_url} label={itemName} />
                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold text-burgundy-deep">{itemName}</span>
                          {item.is_available ? null : (
                            <Badge className="shrink-0 bg-muted px-1.5 py-0 text-[11px] font-medium text-muted-foreground ring-0">
                              مخفي
                            </Badge>
                          )}
                        </p>
                        {item.name?.en ? (
                        <p dir="ltr" style={{ unicodeBidi: "isolate" }} className="truncate text-end text-xs text-muted-foreground">
                          {item.name.en}
                        </p>
                        ) : null}
                      </div>
                      <CustomerVisibilityButton
                        visible={Boolean(item.is_available)}
                        disabled={busy}
                        name={itemName}
                        tone="item"
                        activeText="إيقاف عن الزبون"
                        inactiveText="إتاحة للزبون"
                        activeTitle={`إيقاف ${itemName}`}
                        inactiveTitle={`إتاحة ${itemName}`}
                        onClick={() => onToggleItem(item)}
                      />
                      <RowMenu label={`إجراءات ${itemName}`}>
                        {(close) => (
                          <>
                            <MenuItem
                              onSelect={() => {
                                close();
                                onEditItem(item);
                              }}
                            >
                              تعديل
                            </MenuItem>
                            <MenuItem
                              disabled={busy || !reorderEnabled || itemFirst}
                              title={itemFirst ? "هذا الصنف الأول" : "تقديم"}
                              onSelect={() => {
                                close();
                                onMoveItem(itemIndex, "up");
                              }}
                            >
                              تقديم
                            </MenuItem>
                            <MenuItem
                              disabled={busy || !reorderEnabled || itemLast}
                              title={itemLast ? "هذا الصنف الأخير" : "تأخير"}
                              onSelect={() => {
                                close();
                                onMoveItem(itemIndex, "down");
                              }}
                            >
                              تأخير
                            </MenuItem>
                            <div className="my-1 h-px bg-border" role="separator" />
                            <MenuItem
                              destructive
                              onSelect={() => {
                                close();
                                onDeleteItem(item);
                              }}
                            >
                              حذف
                            </MenuItem>
                          </>
                        )}
                      </RowMenu>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-1">
              <button
                type="button"
                onClick={onCreateItem}
                disabled={busy}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
              >
                <PlusIcon />
                عنصر جديد
              </button>
            </div>
        </div>
      ) : null}
      </li>
    </>
  );
});

export function RestaurantMenu({ token, onUnauthenticated, onInactive, onFeatureUnavailable, previewHref = "" }) {
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannerFileKey, setBannerFileKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [itemsCategoryId, setItemsCategoryId] = useState(null);
  const [openCategories, setOpenCategories] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const openId = useRef(0);
  const onUnauthenticatedRef = useRef(onUnauthenticated);
  const onInactiveRef = useRef(onInactive);
  const onFeatureUnavailableRef = useRef(onFeatureUnavailable);

  useEffect(() => {
    onUnauthenticatedRef.current = onUnauthenticated;
    onInactiveRef.current = onInactive;
    onFeatureUnavailableRef.current = onFeatureUnavailable;
  }, [onUnauthenticated, onInactive, onFeatureUnavailable]);

  const handleFailure = useCallback((requestError) => {
    if (requestError?.status === 401) {
      onUnauthenticatedRef.current();
      return true;
    }
    if (requestError?.status === 403 && requestError.body?.message === "inactive") {
      onInactiveRef.current();
      return true;
    }
    if (isFeatureUnavailable(requestError)) {
      onFeatureUnavailableRef.current?.();
      return true;
    }
    setNotice("");
    setError(menuErrorText(requestError));
    return false;
  }, []);

  const refresh = useCallback(async () => {
    const [nextMenu, nextBanners] = await Promise.all([
      apiFetch("/restaurant/menu", { token }),
      apiFetch("/restaurant/banners", { token }),
    ]);
    setCategories(Array.isArray(nextMenu) ? nextMenu : []);
    setBanners(Array.isArray(nextBanners) ? nextBanners : []);
    setError("");
  }, [token]);

  useEffect(() => {
    let stopped = false;

    async function load() {
      try {
        const [nextMenu, nextBanners] = await Promise.all([
          apiFetch("/restaurant/menu", { token }),
          apiFetch("/restaurant/banners", { token }),
        ]);
        if (stopped) {
          return;
        }
        setCategories(Array.isArray(nextMenu) ? nextMenu : []);
        setBanners(Array.isArray(nextBanners) ? nextBanners : []);
        setError("");
      } catch (requestError) {
        if (!stopped) {
          handleFailure(requestError);
        }
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
  }, [token, handleFailure]);

  function openDraft(next) {
    openId.current += 1;
    setError("");
    setDraft({ ...next, nonce: openId.current });
  }

  function openCategoryCreate() {
    openDraft({ kind: "category", record: null, form: blankCategory(nextSortOrder(categories)) });
  }

  function openItemCreate(category) {
    openDraft({
      kind: "item",
      record: null,
      form: blankItem(category.id, nextSortOrder(category.items)),
    });
  }

  async function save(body) {
    if (!draft || busy) {
      return "";
    }

    const path = draft.kind === "category" ? "categories" : "items";
    const id = draft.record?.id;
    setBusy(true);
    setError("");
    try {
      await apiFetch(id ? `/restaurant/menu/${path}/${id}` : `/restaurant/menu/${path}`, {
        token,
        method: id ? "PATCH" : "POST",
        body,
      });
      setDraft(null);
      setNotice(id ? "تم حفظ التعديل." : "تمت الإضافة.");
      try {
        await refresh();
      } catch (requestError) {
        handleFailure(requestError);
      }
      return "";
    } catch (requestError) {
      if (requestError?.status === 401) {
        onUnauthenticatedRef.current();
        return "";
      }
      if (requestError?.status === 403 && requestError.body?.message === "inactive") {
        onInactiveRef.current();
        return "";
      }
      return menuErrorText(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function patchRecord(kind, id, body) {
    if (busy) {
      return false;
    }
    const previous = categories;
    if (kind === "category" && Object.prototype.hasOwnProperty.call(body, "is_active")) {
      setCategories((current) =>
        current.map((item) => (item.id === id ? { ...item, is_active: body.is_active } : item)),
      );
    }
    if (kind === "item" && Object.prototype.hasOwnProperty.call(body, "is_available")) {
      setCategories((current) =>
        current.map((category) => ({
          ...category,
          items: (category.items || []).map((item) =>
            item.id === id ? { ...item, is_available: body.is_available } : item,
          ),
        })),
      );
    }
    const path = kind === "category" ? "categories" : "items";
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/restaurant/menu/${path}/${id}`, { token, method: "PATCH", body });
      await refresh();
      toast("تم تحديث الظهور.");
      return true;
    } catch (requestError) {
      setCategories(previous);
      const redirected = handleFailure(requestError);
      if (!redirected) {
        const text = menuErrorText(requestError);
        if (text) {
          toast(text);
        }
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function moveRecord(kind, list, index, direction) {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    const moving = list[index];
    const staying = list[nextIndex];
    if (!moving || !staying || busy) {
      return;
    }

    const orders = sortOrdersForMove(moving, staying, direction);
    const path = kind === "category" ? "categories" : "items";
    setBusy(true);
    setError("");
    let failure = null;
    try {
      await apiFetch(`/restaurant/menu/${path}/${moving.id}`, {
        token,
        method: "PATCH",
        body: { sort_order: orders.moving },
      });
      if (orders.staying !== Number(staying.sort_order)) {
        await apiFetch(`/restaurant/menu/${path}/${staying.id}`, {
          token,
          method: "PATCH",
          body: { sort_order: orders.staying },
        });
      }
    } catch (requestError) {
      failure = requestError;
    }

    try {
      await refresh();
    } catch (requestError) {
      failure = failure || requestError;
    }

    if (failure) {
      handleFailure(failure);
    }
    setBusy(false);
  }

  async function addBanner(event) {
    const file = event.target.files?.[0] || null;
    setBannerFileKey((value) => value + 1);
    if (!file || busy) {
      return;
    }
    const message = imageFileError(file, "photo");
    if (message) {
      setNotice("");
      setError(message);
      return;
    }
    if (banners.length >= 5) {
      setNotice("");
      setError("يمكن حفظ 5 لافتات. احذفوا واحدة قبل إضافة غيرها.");
      return;
    }

    const body = new FormData();
    body.append("image", file);
    body.append("sort_order", String(nextSortOrder(banners)));
    body.append("is_active", "1");
    setBusy(true);
    setError("");
    try {
      await apiFetch("/restaurant/banners", { token, method: "POST", body });
      setNotice("تمت إضافة اللافتة.");
      await refresh();
    } catch (requestError) {
      handleFailure(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function replaceBanner(banner, event) {
    const file = event.target.files?.[0] || null;
    setBannerFileKey((value) => value + 1);
    if (!file || busy) {
      return;
    }
    const message = imageFileError(file, "photo");
    if (message) {
      setNotice("");
      setError(message);
      return;
    }

    const body = new FormData();
    body.append("image", file);
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/restaurant/banners/${banner.id}`, { token, method: "PATCH", body });
      setNotice("تم استبدال صورة اللافتة.");
      await refresh();
    } catch (requestError) {
      handleFailure(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function patchBanner(banner, body) {
    if (busy) {
      return false;
    }
    const previous = banners;
    if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
      setBanners((current) => current.map((item) => (item.id === banner.id ? { ...item, is_active: body.is_active } : item)));
    }
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/restaurant/banners/${banner.id}`, { token, method: "PATCH", body });
      await refresh();
      if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
        toast("تم تحديث الظهور.");
      }
      return true;
    } catch (requestError) {
      setBanners(previous);
      const redirected = handleFailure(requestError);
      if (!redirected) {
        const text = menuErrorText(requestError);
        if (text) {
          toast(text);
        }
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function moveBanner(index, direction) {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    const moving = banners[index];
    const staying = banners[nextIndex];
    if (!moving || !staying || busy) {
      return;
    }

    const orders = sortOrdersForMove(moving, staying, direction);
    setBusy(true);
    setError("");
    let failure = null;
    try {
      await apiFetch(`/restaurant/banners/${moving.id}`, {
        token,
        method: "PATCH",
        body: { sort_order: orders.moving },
      });
      if (orders.staying !== Number(staying.sort_order)) {
        await apiFetch(`/restaurant/banners/${staying.id}`, {
          token,
          method: "PATCH",
          body: { sort_order: orders.staying },
        });
      }
    } catch (requestError) {
      failure = requestError;
    }

    try {
      await refresh();
    } catch (requestError) {
      failure = failure || requestError;
    }

    if (failure) {
      handleFailure(failure);
    }
    setBusy(false);
  }

  function requestDelete(kind, record) {
    if (kind === "category" && record.items?.length) {
      setNotice("");
      setError("هذا التصنيف ما زال فيه أصناف. احذفوا الأصناف أولاً.");
      return;
    }
    setPendingDelete({ kind, record });
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) {
      return;
    }

    const path =
      pendingDelete.kind === "banner"
        ? `/restaurant/banners/${pendingDelete.record.id}`
        : `/restaurant/menu/${pendingDelete.kind === "category" ? "categories" : "items"}/${pendingDelete.record.id}`;
    setBusy(true);
    setError("");
    try {
      await apiFetch(path, {
        token,
        method: "DELETE",
      });
      setPendingDelete(null);
      setNotice("تم الحذف.");
      await refresh();
    } catch (requestError) {
      setPendingDelete(null);
      handleFailure(requestError);
    } finally {
      setBusy(false);
    }
  }

  const deleteName = pendingDelete?.record?.name?.ar || "";
  const itemsCategory = categories.find((category) => category.id === itemsCategoryId) || null;
  const needle = query.trim().toLowerCase();
  const shownCategories = categories.filter((category) => {
    if (status === "visible" && !category.is_active) {
      return false;
    }
    if (status === "hidden" && category.is_active) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const names = [
      category.name?.ar,
      category.name?.en,
      ...(Array.isArray(category.items) ? category.items.flatMap((item) => [item.name?.ar, item.name?.en]) : []),
    ];
    return names.some((value) => String(value || "").toLowerCase().includes(needle));
  });
  const reorderEnabled = needle.length === 0 && status === "all";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold text-burgundy-deep sm:text-3xl">القائمة</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-ink/55">
            التصنيفات والأصناف التي تظهر للزبون. السعر للعرض فقط.
          </p>
        </div>
        {previewHref ? (
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="ms-auto inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-transparent px-4 text-sm font-semibold text-foreground hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eye className="size-4 shrink-0" aria-hidden="true" />
            معاينة الزبون
          </a>
        ) : null}
      </div>

      {notice ? (
        <p role="status" className="text-sm font-medium text-burgundy-deep">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-burgundy">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-18px_rgba(74,4,24,0.45)] ring-1 ring-burgundy/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-burgundy/10 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-burgundy-deep">اللافتات</h3>
            <p className="text-xs text-ink/45">حتى 5 صور في أعلى قائمة الزبون. إخفاء اللافتة يبقيها ضمن العدد.</p>
          </div>
          <label
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-burgundy px-4 text-sm font-semibold text-on-primary ${
              busy || !loaded || banners.length >= 5 ? "pointer-events-none opacity-40" : "cursor-pointer"
            }`}
          >
            <input
              key={bannerFileKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={addBanner}
              className="sr-only"
            />
            <PlusIcon />
            إضافة لافتة
          </label>
        </div>
        {!loaded ? (
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            <p className="sr-only">يتم تحميل اللافتات.</p>
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : banners.length === 0 ? (
          <p className="px-4 py-8 text-sm text-ink/50">لا لافتات بعد. الصورة JPEG أو PNG أو WebP، حتى 1 ميغابايت.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {banners.map((banner, index) => (
              <BannerCard
                key={banner.id}
                banner={banner}
                index={index}
                total={banners.length}
                busy={busy}
                fileKey={bannerFileKey}
                onToggle={() => patchBanner(banner, { is_active: !banner.is_active })}
                onReplace={(event) => replaceBanner(banner, event)}
                onMove={(direction) => moveBanner(index, direction)}
                onDelete={() => requestDelete("banner", banner)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-18px_rgba(74,4,24,0.45)] ring-1 ring-burgundy/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-burgundy/10 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-burgundy-deep">التصنيفات</h3>
            <p className="text-xs text-ink/45">
              {loaded
                ? `${categories.length === 1 ? "تصنيف واحد" : categories.length === 2 ? "تصنيفان" : `${categories.length} تصنيفات`} · ${itemCountLabel(categories.reduce((sum, category) => sum + (category.items?.length || 0), 0))}`
                : "يتم تحميل القائمة."}
            </p>
          </div>
          <ActionButton onClick={openCategoryCreate} disabled={busy || !loaded}>
            <PlusIcon />
            تصنيف جديد
          </ActionButton>
        </div>

        <div className="flex flex-col gap-2 border-b border-burgundy/10 px-4 py-3 sm:flex-row sm:items-center">
          <label htmlFor="menu-search" className="sr-only">
            بحث
          </label>
          <input
            id="menu-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث في الأسماء"
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-1">
            {[
              ["all", "الكل"],
              ["visible", "ظاهر"],
              ["hidden", "مخفي"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={status === id}
                onClick={() => setStatus(id)}
                className={`inline-flex h-11 cursor-pointer items-center rounded-xl px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  status === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!loaded ? (
          <div className="flex flex-col gap-2 px-4 py-4">
            <p className="text-sm font-medium text-ink/50">يتم تحميل القائمة.</p>
            <div className="h-12 animate-pulse rounded-xl bg-muted" />
            <div className="h-12 animate-pulse rounded-xl bg-muted" />
            <div className="h-12 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : categories.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-display text-xl font-semibold text-burgundy-deep">لا توجد تصنيفات بعد</p>
            <p className="mt-2 text-sm text-ink/50">أضيفوا أول تصنيف ليظهر في قائمة الزبون.</p>
            <div className="mt-4 flex justify-center">
              <ActionButton onClick={openCategoryCreate} disabled={busy}>
                <PlusIcon />
                إضافة تصنيف
              </ActionButton>
            </div>
          </div>
        ) : shownCategories.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm font-medium text-muted-foreground">لا نتائج مطابقة.</p>
        ) : (
          <ul>
                {shownCategories.map((category) => {
                  const items = Array.isArray(category.items) ? category.items : [];
                  const open = openCategories.has(category.id);
                  const name = category.name?.ar || "";
                  const sourceIndex = categories.findIndex((item) => item.id === category.id);
                  return (
                    <CategoryRows
                      key={category.id}
                      category={category}
                      items={items}
                      name={name}
                      open={open}
                      busy={busy}
                      sourceIndex={sourceIndex}
                      total={categories.length}
                      reorderEnabled={reorderEnabled}
                      onMove={(index, direction) => moveRecord("category", categories, index, direction)}
                      onToggleOpen={() => {
                        setOpenCategories((current) => {
                          const next = new Set(current);
                          if (next.has(category.id)) {
                            next.delete(category.id);
                          } else {
                            next.add(category.id);
                          }
                          return next;
                        });
                      }}
                      onToggleActive={() => patchRecord("category", category.id, { is_active: !category.is_active })}
                      onEdit={() => openDraft({ kind: "category", record: category, form: categoryForm(category) })}
                      onDelete={() => requestDelete("category", category)}
                      onShowItems={() => setItemsCategoryId(category.id)}
                      onCreateItem={() => openItemCreate(category)}
                      onEditItem={(item) => openDraft({ kind: "item", record: item, form: itemForm(item) })}
                      onDeleteItem={(item) => requestDelete("item", item)}
                      onToggleItem={(item) => patchRecord("item", item.id, { is_available: !item.is_available })}
                      onMoveItem={(index, direction) => moveRecord("item", items, index, direction)}
                    />
                  );
                })}
          </ul>
        )}
      </div>

      <ItemsDialog
        category={itemsCategory}
        busy={busy}
        onClose={() => {
          if (!busy) {
            setItemsCategoryId(null);
          }
        }}
        onCreate={() => openItemCreate(itemsCategory)}
        onEdit={(item) => openDraft({ kind: "item", record: item, form: itemForm(item) })}
        onToggle={(item) => patchRecord("item", item.id, { is_available: !item.is_available })}
        onMove={(items, index, direction) => moveRecord("item", items, index, direction)}
        onDelete={(item) => requestDelete("item", item)}
      />
      <MenuFormDialog
        draft={draft}
        categories={categories}
        pending={busy}
        onSave={save}
        onDismiss={() => {
          if (!busy) {
            setDraft(null);
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={
          pendingDelete?.kind === "category" ? "حذف التصنيف" : pendingDelete?.kind === "banner" ? "حذف اللافتة" : "حذف الصنف"
        }
        titleId="menu-delete-title"
        body={
          pendingDelete?.kind === "banner"
            ? "هل تريدون حذف هذه اللافتة؟"
            : pendingDelete?.kind === "category"
              ? `سيتم حذف التصنيف «${deleteName}» مع ${itemCountLabel(pendingDelete.record.items?.length || 0)}. التصنيف الذي ما زال فيه أصناف لا يُحذف.`
              : `هل تريدون حذف «${deleteName}» من القائمة؟`
        }
        confirmLabel="حذف"
        tone="destructive"
        pending={busy}
        onConfirm={confirmDelete}
        onDismiss={() => {
          if (!busy) {
            setPendingDelete(null);
          }
        }}
      />
      <Toaster dir="rtl" position="bottom-center" />
    </section>
  );
}
