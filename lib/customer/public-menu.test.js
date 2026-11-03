import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readPublicMenu } from "./public-menu.js";

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
            photo_url: null,
          },
        ],
      },
    ]);

    assert.equal(menu.length, 1);
    assert.equal(menu[0].name.ar, "مشاوي");
    assert.equal(menu[0].name.en, "Grill");
    assert.equal(menu[0].items[0].name.ar, "شاورما دجاج");
    assert.equal(menu[0].items[0].description.en, null);
    assert.equal(menu[0].items[0].price, 25000);
    assert.equal(menu[0].items[0].photoUrl, "");
  });

  it("drops a category that has no readable item", () => {
    const menu = readPublicMenu([
      { name: { ar: "مشاوي", en: null }, items: [{ name: { ar: "", en: "Grill" }, price: 10 }] },
      { name: { ar: "", en: "Drinks" }, items: [{ name: { ar: "ماء", price: 0 }, photo_url: "" }] },
    ]);

    assert.deepEqual(menu, []);
  });

  it("keeps a zero price and ignores a price that is not a whole number", () => {
    const menu = readPublicMenu([
      {
        name: { ar: "مشروبات" },
        items: [
          { name: { ar: "ماء" }, price: 0 },
          { name: { ar: "عصير" }, price: 1.5 },
        ],
      },
    ]);

    assert.deepEqual(
      menu[0].items.map((item) => item.price),
      [0, null],
    );
  });

  it("returns nothing when the payload is not the public array", () => {
    assert.deepEqual(readPublicMenu(null), []);
    assert.deepEqual(readPublicMenu({ items: [] }), []);
  });
});
