import { staffErrorText } from "../cashier/orders.js";

const NAME_MAX = 255;
const DESCRIPTION_MAX = 500;
const SORT_MAX = 100000;
const PRICE_MAX = 100000000;
const FILE_MAX = 1024 * 1024;

const iconTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const iconExtensions = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
const photoExtensions = [".jpg", ".jpeg", ".png", ".webp"];

const menuFieldErrors = {
  "The icon must be a JPEG, PNG, WebP, or SVG file.": "الأيقونة يجب أن تكون JPEG أو PNG أو WebP أو SVG.",
  "The icon must not be greater than 1024 kilobytes.": "الأيقونة يجب ألا تتجاوز 1 ميغابايت.",
  "The photo must be a JPEG, PNG, or WebP file.": "الصورة يجب أن تكون JPEG أو PNG أو WebP.",
  "The photo must not be greater than 1024 kilobytes.": "الصورة يجب ألا تتجاوز 1 ميغابايت.",
  "The image must be a JPEG, PNG, or WebP file.": "الصورة يجب أن تكون JPEG أو PNG أو WebP.",
  "The image must not be greater than 1024 kilobytes.": "الصورة يجب ألا تتجاوز 1 ميغابايت.",
  "The image field is required.": "اختاروا صورة اللافتة.",
  "The name ar field is required.": "أدخلوا الاسم بالعربية.",
  "The name ar field must not be greater than 255 characters.": "الاسم العربي يجب ألا يتجاوز 255 حرفاً.",
  "The name en field must not be greater than 255 characters.": "الاسم الإنجليزي يجب ألا يتجاوز 255 حرفاً.",
  "The description ar field must not be greater than 500 characters.": "الوصف العربي يجب ألا يتجاوز 500 حرف.",
  "The description en field must not be greater than 500 characters.": "الوصف الإنجليزي يجب ألا يتجاوز 500 حرف.",
  "The price field is required.": "أدخلوا السعر.",
  "The price field must be an integer.": "السعر رقم صحيح من 0 إلى 100000000.",
  "The price field must be at least 0.": "السعر رقم صحيح من 0 إلى 100000000.",
  "The price field must not be greater than 100000000.": "السعر رقم صحيح من 0 إلى 100000000.",
  "The sort order field must be an integer.": "ترتيب العرض رقم من 0 إلى 100000.",
  "The sort order field must be at least 0.": "ترتيب العرض رقم من 0 إلى 100000.",
  "The sort order field must not be greater than 100000.": "ترتيب العرض رقم من 0 إلى 100000.",
  "The selected category id is invalid.": "هذا التصنيف غير موجود في هذا المطعم.",
  "The selected badge is invalid.": "الشارة هي جديد أو عرض، أو تُمسح.",
};

const priceFormat = new Intl.NumberFormat("ar-SY", {
  numberingSystem: "latn",
  maximumFractionDigits: 0,
});

function textLength(value) {
  return [...String(value)].length;
}

function requiredText(value, max) {
  const text = String(value ?? "").trim();
  if (!text) {
    return { ok: false, empty: true };
  }
  if (textLength(text) > max) {
    return { ok: false, empty: false };
  }
  return { ok: true, value: text };
}

function optionalText(value, max) {
  const text = String(value ?? "").trim();
  if (!text) {
    return { ok: true, value: null };
  }
  if (textLength(text) > max) {
    return { ok: false, value: null };
  }
  return { ok: true, value: text };
}

export function wholeInt(value, max = Number.MAX_SAFE_INTEGER) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }

  const number = Number(text);
  if (!Number.isSafeInteger(number) || number > max) {
    return null;
  }

  return number;
}

function extensionAllowed(file, extensions) {
  const name = String(file?.name || "").toLowerCase();
  return extensions.some((extension) => name.endsWith(extension));
}

export function imageFileError(file, kind) {
  if (!file) {
    return "";
  }

  if (file.size > FILE_MAX) {
    return kind === "icon"
      ? "الأيقونة يجب ألا تتجاوز 1 ميغابايت."
      : "الصورة يجب ألا تتجاوز 1 ميغابايت.";
  }

  const types = kind === "icon" ? iconTypes : photoTypes;
  const extensions = kind === "icon" ? iconExtensions : photoExtensions;
  if (types.has(file.type) || extensionAllowed(file, extensions)) {
    return "";
  }

  return kind === "icon"
    ? "الأيقونة يجب أن تكون JPEG أو PNG أو WebP أو SVG."
    : "الصورة يجب أن تكون JPEG أو PNG أو WebP.";
}

function definedFields(fields) {
  const body = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    body[key] = value;
  });
  return body;
}

function withFile(fields, fileField, file) {
  if (!file) {
    return { ...fields };
  }

  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === null) {
      data.append(key, "");
      return;
    }
    data.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });
  data.append(fileField, file);
  return data;
}

function optionalChange(body, key, next, previous) {
  const previousValue = previous ?? null;
  const nextValue = next ?? null;
  if (nextValue === previousValue) {
    return;
  }
  body[key] = nextValue ?? "";
}

export function nextSortOrder(list) {
  const highest = (list || []).reduce((max, item) => {
    const value = Number(item?.sort_order);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, -1);
  return Math.min(SORT_MAX, highest + 1);
}

export function sortOrdersForMove(moving, staying, direction) {
  const movingOrder = Number(moving?.sort_order) || 0;
  const stayingOrder = Number(staying?.sort_order) || 0;

  if (movingOrder !== stayingOrder) {
    return { moving: stayingOrder, staying: movingOrder };
  }

  if (direction === "up") {
    if (stayingOrder > 0) {
      return { moving: stayingOrder - 1, staying: stayingOrder };
    }
    return { moving: stayingOrder, staying: Math.min(SORT_MAX, stayingOrder + 1) };
  }

  if (stayingOrder < SORT_MAX) {
    return { moving: stayingOrder + 1, staying: stayingOrder };
  }

  return { moving: stayingOrder, staying: Math.max(0, stayingOrder - 1) };
}

export function formatPrice(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    return "";
  }
  return priceFormat.format(number);
}

export function itemCountLabel(count) {
  const total = Number(count) || 0;
  if (total === 0) return "لا أصناف";
  if (total === 1) return "صنف واحد";
  if (total === 2) return "صنفان";
  if (total <= 10) return `${total} أصناف`;
  return `${total} صنفاً`;
}

export function buildCategoryPayload(form, { existing = null, file = null } = {}) {
  const nameAr = requiredText(form?.name_ar, NAME_MAX);
  if (!nameAr.ok) {
    return {
      ok: false,
      error: nameAr.empty ? "أدخلوا الاسم بالعربية." : "الاسم العربي يجب ألا يتجاوز 255 حرفاً.",
    };
  }

  const nameEn = optionalText(form?.name_en, NAME_MAX);
  if (!nameEn.ok) {
    return { ok: false, error: "الاسم الإنجليزي يجب ألا يتجاوز 255 حرفاً." };
  }

  const sortOrder = wholeInt(form?.sort_order, SORT_MAX);
  if (sortOrder === null) {
    return { ok: false, error: "ترتيب العرض رقم من 0 إلى 100000." };
  }

  const fileError = imageFileError(file, "icon");
  if (fileError) {
    return { ok: false, error: fileError };
  }

  const isActive = Boolean(form?.is_active);
  const fields = existing
    ? categoryChanges(existing, {
        nameAr: nameAr.value,
        nameEn: nameEn.value,
        sortOrder,
        isActive,
      })
    : definedFields({
        name_ar: nameAr.value,
        name_en: nameEn.value,
        sort_order: sortOrder,
        is_active: isActive,
      });

  if (existing && Object.keys(fields).length === 0 && !file) {
    return { ok: false, error: "لا تغيير للحفظ." };
  }

  return { ok: true, body: withFile(fields, "icon", file) };
}

function categoryChanges(existing, next) {
  const body = {};
  if (next.nameAr !== (existing.name?.ar || "")) {
    body.name_ar = next.nameAr;
  }
  optionalChange(body, "name_en", next.nameEn, existing.name?.en);
  if (next.sortOrder !== Number(existing.sort_order)) {
    body.sort_order = next.sortOrder;
  }
  if (next.isActive !== Boolean(existing.is_active)) {
    body.is_active = next.isActive;
  }
  return body;
}

export function buildItemPayload(form, { existing = null, file = null, categoryIds = [] } = {}) {
  const categoryId = wholeInt(form?.category_id);
  const known = categoryIds.some((id) => Number(id) === categoryId);
  if (categoryId === null || !known) {
    return { ok: false, error: "اختاروا تصنيفاً من هذا المطعم." };
  }

  const nameAr = requiredText(form?.name_ar, NAME_MAX);
  if (!nameAr.ok) {
    return {
      ok: false,
      error: nameAr.empty ? "أدخلوا الاسم بالعربية." : "الاسم العربي يجب ألا يتجاوز 255 حرفاً.",
    };
  }

  const nameEn = optionalText(form?.name_en, NAME_MAX);
  if (!nameEn.ok) {
    return { ok: false, error: "الاسم الإنجليزي يجب ألا يتجاوز 255 حرفاً." };
  }

  const descriptionAr = optionalText(form?.description_ar, DESCRIPTION_MAX);
  if (!descriptionAr.ok) {
    return { ok: false, error: "الوصف العربي يجب ألا يتجاوز 500 حرف." };
  }

  const descriptionEn = optionalText(form?.description_en, DESCRIPTION_MAX);
  if (!descriptionEn.ok) {
    return { ok: false, error: "الوصف الإنجليزي يجب ألا يتجاوز 500 حرف." };
  }

  const price = wholeInt(form?.price, PRICE_MAX);
  if (price === null) {
    return { ok: false, error: form?.price?.trim?.() ? "السعر رقم صحيح من 0 إلى 100000000." : "أدخلوا السعر." };
  }

  const sortOrder = wholeInt(form?.sort_order, SORT_MAX);
  if (sortOrder === null) {
    return { ok: false, error: "ترتيب العرض رقم من 0 إلى 100000." };
  }

  const fileError = imageFileError(file, "photo");
  if (fileError) {
    return { ok: false, error: fileError };
  }

  const isAvailable = Boolean(form?.is_available);
  const badge = readBadge(form?.badge);
  const fields = existing
    ? itemChanges(existing, {
        categoryId,
        nameAr: nameAr.value,
        nameEn: nameEn.value,
        descriptionAr: descriptionAr.value,
        descriptionEn: descriptionEn.value,
        price,
        sortOrder,
        isAvailable,
        badge,
      })
    : definedFields({
        category_id: categoryId,
        name_ar: nameAr.value,
        name_en: nameEn.value,
        description_ar: descriptionAr.value,
        description_en: descriptionEn.value,
        price,
        sort_order: sortOrder,
        is_available: isAvailable,
        badge,
      });

  if (existing && Object.keys(fields).length === 0 && !file) {
    return { ok: false, error: "لا تغيير للحفظ." };
  }

  return { ok: true, body: withFile(fields, "photo", file) };
}

function itemChanges(existing, next) {
  const body = {};
  if (next.categoryId !== Number(existing.category_id)) {
    body.category_id = next.categoryId;
  }
  if (next.nameAr !== (existing.name?.ar || "")) {
    body.name_ar = next.nameAr;
  }
  optionalChange(body, "name_en", next.nameEn, existing.name?.en);
  optionalChange(body, "description_ar", next.descriptionAr, existing.description?.ar);
  optionalChange(body, "description_en", next.descriptionEn, existing.description?.en);
  if (next.price !== Number(existing.price)) {
    body.price = next.price;
  }
  if (next.sortOrder !== Number(existing.sort_order)) {
    body.sort_order = next.sortOrder;
  }
  if (next.isAvailable !== Boolean(existing.is_available)) {
    body.is_available = next.isAvailable;
  }
  if (next.badge !== readBadge(existing.badge)) {
    body.badge = next.badge;
  }
  return body;
}

function readBadge(value) {
  return value === "new" || value === "offer" ? value : null;
}

function firstFieldError(error) {
  const errors = error?.body?.errors;
  if (!errors) {
    return "";
  }

  const first = Object.values(errors)
    .flat()
    .find((item) => typeof item === "string");
  return first || "";
}

export function menuErrorText(error) {
  if (error?.status === 409 && error.body?.message === "category_not_empty") {
    return "هذا التصنيف ما زال فيه أصناف. احذفوا الأصناف أولاً.";
  }

  if (error?.status === 409 && error.body?.message === "banner_limit") {
    return "يمكن حفظ 5 لافتات. احذفوا واحدة قبل إضافة غيرها.";
  }

  if (error?.status === 404) {
    return "هذا العنصر لم يعد موجوداً في القائمة.";
  }

  if (error?.status === 422) {
    const field = firstFieldError(error);
    if (field && menuFieldErrors[field]) {
      return menuFieldErrors[field];
    }
    const message = error.body?.message;
    if (typeof message === "string" && menuFieldErrors[message]) {
      return menuFieldErrors[message];
    }
    if (field) {
      return field;
    }
  }

  return staffErrorText(error);
}
