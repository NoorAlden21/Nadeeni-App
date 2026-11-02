import { cashierCopy } from "@/lib/cashier/orders";

const VISITOR_KEY = "nadeeni.visitor";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createVisitorId() {
  const cryptoApi = window.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  if (typeof cryptoApi?.getRandomValues !== "function") {
    return null;
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const customerCopy = {
  opening: "يتم فتح الصفحة.",
  orderUnavailable:
    "هذا الرقم غير متاح الآن. تأكدوا من الرقم، أو اطلبوا من الكاشير إدخاله، ثم أعيدوا المحاولة.",
  linkLimit: "اكتفى هذا الطلب بعدد الأجهزة المرتبطة به.",
  alreadyReviewed: "وصل تقييم هذا الطلب من قبل.",
  reviewThanks: "وصل التقييم.",
  reviewInvalid: "اختاروا تقييماً من 1 إلى 5 للخدمة والطعام.",
  subscriptionLimit: "اكتفى هذا الطلب بعدد التنبيهات.",
  restaurantMissing: "هذا المطعم غير متاح الآن.",
  linkMissing: "هذا الرابط غير متاح الآن.",
  emptyNumber: "أدخلوا رقم الطلب.",
  tooLong: "رقم الطلب يجب ألا يتجاوز 32 حرفاً.",
  preparing: "يُحضَّر",
  refreshing: "الصفحة تتجدد",
  ready: "جاهز",
  pickup: "للاستلام من الصندوق",
  collected: "تم استلام الطلب.",
  cancelled: "أُلغي هذا الطلب.",
  uncollected: "لم يُستلم هذا الطلب.",
  expired: "انتهت صلاحية هذا الرابط.",
  silentTitle: "شيلوا الصامت",
  silentBody: "حتى لا يفوتكم تنبيه الجاهزية.",
  silentPermission: "اسمحوا بالتنبيه من المتصفح.",
  keepOpen: "اتركوا هذه الصفحة مفتوحة.",
  gotIt: "حسناً",
  allowPush: "السماح بالتنبيه",
  pushUnavailable: "التنبيه من المتصفح غير متاح هنا. اتركوا الصفحة مفتوحة، فهي تتجدد وحدها.",
  iosPush:
    "على آيفون، الإشعار يعمل بعد إضافة الموقع إلى الشاشة الرئيسية (iOS 16.4 أو أحدث) ثم السماح بالإشعارات. الصفحة المفتوحة تبقى المرجع.",
  pushAsked: "طُلب التنبيه. الصفحة تبقى المرجع، ولا يعني ذلك أن الإشعار وصل.",
};

const finalStatuses = new Set(["collected", "cancelled", "expired", "uncollected"]);

export function isFinalStatus(status) {
  return finalStatuses.has(status);
}

export function rememberRestaurantIcon(name, iconUrl) {
  if (!name || !iconUrl || typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(`nadeeni.icon.name.${name}`, iconUrl);
  } catch {
    // Storage can be unavailable. The page still works without the logo.
  }
}

export function rememberOrderIcon(token, iconUrl) {
  if (!token || !iconUrl || typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(`nadeeni.icon.${token}`, iconUrl);
  } catch {
    // The welcome page already stored the logo by restaurant name.
  }
}

export function readOrderIcon(token, restaurantName) {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    const byToken = token ? window.sessionStorage.getItem(`nadeeni.icon.${token}`) : "";
    if (byToken) {
      return byToken;
    }
    if (restaurantName) {
      return window.localStorage.getItem(`nadeeni.icon.name.${restaurantName}`) || "";
    }
  } catch {
    return "";
  }
  return "";
}

export function readVisitorId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const current = window.localStorage.getItem(VISITOR_KEY);
    if (current && uuidPattern.test(current)) {
      return current;
    }

    const next = createVisitorId();
    if (!next) {
      return null;
    }
    window.localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function orderNumberProblem(value) {
  const text = value.trim();
  if (!text) {
    return customerCopy.emptyNumber;
  }
  if ([...text].length > 32) {
    return customerCopy.tooLong;
  }
  return "";
}

export function publicErrorText(error, missing = customerCopy.linkMissing) {
  if (!error || error.status === 0 || error.status >= 500) {
    return cashierCopy.network;
  }

  const code = error.body?.message;
  if (error.status === 404 && code === "order_unavailable") {
    return customerCopy.orderUnavailable;
  }
  if (error.status === 404) {
    return missing;
  }
  if (error.status === 409 && code === "order_link_limit") {
    return customerCopy.linkLimit;
  }
  if (error.status === 409 && code === "already_reviewed") {
    return customerCopy.alreadyReviewed;
  }
  if (error.status === 409 && code === "invalid_status") {
    return cashierCopy.invalidStatus;
  }
  if (error.status === 409 && code === "subscription_limit") {
    return customerCopy.subscriptionLimit;
  }
  if (error.status === 429) {
    return cashierCopy.tooMany;
  }
  if (error.status === 422) {
    const field = error.body?.errors?.order_number?.[0];
    if (typeof field === "string" && field) {
      return field;
    }
  }

  return cashierCopy.generic;
}

export function vapidKeyBytes(encoded) {
  const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
  const base64 = (encoded + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}
