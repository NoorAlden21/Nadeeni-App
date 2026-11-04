"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ActionButton } from "@/components/cashier/action-button";
import { apiFetch } from "@/lib/api/client";
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

function EyeIcon() {
  return (
    <Glyph>
      <path d="M2.8 12S6.2 6.8 12 6.8 21.2 12 21.2 12 17.8 17.2 12 17.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.4" />
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
    quiet: "bg-[#f7f1e4] text-gold-deep ring-gold/30 hover:bg-gold/25",
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
const bodyCell = "px-3 py-2.5 align-middle";

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

function Thumb({ src, label }) {
  const [failedSrc, setFailedSrc] = useState("");
  const failed = Boolean(src) && failedSrc === src;
  const frame = "size-10 shrink-0 rounded-lg";

  if (src && !failed) {
    return (
      // The address is an absolute API file. A missing image is 404.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setFailedSrc(src)}
        className={`${frame} object-cover ring-1 ring-burgundy/10`}
      />
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
                <thead className="bg-[#f7f1e4]">
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

export function RestaurantMenu({ token, onUnauthenticated, onInactive }) {
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
  const openId = useRef(0);
  const onUnauthenticatedRef = useRef(onUnauthenticated);
  const onInactiveRef = useRef(onInactive);

  useEffect(() => {
    onUnauthenticatedRef.current = onUnauthenticated;
    onInactiveRef.current = onInactive;
  }, [onUnauthenticated, onInactive]);

  const handleFailure = useCallback((requestError) => {
    if (requestError?.status === 401) {
      onUnauthenticatedRef.current();
      return true;
    }
    if (requestError?.status === 403 && requestError.body?.message === "inactive") {
      onInactiveRef.current();
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
      return;
    }
    const path = kind === "category" ? "categories" : "items";
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/restaurant/menu/${path}/${id}`, { token, method: "PATCH", body });
      await refresh();
    } catch (requestError) {
      handleFailure(requestError);
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
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/restaurant/banners/${banner.id}`, { token, method: "PATCH", body });
      await refresh();
    } catch (requestError) {
      handleFailure(requestError);
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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-burgundy-deep sm:text-3xl">القائمة</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-ink/55">
            التصنيفات والأصناف التي تظهر للزبون. السعر للعرض فقط.
          </p>
        </div>
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
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-burgundy px-4 text-sm font-semibold text-ivory ${
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
          <p className="px-4 py-8 text-sm font-medium text-ink/50">يتم تحميل اللافتات.</p>
        ) : banners.length === 0 ? (
          <p className="px-4 py-8 text-sm text-ink/50">لا لافتات بعد. الصورة JPEG أو PNG أو WebP، حتى 1 ميغابايت.</p>
        ) : (
          <ul>
            {banners.map((banner, index) => (
              <li
                key={banner.id}
                className={`flex flex-wrap items-center justify-between gap-3 border-b border-burgundy/5 px-4 py-3 last:border-0 ${
                  banner.is_active ? "" : "opacity-70"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* The address is an absolute API file. A missing image is 404. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.image_url}
                    alt=""
                    className="h-16 w-28 shrink-0 rounded-xl object-cover ring-1 ring-burgundy/10"
                  />
                  <Pill on={banner.is_active} onLabel="ظاهرة" offLabel="مخفية" />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <label className={`inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold text-burgundy ${busy ? "pointer-events-none opacity-40" : "cursor-pointer"}`}>
                    <input
                      key={`${bannerFileKey}-${banner.id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => replaceBanner(banner, event)}
                      className="sr-only"
                    />
                    استبدال
                  </label>
                  <RowButton icon={banner.is_active ? <BanIcon /> : <CheckIcon />} disabled={busy} onClick={() => patchBanner(banner, { is_active: !banner.is_active })}>
                    {banner.is_active ? "إخفاء" : "إظهار"}
                  </RowButton>
                  <RowButton icon={<ChevronUpIcon />} disabled={busy || index === 0} onClick={() => moveBanner(index, "up")}>
                    تقديم
                  </RowButton>
                  <RowButton icon={<ChevronDownIcon />} disabled={busy || index === banners.length - 1} onClick={() => moveBanner(index, "down")}>
                    تأخير
                  </RowButton>
                  <RowButton icon={<TrashIcon />} tone="danger" disabled={busy} onClick={() => requestDelete("banner", banner)}>
                    حذف
                  </RowButton>
                </div>
              </li>
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

        {!loaded ? (
          <p className="px-4 py-8 text-sm font-medium text-ink/50">يتم تحميل القائمة.</p>
        ) : categories.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-display text-xl font-semibold text-burgundy-deep">لا توجد تصنيفات بعد</p>
            <p className="mt-2 text-sm text-ink/50">أضيفوا أول تصنيف ليظهر في قائمة الزبون.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-[#f7f1e4]">
                <tr className="border-b border-burgundy/10">
                  <th className={headCell}>التصنيف</th>
                  <th className={headCell}>الحالة</th>
                  <th className={headCell}>العناصر</th>
                  <th className={headCell}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const items = Array.isArray(category.items) ? category.items : [];
                  return (
                    <tr
                      key={category.id}
                      className={`border-b border-burgundy/5 transition hover:bg-[#faf7f2] ${
                        category.is_active ? "" : "opacity-70"
                      }`}
                    >
                      <td className={bodyCell}>
                        <div className="flex items-center gap-3">
                          <Thumb src={category.icon_url} label={category.name?.ar} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-burgundy-deep">{category.name?.ar}</p>
                            {category.name?.en ? (
                              <p dir="ltr" className="truncate text-end text-xs text-ink/45">
                                {category.name.en}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className={bodyCell}>
                        <Pill on={category.is_active} onLabel="ظاهر" offLabel="مخفي" />
                      </td>
                      <td className={`${bodyCell} text-sm text-ink/60`}>{itemCountLabel(items.length)}</td>
                      <td className={bodyCell}>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <RowButton
                            icon={<PencilIcon />}
                            disabled={busy}
                            onClick={() =>
                              openDraft({ kind: "category", record: category, form: categoryForm(category) })
                            }
                          >
                            تعديل
                          </RowButton>
                          <RowButton
                            icon={<TrashIcon />}
                            tone="danger"
                            disabled={busy}
                            onClick={() => requestDelete("category", category)}
                          >
                            حذف
                          </RowButton>
                          <RowButton
                            icon={<EyeIcon />}
                            tone="quiet"
                            disabled={busy}
                            onClick={() => setItemsCategoryId(category.id)}
                          >
                            عرض العناصر
                          </RowButton>
                          <RowButton
                            icon={<PlusIcon />}
                            tone="quiet"
                            disabled={busy}
                            onClick={() => openItemCreate(category)}
                          >
                            عنصر جديد
                          </RowButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              ? `هل تريدون حذف «${deleteName}»؟ التصنيف الذي ما زال فيه أصناف لا يُحذف.`
              : `هل تريدون حذف «${deleteName}» من القائمة؟`
        }
        confirmLabel="حذف"
        pending={busy}
        onConfirm={confirmDelete}
        onDismiss={() => {
          if (!busy) {
            setPendingDelete(null);
          }
        }}
      />
    </section>
  );
}
