import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCategoryPayload,
  buildItemPayload,
  formatPrice,
  imageFileError,
  itemCountLabel,
  menuErrorText,
  nextSortOrder,
  sortOrdersForMove,
} from "./menu.js";

const FILE_BYTES = 1024 * 1024;

function fileOf(name, type, size) {
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type });
}

describe("buildCategoryPayload", () => {
  it("creates a category and omits a blank English name", () => {
    const result = buildCategoryPayload({
      name_ar: " مشاوي ",
      name_en: "  ",
      sort_order: "1",
      is_active: false,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.body, {
      name_ar: "مشاوي",
      sort_order: 1,
      is_active: false,
    });
  });

  it("sends an icon as multipart with booleans as 1 or 0", () => {
    const icon = fileOf("mark.svg", "image/svg+xml", 12);
    const result = buildCategoryPayload(
      { name_ar: "مشاوي", name_en: "Grill", sort_order: "0", is_active: true },
      { file: icon },
    );

    assert.equal(result.ok, true);
    assert.equal(result.body instanceof FormData, true);
    assert.equal(result.body.get("name_ar"), "مشاوي");
    assert.equal(result.body.get("name_en"), "Grill");
    assert.equal(result.body.get("is_active"), "1");
    assert.equal(result.body.get("icon"), icon);
  });

  it("patches only the fields that changed and clears English with a blank", () => {
    const result = buildCategoryPayload(
      { name_ar: "مشاوي", name_en: "", sort_order: "2", is_active: true },
      {
        existing: {
          name: { ar: "مشاوي", en: "Grill" },
          sort_order: 1,
          is_active: true,
        },
      },
    );

    assert.deepEqual(result.body, { name_en: "", sort_order: 2 });
  });

  it("refuses a save when nothing changed", () => {
    const result = buildCategoryPayload(
      { name_ar: "مشاوي", name_en: "Grill", sort_order: "1", is_active: true },
      { existing: { name: { ar: "مشاوي", en: "Grill" }, sort_order: 1, is_active: true } },
    );

    assert.equal(result.ok, false);
    assert.equal(result.error, "لا تغيير للحفظ.");
  });
});

describe("buildItemPayload", () => {
  const categories = [1];

  it("requires a whole price and a category from this restaurant", () => {
    const missing = buildItemPayload(
      {
        category_id: "1",
        name_ar: "شاورما",
        price: "",
        sort_order: "0",
        is_available: true,
      },
      { categoryIds: categories },
    );
    assert.equal(missing.error, "أدخلوا السعر.");

    const foreign = buildItemPayload(
      {
        category_id: "9",
        name_ar: "شاورما",
        price: "25000",
        sort_order: "0",
        is_available: true,
      },
      { categoryIds: categories },
    );
    assert.equal(foreign.error, "اختاروا تصنيفاً من هذا المطعم.");
  });

  it("rejects a price above the limit and keeps zero", () => {
    const high = buildItemPayload(
      {
        category_id: "1",
        name_ar: "شاورما",
        price: "100000001",
        sort_order: "0",
        is_available: true,
      },
      { categoryIds: categories },
    );
    assert.equal(high.ok, false);

    const free = buildItemPayload(
      {
        category_id: "1",
        name_ar: "شاورما",
        price: "0",
        sort_order: "0",
        is_available: true,
      },
      { categoryIds: categories },
    );
    assert.equal(free.body.price, 0);
  });

  it("moves an item by sending only the new category", () => {
    const result = buildItemPayload(
      {
        category_id: "2",
        name_ar: "شاورما دجاج",
        name_en: "Chicken shawarma",
        description_ar: "مع ثوم",
        description_en: "",
        price: "25000",
        sort_order: "0",
        is_available: true,
      },
      {
        categoryIds: [1, 2],
        existing: {
          category_id: 1,
          name: { ar: "شاورما دجاج", en: "Chicken shawarma" },
          description: { ar: "مع ثوم", en: null },
          price: 25000,
          sort_order: 0,
          is_available: true,
        },
      },
    );

    assert.deepEqual(result.body, { category_id: 2 });
  });

  it("sends new or offer, and null when a badge is cleared", () => {
    const created = buildItemPayload(
      {
        category_id: "1",
        name_ar: "شاورما",
        price: "25000",
        sort_order: "0",
        is_available: true,
        badge: "offer",
      },
      { categoryIds: categories },
    );
    assert.equal(created.body.badge, "offer");

    const cleared = buildItemPayload(
      {
        category_id: "1",
        name_ar: "شاورما دجاج",
        name_en: "Chicken shawarma",
        description_ar: "مع ثوم",
        description_en: "",
        price: "25000",
        sort_order: "0",
        is_available: true,
        badge: "",
      },
      {
        categoryIds: categories,
        existing: {
          category_id: 1,
          name: { ar: "شاورما دجاج", en: "Chicken shawarma" },
          description: { ar: "مع ثوم", en: null },
          price: 25000,
          sort_order: 0,
          is_available: true,
          badge: "new",
        },
      },
    );
    assert.deepEqual(cleared.body, { badge: null });

    const withPhoto = buildItemPayload(
      {
        category_id: "1",
        name_ar: "شاورما دجاج",
        price: "25000",
        sort_order: "0",
        is_available: true,
        badge: "",
      },
      {
        categoryIds: categories,
        file: fileOf("plate.jpg", "image/jpeg", 20),
        existing: {
          category_id: 1,
          name: { ar: "شاورما دجاج", en: null },
          description: { ar: null, en: null },
          price: 25000,
          sort_order: 0,
          is_available: true,
          badge: "offer",
        },
      },
    );
    assert.equal(withPhoto.body.get("badge"), "");
    assert.equal(withPhoto.body.get("photo").name, "plate.jpg");
  });
});

describe("imageFileError", () => {
  it("accepts an icon svg and rejects it as a photo", () => {
    const icon = fileOf("mark.svg", "image/svg+xml", 20);
    assert.equal(imageFileError(icon, "icon"), "");
    assert.match(imageFileError(icon, "photo"), /JPEG/);
  });

  it("rejects a file over 1 MB", () => {
    const big = fileOf("plate.jpg", "image/jpeg", FILE_BYTES + 1);
    assert.match(imageFileError(big, "photo"), /1 ميغابايت/);
  });
});

describe("ordering and copy", () => {
  it("places a new row after the highest sort order", () => {
    assert.equal(nextSortOrder([{ sort_order: 2 }, { sort_order: 5 }]), 6);
    assert.equal(nextSortOrder([]), 0);
  });

  it("swaps distinct sort orders and separates equal ones", () => {
    assert.deepEqual(
      sortOrdersForMove({ sort_order: 1 }, { sort_order: 4 }, "up"),
      { moving: 4, staying: 1 },
    );
    assert.deepEqual(
      sortOrdersForMove({ sort_order: 0 }, { sort_order: 0 }, "down"),
      { moving: 1, staying: 0 },
    );
  });

  it("formats the price with Latin digits", () => {
    assert.equal(formatPrice(25000), "25,000");
    assert.equal(itemCountLabel(2), "صنفان");
  });

  it("explains a category that still has items", () => {
    assert.equal(
      menuErrorText({ status: 409, body: { message: "category_not_empty" } }),
      "هذا التصنيف ما زال فيه أصناف. احذفوا الأصناف أولاً.",
    );
  });

  it("explains the five-banner limit", () => {
    assert.equal(
      menuErrorText({ status: 409, body: { message: "banner_limit" } }),
      "يمكن حفظ 5 لافتات. احذفوا واحدة قبل إضافة غيرها.",
    );
  });
});
