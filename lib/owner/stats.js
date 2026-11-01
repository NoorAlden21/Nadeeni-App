import { staffErrorText } from "@/lib/cashier/orders";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export function todayInZone(timeZone) {
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };

  try {
    return new Intl.DateTimeFormat("en-CA", {
      ...options,
      timeZone: timeZone || "Asia/Damascus",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      ...options,
      timeZone: "Asia/Damascus",
    }).format(new Date());
  }
}

export function shiftDay(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function defaultRange(timeZone) {
  const to = todayInZone(timeZone);
  return { from: shiftDay(to, -6), to };
}

export function rangeError(from, to) {
  if (!dayPattern.test(from) || !dayPattern.test(to)) {
    return "أدخلوا تاريخ البداية والنهاية.";
  }

  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "أدخلوا تاريخ البداية والنهاية.";
  }

  const span = Math.round((end - start) / 86400000);
  if (span < 0) {
    return "تاريخ النهاية قبل تاريخ البداية.";
  }
  if (span > 89) {
    return "المدى 90 يوماً كحد أقصى.";
  }

  return "";
}

export function formatDayLabel(iso) {
  const [year, month, day] = String(iso).split("-");
  if (!year || !month || !day) {
    return String(iso);
  }
  return `${day}/${month}/${year}`;
}

export function countOf(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }
  return number;
}

export function sharePercent(part, total) {
  const base = countOf(total);
  if (base <= 0) {
    return null;
  }
  return (countOf(part) / base) * 100;
}

export function formatShare(percent) {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) {
    return "—";
  }

  const rounded = Math.round(percent * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

export function formatRating(value) {
  if (value === null || value === undefined || value === "") {
    return "لا تقييم";
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "لا تقييم";
  }

  const rounded = Math.round(number * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatReadyDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return "لم يجهز طلب";
  }

  const total = Math.round(Number(seconds));
  if (!Number.isFinite(total) || total < 0) {
    return "لم يجهز طلب";
  }

  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) {
    return `${rest} ث`;
  }
  if (rest === 0) {
    return `${minutes} د`;
  }
  return `${minutes} د ${rest} ث`;
}

export function statsErrorText(error) {
  if (error?.status === 422) {
    const errors = error.body?.errors;
    const first = errors ? Object.values(errors).flat().find((item) => typeof item === "string") : "";
    if (first) {
      return first;
    }
  }

  return staffErrorText(error);
}
