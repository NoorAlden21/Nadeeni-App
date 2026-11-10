import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cashierCopy, staffErrorText } from "./cashier/orders.js";
import {
  countdownLabel,
  loyaltyCardVisible,
  loyaltyCopy,
  loyaltyPatch,
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

  it("prefers the order slug, then the slug remembered for this browser", () => {
    assert.equal(pickRestaurantSlug("Shawarma-House", "", ""), "shawarma-house");
    assert.equal(pickRestaurantSlug("", "grill-house", "other"), "grill-house");
    assert.equal(pickRestaurantSlug("not a slug", "", ""), "");
  });
});
