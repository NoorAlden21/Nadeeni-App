import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cashierCopy, staffErrorText } from "./cashier/orders.js";
import { featureSummary, isFeatureUnavailable, readFeatures } from "./features.js";

describe("restaurant features", () => {
  it("reads the plan flags from a restaurant", () => {
    assert.deepEqual(
      readFeatures({
        features: { pager: true, menu: false, ordering: false, kitchen: false },
      }),
      { pager: true, menu: false, ordering: false, kitchen: false, loyalty: false },
    );
  });

  it("reads the same flags from a subscription plan", () => {
    assert.deepEqual(
      readFeatures({ pager: false, menu: true, ordering: true, kitchen: false }),
      { pager: false, menu: true, ordering: true, kitchen: false, loyalty: false },
    );
  });

  it("treats a missing or non-boolean flag as off", () => {
    assert.deepEqual(readFeatures(null), {
      pager: false,
      menu: false,
      ordering: false,
      kitchen: false,
      loyalty: false,
    });
    assert.equal(readFeatures({ features: { pager: 1, menu: "true" } }).menu, false);
  });

  it("names the pager, the menu, and loyalty", () => {
    assert.equal(
      featureSummary({ pager: true, menu: true, ordering: true, kitchen: true, loyalty: true }),
      "مناداة · قائمة · ولاء",
    );
    assert.equal(featureSummary({ features: { pager: false, menu: false } }), "بدون مناداة أو قائمة");
    assert.equal(featureSummary({ name: "Shawarma House" }), "");
  });

  it("keeps a hidden screen apart from an ended subscription", () => {
    const hidden = { status: 403, body: { message: "feature_unavailable" } };
    const ended = { status: 403, body: { message: "subscription_inactive" } };

    assert.equal(isFeatureUnavailable(hidden), true);
    assert.equal(isFeatureUnavailable(ended), false);
    assert.equal(staffErrorText(hidden), cashierCopy.featureUnavailable);
    assert.equal(staffErrorText(ended), cashierCopy.subscriptionInactive);
  });
});
