import { loyaltyCopy } from "../loyalty.js";

export const cashierCopy = {
  duplicate: "هذا الرقم مستخدم الآن. افتحوا الطلب واعرضوا رمزه من جديد.",
  emptyNumber: "أدخلوا رقم الطلب.",
  tooLong: "رقم الطلب يجب ألا يتجاوز 32 حرفاً.",
  notString: "أدخلوا رقم الطلب نصاً.",
  notified: "أُرسل طلب التنبيه.",
  alreadyNotified: "التنبيه أُرسل من قبل. لم يُرسل إشعار آخر.",
  resent: "أُعيد إرسال طلب التنبيه.",
  invalidCredentials: "البريد أو كلمة المرور غير صحيحة.",
  inactive: "هذا الحساب متوقف.",
  subscriptionInactive: "اشتراك المطعم غير سارٍ.",
  featureUnavailable: "هذه الشاشة غير متاحة في خطة المطعم.",
  notAdmin: "هذه الشاشة لمدير المنصة.",
  forbidden: "لا صلاحية لهذه العملية.",
  invalidStatus: "لا يمكن تنفيذ هذا الإجراء على الطلب بحالته الحالية.",
  planInUse: "هذه الخطة مرتبطة بمطعم. عطّلوها بدل حذفها.",
  tooMany: "كثرت المحاولات. انتظروا قليلاً ثم أعيدوا المحاولة.",
  sessionEnded: "انتهت الجلسة. سجّلوا الدخول من جديد.",
  network: "تعذّر الاتصال. أعيدوا المحاولة.",
  notFound: "الطلب غير موجود.",
  invalidCode: loyaltyCopy.invalidCode,
  generic: "تعذّر إكمال الطلب. أعيدوا المحاولة.",
  loginInvalid: "تحققوا من البريد وكلمة المرور.",
  notCashier: "هذه الشاشة للكاشير.",
  notRestaurant: "هذه الشاشة لموظفي المطعم.",
  loadingSession: "يتم التحقق من الجلسة.",
  loadingOrders: "يتم تحميل الطلبات.",
};

const orderNumberErrors = {
  "An active order with this number already exists.": cashierCopy.duplicate,
  "The order number field is required.": cashierCopy.emptyNumber,
  "The order number field must not be greater than 32 characters.": cashierCopy.tooLong,
  "The order number field must be a string.": cashierCopy.notString,
};

const timeFormatters = new Map();

export function formatOrderTime(iso, timeZone = "Asia/Damascus") {
  const zone = timeZone || "Asia/Damascus";
  let formatter = timeFormatters.get(zone);

  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("ar-SY", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        numberingSystem: "latn",
        hourCycle: "h23",
      });
    } catch {
      formatter = new Intl.DateTimeFormat("ar-SY", {
        timeZone: "Asia/Damascus",
        hour: "2-digit",
        minute: "2-digit",
        numberingSystem: "latn",
        hourCycle: "h23",
      });
    }

    timeFormatters.set(zone, formatter);
  }

  return formatter.format(new Date(iso));
}

export function formatElapsed(iso, now) {
  if (now == null || !iso) {
    return "";
  }

  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

  if (minutes < 1) {
    return "منذ أقل من دقيقة";
  }

  if (minutes < 60) {
    if (minutes === 1) return "منذ دقيقة";
    if (minutes === 2) return "منذ دقيقتين";
    if (minutes <= 10) return `منذ ${minutes} دقائق`;
    return `منذ ${minutes} دقيقة`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (hours === 1) return "منذ ساعة";
    if (hours === 2) return "منذ ساعتين";
    if (hours <= 10) return `منذ ${hours} ساعات`;
    return `منذ ${hours} ساعة`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  if (days <= 10) return `منذ ${days} أيام`;
  return `منذ ${days} يومًا`;
}

export function orderNumberErrorText(error) {
  const field = error?.body?.errors?.order_number?.[0];
  if (field && orderNumberErrors[field]) {
    return orderNumberErrors[field];
  }

  if (field) {
    return field;
  }

  return staffErrorText(error);
}

export function staffErrorText(error) {
  if (!error || error.status === 0 || error.status >= 500) {
    return cashierCopy.network;
  }

  const code = error.body?.message;

  if (error.status === 401 && code === "invalid_credentials") {
    return cashierCopy.invalidCredentials;
  }

  if (error.status === 401) {
    return cashierCopy.sessionEnded;
  }

  if (error.status === 403 && code === "inactive") {
    return cashierCopy.inactive;
  }

  if (error.status === 403 && code === "subscription_inactive") {
    return cashierCopy.subscriptionInactive;
  }

  if (error.status === 403 && code === "feature_unavailable") {
    return cashierCopy.featureUnavailable;
  }

  if (error.status === 403 && code === "forbidden") {
    return cashierCopy.forbidden;
  }

  if (error.status === 409 && code === "invalid_status") {
    return cashierCopy.invalidStatus;
  }

  if (error.status === 409 && code === "invalid_code") {
    return cashierCopy.invalidCode;
  }

  if (error.status === 409 && code === "plan_in_use") {
    return cashierCopy.planInUse;
  }

  if (error.status === 429) {
    return cashierCopy.tooMany;
  }

  if (error.status === 404) {
    return cashierCopy.notFound;
  }

  if (error.status === 422 && code === "Ordering requires the menu.") {
    return "الطلب يحتاج القائمة.";
  }

  if (error.status === 422) {
    const field = error.body?.errors?.order_number?.[0];
    if (field && orderNumberErrors[field]) {
      return orderNumberErrors[field];
    }
    if (error.body?.errors?.email || error.body?.errors?.password) {
      return cashierCopy.loginInvalid;
    }
  }

  return cashierCopy.generic;
}

export function isDuplicateNumber(error) {
  return (
    error?.status === 422 &&
    error.body?.errors?.order_number?.[0] ===
      "An active order with this number already exists."
  );
}

export function mergeOrder(list, next) {
  const rest = list.filter((order) => order.id !== next.id);

  if (next.status !== "waiting" && next.status !== "ready") {
    return rest;
  }

  const merged = [...rest, next];
  merged.sort((a, b) => {
    if (a.created_at === b.created_at) return 0;
    return a.created_at < b.created_at ? 1 : -1;
  });
  return merged;
}
