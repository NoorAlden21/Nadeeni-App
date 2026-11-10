const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export const loyaltyCopy = {
  stampAdded: "أُضيف ختم.",
  rewardReady: "المكافأة جاهزة",
  claim: "إظهار رمز المكافأة",
  claimAgain: "إظهار رمز جديد",
  claiming: "يتم إنشاء الرمز.",
  codeLabel: "الرمز",
  codeExpired: "انتهت صلاحية الرمز.",
  noReward: "لا مكافأة جاهزة الآن.",
  invalidCode: "الرمز غير صالح.",
  paused: "البرنامج متوقف. المكافأة المكتسبة تبقى.",
  cardLoading: "يتم تحميل البطاقة.",
  cardUnavailable: "تعذّر تحميل البطاقة.",
  emptyCode: "أدخلوا الرمز من 6 أرقام.",
  redeemed: "سُلّمت المكافأة.",
  stampsRemaining: "الأختام المتبقية",
  goalLabel: "عدد الأختام",
  rewardAr: "نص المكافأة",
  rewardEn: "النص بالإنجليزية",
  rewardEnHint: "اختياري.",
  enable: "تشغيل البرنامج",
  save: "حفظ",
  saving: "يتم الحفظ.",
  saved: "تم حفظ البرنامج.",
  noChange: "لا تغيير للحفظ.",
  goalError: "عدد الأختام من 3 إلى 15.",
  arabicRequired: "اكتبوا نص المكافأة بالعربية.",
  textTooLong: "النص يجب ألا يتجاوز 255 حرفاً.",
  offerError: "عدد الأختام من 3 إلى 15، ونص المكافأة بالعربية مطلوب.",
  snapshotNote: "تغيير العدد أو النص ينطبق على البطاقات الجديدة. البطاقة المفتوحة تبقي هدفها.",
  stopTitle: "إيقاف برنامج الولاء",
  stopConfirm: "إيقاف البرنامج",
  activity: "السجل",
  stamps: "الأختام",
  redemptions: "المكافآت المُسلَّمة",
  noStamps: "لا أختام بعد.",
  noRedemptions: "لا مكافآت مُسلَّمة بعد.",
  fastCollect: "أقل من 30 ثانية",
  unassigned: "بلا بطاقة",
  unknownCashier: "غير معروف",
  previous: "السابق",
  next: "التالي",
  redeemTitle: "تسليم مكافأة",
  redeemHint: "اكتبوا الرمز الذي يظهر للزبون.",
  redeemAction: "تسليم",
};

export function pickRestaurantSlug(orderSlug, storedByToken, storedByName) {
  const candidate = [orderSlug, storedByToken, storedByName].find(
    (value) => typeof value === "string" && slugPattern.test(value),
  );
  return candidate ? candidate.toLowerCase() : "";
}

export function readLoyaltyCard(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const state = payload.state;
  if (state !== "none" && state !== "active" && state !== "paused") {
    return null;
  }

  const required = payload.stamps_required;
  const cycle = Number(payload.stamps_in_cycle);
  const pending = Number(payload.pending_rewards);

  return {
    state,
    stampsRequired: Number.isInteger(required) ? required : null,
    rewardTextAr: typeof payload.reward_text_ar === "string" ? payload.reward_text_ar : "",
    rewardTextEn: typeof payload.reward_text_en === "string" ? payload.reward_text_en : "",
    stampsInCycle: Number.isInteger(cycle) && cycle >= 0 ? cycle : 0,
    pendingRewards: Number.isInteger(pending) && pending >= 0 ? pending : 0,
  };
}

export function loyaltyCardVisible(card) {
  if (!card) {
    return false;
  }
  if (card.pendingRewards > 0) {
    return true;
  }
  return Number.isInteger(card.stampsRequired) && card.stampsRequired >= 3;
}

export function stampProgress(card) {
  const goal = card?.stampsRequired;
  if (!Number.isInteger(goal) || goal < 1) {
    return { filled: 0, goal: 0, percent: 0 };
  }

  const filled = Math.max(0, Math.min(card.stampsInCycle, goal));
  return { filled, goal, percent: Math.round((filled / goal) * 100) };
}

export function stampSlots(card) {
  const { filled, goal } = stampProgress(card);
  if (goal < 1) {
    return [];
  }

  return Array.from({ length: goal }, (_, index) => index < filled);
}

export function rewardReadyLabel(count) {
  if (count === 1) return "مكافأة واحدة جاهزة";
  if (count === 2) return "مكافأتان جاهزتان";
  if (count >= 3 && count <= 10) return `${count} مكافآت جاهزة`;
  if (count > 10) return `${count} مكافأة جاهزة`;
  return "";
}

export function secondsUntil(expiresAt, now) {
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, Math.ceil((end - now) / 1000));
}

export function countdownLabel(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function normalizeRedeemCode(value) {
  const code = String(value ?? "").replace(/\s+/g, "");
  return /^\d{6}$/.test(code) ? code : "";
}

export function readRedemption(payload) {
  const remaining = Number(payload?.stamps_remaining);
  return {
    rewardTextAr: typeof payload?.reward_text_ar === "string" ? payload.reward_text_ar : "",
    rewardTextEn: typeof payload?.reward_text_en === "string" ? payload.reward_text_en : "",
    stampsRemaining: Number.isInteger(remaining) && remaining >= 0 ? remaining : 0,
  };
}

export function readLoyaltyProgram(payload) {
  const required = payload?.stamps_required;
  return {
    enabled: payload?.enabled === true,
    stampsRequired: Number.isInteger(required) ? String(required) : "",
    rewardTextAr: typeof payload?.reward_text_ar === "string" ? payload.reward_text_ar : "",
    rewardTextEn: typeof payload?.reward_text_en === "string" ? payload.reward_text_en : "",
  };
}

function goalValue(text) {
  if (!/^\d+$/.test(String(text).trim())) {
    return null;
  }
  const goal = Number(String(text).trim());
  if (goal < 3 || goal > 15) {
    return null;
  }
  return goal;
}

export function loyaltyProgramProblem(saved, draft) {
  const arabic = draft.rewardTextAr.trim();
  const english = draft.rewardTextEn.trim();
  if ([...arabic].length > 255 || [...english].length > 255) {
    return loyaltyCopy.textTooLong;
  }

  const exists = saved.stampsRequired !== "";
  const creating =
    !exists &&
    (draft.enabled || arabic !== "" || english !== "" || String(draft.stampsRequired).trim() !== "");
  const goal = goalValue(draft.stampsRequired);

  if (draft.enabled || creating) {
    if (goal === null) return loyaltyCopy.goalError;
    if (!arabic) return loyaltyCopy.arabicRequired;
  } else if (String(draft.stampsRequired).trim() !== saved.stampsRequired && goal === null) {
    return loyaltyCopy.goalError;
  } else if (arabic === "" && saved.rewardTextAr !== "") {
    return loyaltyCopy.arabicRequired;
  }

  return "";
}

export function loyaltyPatch(saved, draft) {
  const body = {};
  if (draft.enabled !== saved.enabled) {
    body.enabled = draft.enabled;
  }

  const goal = goalValue(draft.stampsRequired);
  if (String(draft.stampsRequired).trim() !== saved.stampsRequired && goal !== null) {
    body.stamps_required = goal;
  }

  const arabic = draft.rewardTextAr.trim();
  if (arabic !== saved.rewardTextAr && arabic) {
    body.reward_text_ar = arabic;
  }

  const english = draft.rewardTextEn.trim();
  if (english !== saved.rewardTextEn) {
    body.reward_text_en = english || null;
  }

  return body;
}

export function readLoyaltySummary(payload) {
  function count(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : 0;
  }

  return {
    partialCards: count(payload?.partial_cards),
    unredeemedRewards: count(payload?.unredeemed_rewards),
    unassignedStamps: count(payload?.unassigned_stamps),
  };
}

export function loyaltyStopWarning(summary) {
  return `بطاقات لم تكتمل: ${summary.partialCards}. مكافآت بانتظار التسليم: ${summary.unredeemedRewards}. أختام بلا بطاقة: ${summary.unassignedStamps}. إيقاف البرنامج يوقف الأختام الجديدة، والمكافأة المكتسبة تبقى.`;
}

export function cashierLabel(name) {
  if (typeof name !== "string" || name === "" || name === "unknown") {
    return loyaltyCopy.unknownCashier;
  }
  return name;
}

export function readStampRow(row) {
  return {
    orderNumber: typeof row?.order_number === "string" ? row.order_number : "",
    cashierName: cashierLabel(row?.cashier_name),
    collectedAt: typeof row?.collected_at === "string" ? row.collected_at : "",
    assigned: row?.assigned === true,
    fastCollect: row?.fast_collect === true,
  };
}

export function readRedemptionRow(row) {
  return {
    cashierName: cashierLabel(row?.cashier_name),
    createdAt: typeof row?.created_at === "string" ? row.created_at : "",
    rewardTextAr: typeof row?.reward_text_ar === "string" ? row.reward_text_ar : "",
    rewardTextEn: typeof row?.reward_text_en === "string" ? row.reward_text_en : "",
    stampsSpent: Number.isInteger(row?.stamps_spent) ? row.stamps_spent : 0,
  };
}

export function readActivityPage(page) {
  return {
    currentPage: Number.isInteger(page?.current_page) ? page.current_page : 1,
    lastPage: Number.isInteger(page?.last_page) ? page.last_page : 1,
    data: Array.isArray(page?.data) ? page.data : [],
  };
}
