import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categoryIndexAtMarker, readPublicMenu } from "./public-menu.js";

describe("readPublicMenu", () => {
  it("keeps the API order and the Arabic text the customer reads", () => {
    const menu = readPublicMenu([
      {
        name: { ar: " مشاوي ", en: "Grill" },
        icon_url: "https://nadeeni-api.onrender.com/api/public/restaurants/shawarma-house/menu-categories/1/icon",
        items: [
          {
            name: { ar: "شاورما دجاج", en: "Chicken shawarma" },
            description: { ar: "مع ثوم", en: null },
            price: 25000,
            badge: "offer",
            photo_url: null,
          },
        ],
      },
    ]);

    assert.deepEqual(menu.banners, []);
    assert.equal(menu.categories.length, 1);
    assert.equal(menu.categories[0].name.ar, "مشاوي");
    assert.equal(menu.categories[0].name.en, "Grill");
    assert.equal(menu.categories[0].items[0].name.ar, "شاورما دجاج");
    assert.equal(menu.categories[0].items[0].description.en, null);
    assert.equal(menu.categories[0].items[0].price, 25000);
    assert.equal(menu.categories[0].items[0].badge, "offer");
    assert.equal(menu.categories[0].items[0].photoUrl, "");
  });

  it("reads active banner pictures from the menu object", () => {
    const menu = readPublicMenu({
      banners: [
        { image_url: " https://nadeeni-api.onrender.com/api/public/restaurants/shawarma-house/banners/3/image?v=ab " },
        { image_url: "" },
        {},
      ],
      categories: [],
    });

    assert.deepEqual(menu.banners, [
      {
        imageUrl: "https://nadeeni-api.onrender.com/api/public/restaurants/shawarma-house/banners/3/image?v=ab",
      },
    ]);
    assert.deepEqual(menu.categories, []);
  });

  it("drops a category that has no readable item", () => {
    const menu = readPublicMenu([
      { name: { ar: "مشاوي", en: null }, items: [{ name: { ar: "", en: "Grill" }, price: 10 }] },
      { name: { ar: "", en: "Drinks" }, items: [{ name: { ar: "ماء", price: 0 }, photo_url: "" }] },
    ]);

    assert.deepEqual(menu, { banners: [], categories: [] });
  });

  it("keeps a zero price and ignores a price that is not a whole number", () => {
    const menu = readPublicMenu([
      {
        name: { ar: "مشروبات" },
        items: [
          { name: { ar: "ماء" }, price: 0, badge: "new" },
          { name: { ar: "عصير" }, price: 1.5, badge: "sale" },
        ],
      },
    ]);

    assert.deepEqual(
      menu.categories[0].items.map((item) => [item.price, item.badge]),
      [
        [0, "new"],
        [null, null],
      ],
    );
  });

  it("returns nothing when the payload has no menu", () => {
    assert.deepEqual(readPublicMenu(null), { banners: [], categories: [] });
    assert.deepEqual(readPublicMenu({ items: [] }), { banners: [], categories: [] });
  });
});

describe("categoryIndexAtMarker", () => {
  const sections = [
    { index: 0, top: -40, bottom: 400 },
    { index: 1, top: 400, bottom: 900 },
    { index: 2, top: 900, bottom: 1400 },
  ];

  it("keeps the section whose heading has reached the bar", () => {
    assert.equal(categoryIndexAtMarker(sections, { marker: 140, viewportHeight: 800, atEnd: false }), 0);
  });

  it("moves to the next section once its heading passes the bar", () => {
    const scrolled = [
      { index: 0, top: -700, bottom: -40 },
      { index: 1, top: -40, bottom: 520 },
      { index: 2, top: 520, bottom: 980 },
    ];
    assert.equal(categoryIndexAtMarker(scrolled, { marker: 140, viewportHeight: 800, atEnd: false }), 1);
  });

  it("picks the heading closest to the bar when the page cannot scroll any further", () => {
    const pinned = [
      { index: 3, top: -180, bottom: 220 },
      { index: 4, top: 220, bottom: 700 },
    ];
    assert.equal(categoryIndexAtMarker(pinned, { marker: 140, viewportHeight: 800, atEnd: true }), 4);
  });
});
