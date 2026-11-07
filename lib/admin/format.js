import { contactErrorFromApi } from "../contact.js";

const knownFieldErrors = {
  "The slug has already been taken.": "هذا المعرّف مستخدم.",
  "The email has already been taken.": "هذا البريد مستخدم.",
  "The name has already been taken.": "هذا الاسم مستخدم.",
  "Ordering requires the menu.": "الطلب يحتاج القائمة.",
};

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function adminFieldError(error, fallback) {
  const errors = error?.body?.errors;
  if (error?.status === 422 && errors) {
    const translated = contactErrorFromApi(errors);
    if (translated) {
      return translated;
    }
    const first = Object.values(errors).flat().find((item) => typeof item === "string");
    if (first && knownFieldErrors[first]) {
      return knownFieldErrors[first];
    }
    if (first) {
      return first;
    }
  }

  return fallback(error);
}

export function formatStamp(iso, timeZone) {
  if (!iso) {
    return "";
  }

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    numberingSystem: "latn",
  };

  try {
    return new Intl.DateTimeFormat("ar-SY", {
      ...options,
      timeZone: timeZone || "Asia/Damascus",
    }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("ar-SY", {
      ...options,
      timeZone: "Asia/Damascus",
    }).format(new Date(iso));
  }
}

export function sortByName(items) {
  return [...items].sort((a, b) => String(a.name).localeCompare(String(b.name), "en"));
}

export function wholeNumber(value) {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }

  const number = Number(text);
  if (!Number.isSafeInteger(number)) {
    return null;
  }

  return number;
}

export function adminErrorText(error, fallback) {
  if (error?.status === 404) {
    return "العنصر غير موجود.";
  }

  return adminFieldError(error, fallback);
}
