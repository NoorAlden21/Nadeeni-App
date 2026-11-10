import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cashierCopy, staffErrorText } from "./cashier/orders.js";
import {
  countdownLabel,
  loyaltyCardVisible,
  loyaltyCopy,
  loyaltyPatch,
  loyaltyPhoneCode,
  loyaltyPhoneError,
  loyaltyPhoneStartBody,
  loyaltyPhoneValue,
  loyaltyPhoneVerifyBody,
  loyaltyProgramProblem,
  loyaltyStopWarning,
  normalizeRedeemCode,
  pickRestaurantSlug,
  readLoyaltyCard,
  readLoyaltyProgram,
  readLoyaltySummary,
  readRedemption,
  readStampRow,
  rewardReadyLabel,
  secondsUntil,
  stampProgress,
  stampSlots,
} from "./loyalty.js";

describe("loyalty card", () => {
  it("reads the card snapshot and does not recompute a later goal", () => {
    const card = readLoyaltyCard({
      state: "active",
      stamps_required: 6,
      reward_text_ar: "قهوة مجانية",
      reward_text_en: "A free coffee",
      stamps_in_cycle: 1,
      pending_rewards: 2,
    });

    assert.equal(card.stampsRequired, 6);
    assert.equal(card.stampsInCycle, 1);
    assert.equal(card.pendingRewards, 2);
    assert.deepEqual(stampSlots(card), [true, false, false, false, false, false]);
    assert.deepEqual(stampProgress({ stampsRequired: 9, stampsInCycle: 3 }), {
      filled: 3,
      goal: 9,
      percent: 33,
    });
    assert.equal(rewardReadyLabel(2), "مكافأتان جاهزتان");
  });

  it("hides an empty offer when the program is off and there is no card", () => {
    const card = readLoyaltyCard({
      state: "none",
      stamps_required: null,
      reward_text_ar: null,
      reward_text_en: null,
      stamps_in_cycle: 0,
      pending_rewards: 0,
    });

    assert.equal(loyaltyCardVisible(card), false);
  });

  it("shows a paused card and a reward that is still waiting", () => {
    const card = readLoyaltyCard({
      state: "paused",
      stamps_required: 6,
      reward_text_ar: "قهوة مجانية",
      reward_text_en: null,
      stamps_in_cycle: 0,
      pending_rewards: 1,
    });

    assert.equal(loyaltyCardVisible(card), true);
    assert.equal(rewardReadyLabel(card.pendingRewards), "مكافأة واحدة جاهزة");
  });

  it("counts down from expires_at without asking for another code", () => {
    const expiresAt = "2026-11-08T15:01:30.000000Z";
    const now = Date.parse("2026-11-08T15:00:00.000000Z");

    assert.equal(secondsUntil(expiresAt, now), 90);
    assert.equal(countdownLabel(90), "01:30");
    assert.equal(secondsUntil(expiresAt, Date.parse(expiresAt) + 1000), 0);
  });
});

describe("loyalty program", () => {
  it("turns the program on only with a goal and Arabic reward text", () => {
    const saved = readLoyaltyProgram({
      enabled: false,
      stamps_required: null,
      reward_text_ar: null,
      reward_text_en: null,
    });
    const draft = {
      enabled: true,
      stampsRequired: "6",
      rewardTextAr: "القهوة السابعة مجاناً",
      rewardTextEn: "",
    };

    assert.equal(loyaltyProgramProblem(saved, { ...draft, stampsRequired: "2" }), loyaltyCopy.goalError);
    assert.equal(loyaltyProgramProblem(saved, { ...draft, rewardTextAr: "  " }), loyaltyCopy.arabicRequired);
    assert.deepEqual(loyaltyPatch(saved, draft), {
      enabled: true,
      stamps_required: 6,
      reward_text_ar: "القهوة السابعة مجاناً",
    });
  });

  it("sends only the field that changed and keeps a blank English text empty", () => {
    const saved = readLoyaltyProgram({
      enabled: true,
      stamps_required: 6,
      reward_text_ar: "قهوة مجانية",
      reward_text_en: "A free coffee",
    });
    const draft = { ...saved, rewardTextEn: "  " };

    assert.deepEqual(loyaltyPatch(saved, draft), { reward_text_en: null });
  });

  it("warns with the summary counts before the program is turned off", () => {
    const summary = readLoyaltySummary({
      cards: 3,
      stamps_given: 25,
      redemptions: 1,
      partial_cards: 1,
      unredeemed_rewards: 2,
      unassigned_stamps: 2,
    });

    assert.match(loyaltyStopWarning(summary), /بطاقات لم تكتمل: 1/);
    assert.match(loyaltyStopWarning(summary), /مكافآت بانتظار التسليم: 2/);
    assert.match(loyaltyStopWarning(summary), /أختام بلا بطاقة: 2/);
  });
});

describe("loyalty redeem and activity", () => {
  it("keeps a leading zero in the six-digit code", () => {
    assert.equal(normalizeRedeemCode(" 048213 "), "048213");
    assert.equal(normalizeRedeemCode("48213"), "");
    assert.equal(normalizeRedeemCode(48213), "");
  });

  it("uses one sentence for every bad code", () => {
    const error = { status: 409, body: { message: "invalid_code" } };
    assert.equal(staffErrorText(error), loyaltyCopy.invalidCode);
    assert.equal(cashierCopy.invalidCode, loyaltyCopy.invalidCode);
  });

  it("shows the reward text and the stamps left, not the redemption id", () => {
    assert.deepEqual(
      readRedemption({
        id: 4,
        stamps_required: 6,
        reward_text_ar: "قهوة مجانية",
        reward_text_en: "A free coffee",
        stamps_remaining: 7,
      }),
      {
        rewardTextAr: "قهوة مجانية",
        rewardTextEn: "A free coffee",
        stampsRemaining: 7,
      },
    );
  });

  it("reads a stamp row without a customer or a phone", () => {
    const row = readStampRow({
      order_number: "0010",
      cashier_name: "unknown",
      collected_at: "2026-11-08T14:00:10.000000Z",
      seconds_to_collect: 10,
      assigned: false,
      fast_collect: true,
      phone: "+963944123456",
      visitor_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    assert.deepEqual(row, {
      orderNumber: "0010",
      cashierName: "غير معروف",
      collectedAt: "2026-11-08T14:00:10.000000Z",
      assigned: false,
      fastCollect: true,
    });
    assert.equal("phone" in row, false);
    assert.equal("visitor_id" in row, false);
  });

  it("keeps a verified phone as the last four digits and drops a full number", () => {
    const saved = readLoyaltyCard({
      state: "paused",
      stamps_required: 6,
      reward_text_ar: "قهوة مجانية",
      reward_text_en: null,
      stamps_in_cycle: 1,
      pending_rewards: 0,
      phone_verified: true,
      phone_last4: "3456",
      phone: "+963944123456",
    });

    assert.equal(saved.phoneLast4, "3456");
    assert.equal(saved.state, "paused");
    assert.equal("phone" in saved, false);
    assert.equal(loyaltyCardVisible(saved), true);

    const plain = readLoyaltyCard({
      state: "active",
      stamps_required: 6,
      reward_text_ar: "قهوة مجانية",
      stamps_in_cycle: 0,
      pending_rewards: 0,
    });
    assert.equal(plain.phoneLast4, "");

    const unverified = readLoyaltyCard({
      state: "active",
      stamps_required: 6,
      stamps_in_cycle: 0,
      pending_rewards: 0,
      phone_last4: "3456",
      phone: "+963944123456",
    });
    assert.equal(unverified.phoneLast4, "");
    assert.equal("phone" in unverified, false);
  });

  it("accepts a Syrian mobile and eastern digits, and sends a name only when one was typed", () => {
    assert.equal(loyaltyPhoneValue("+963944123456"), "+963944123456");
    assert.equal(loyaltyPhoneValue("  ٠٠٩٦٣٩٤٤١٢٣٤٥٦ "), "00963944123456");
    assert.equal(loyaltyPhoneValue("٠٩٤٤١٢٣٤٥٦"), "0944123456");
    assert.equal(loyaltyPhoneValue("۹۴۴۱۲۳۴۵۶"), "944123456");
    assert.equal(loyaltyPhoneValue("   "), "");
    assert.equal(loyaltyPhoneCode("٠٤٨٢١٣"), "048213");
    assert.equal(loyaltyPhoneCode("04821"), "");

    assert.deepEqual(loyaltyPhoneStartBody("+963944123456"), { phone: "+963944123456" });
    assert.deepEqual(loyaltyPhoneVerifyBody("+963944123456", "048213", "  "), {
      phone: "+963944123456",
      code: "048213",
    });
    assert.deepEqual(loyaltyPhoneVerifyBody("+963944123456", "048213", " نور "), {
      phone: "+963944123456",
      code: "048213",
      name: "نور",
    });
    assert.equal("name" in loyaltyPhoneStartBody("+963944123456"), false);
  });

  it("uses one later sentence for a blocked phone send and a paused service", () => {
    const later = { status: 429, body: { message: "Too Many Attempts." } };
    const down = { status: 503, body: { message: "unavailable" } };
    assert.equal(loyaltyPhoneError(later), loyaltyCopy.tryLater);
    assert.equal(loyaltyPhoneError(down), loyaltyCopy.tryLater);

    assert.equal(
      loyaltyPhoneError({ status: 422, body: { errors: { phone: ["The phone number is invalid."] } } }),
      loyaltyCopy.phoneInvalid,
    );
    assert.equal(
      loyaltyPhoneError({ status: 422, body: { errors: { visitor_id: "A browser id is required." } } }),
      loyaltyCopy.visitorRequired,
    );
    assert.equal(
      loyaltyPhoneError({ status: 409, body: { message: "nothing_to_link" } }),
      loyaltyCopy.nothingToLink,
    );
    assert.equal(
      loyaltyPhoneError({ status: 409, body: { message: "merge_not_available" } }),
      loyaltyCopy.mergeUnavailable,
    );
    assert.equal(
      loyaltyPhoneError({ status: 409, body: { message: "phone_already_set" } }),
      loyaltyCopy.phoneAlreadySet,
    );
    assert.equal(
      loyaltyPhoneError({ status: 409, body: { message: "browser_limit" } }),
      loyaltyCopy.browserLimit,
    );
    assert.equal(
      loyaltyPhoneError({ status: 409, body: { message: "invalid_code" } }),
      loyaltyCopy.phoneCodeInvalid,
    );
  });

  it("prefers the order slug, then the slug remembered for this browser", () => {
    assert.equal(pickRestaurantSlug("Shawarma-House", "", ""), "shawarma-house");
    assert.equal(pickRestaurantSlug("", "grill-house", "other"), "grill-house");
    assert.equal(pickRestaurantSlug("not a slug", "", ""), "");
  });
});
