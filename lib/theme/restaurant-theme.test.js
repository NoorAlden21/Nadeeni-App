import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeHex,
  readableOn,
  restaurantTheme,
  restaurantTitle,
  themeFieldChanges,
  themeStyle,
} from "./restaurant-theme.js";

describe("restaurant theme colors", () => {
  it("expands #rgb and rejects anything else", () => {
    assert.equal(normalizeHex("#4a0"), "#44aa00");
    assert.equal(normalizeHex(" #4A0418 "), "#4a0418");
    assert.equal(normalizeHex("#fff"), "#ffffff");
    assert.equal(normalizeHex("#7e062"), null);
    assert.equal(normalizeHex("#gg0000"), null);
    assert.equal(normalizeHex(null), null);
    assert.equal(normalizeHex(""), null);
  });

  it("leaves the ناديني palette in place when both colors are empty", () => {
    assert.equal(themeStyle({ primary_color: null, secondary_color: null }), undefined);
    assert.equal(restaurantTheme({}).secondaryRole, "default");
  });

  it("uses a dark primary as the action color and picks ivory text", () => {
    const style = themeStyle({ primary_color: "#0b3d91", secondary_color: null });
    assert.equal(style["--restaurant-primary"], "#0b3d91");
    assert.equal(style["--restaurant-on-primary"], "#fdfaf1");
    assert.equal(readableOn("#0b3d91"), "#fdfaf1");
    assert.equal(style["--restaurant-secondary"], undefined);
  });

  it("picks ink text when the primary color is light", () => {
    const style = themeStyle({ primary_color: "#f4e8d0" });
    assert.equal(style["--restaurant-on-primary"], "#2a1016");
  });

  it("keeps gold when the secondary color is a light wash", () => {
    const theme = restaurantTheme({ secondary_color: "#f4e8d0" });
    const style = themeStyle({ secondary_color: "#f4e8d0" });
    assert.equal(theme.secondaryRole, "wash");
    assert.equal(style["--restaurant-wash"], "#f4e8d0");
    assert.equal(style["--restaurant-photo"], "#f4e8d0");
    assert.equal(style["--restaurant-secondary"], undefined);
  });

  it("replaces gold when the secondary color can sit on ivory", () => {
    const style = themeStyle({ secondary_color: "#0b3d91" });
    assert.equal(style["--restaurant-secondary"], "#0b3d91");
    assert.equal(style["--restaurant-on-secondary"], "#fdfaf1");
    assert.equal(style["--restaurant-wash"], undefined);
    assert.equal(style["--choice-line"], "#0b3d91");
  });

  it("tints the welcome page from the primary and outlines it with a dark secondary", () => {
    const style = themeStyle({ primary_color: "#ffc20e", secondary_color: "#f00000" });
    assert.equal(style["--choice-line"], "#f00000");
    assert.equal(style["--choice-canvas"], style["--restaurant-foam"]);
  });
});

describe("restaurant english name", () => {
  it("shows the arabic name until the page is english and name_en is set", () => {
    const restaurant = { name: "بيت الشاورما", name_en: "Shawarma House" };
    assert.equal(restaurantTitle(restaurant, "ar"), "بيت الشاورما");
    assert.equal(restaurantTitle(restaurant, "en"), "Shawarma House");
    assert.equal(restaurantTitle({ name: "بيت الشاورما", name_en: null }, "en"), "بيت الشاورما");
    assert.equal(restaurantTitle({ name: "بيت الشاورما", name_en: "  " }, "en"), "بيت الشاورما");
  });
});

describe("restaurant theme fields", () => {
  it("sends a color only when it is set, and expands #rgb", () => {
    assert.deepEqual(themeFieldChanges(null, { name_en: "", primary_color: "#4a0", secondary_color: "" }), {
      error: "",
      body: { primary_color: "#44aa00" },
    });
  });

  it("sends null to clear a stored color or english name", () => {
    const current = { name_en: "Shawarma House", primary_color: "#0b3d91", secondary_color: null };
    assert.deepEqual(themeFieldChanges(current, { name_en: "", primary_color: "", secondary_color: "" }), {
      error: "",
      body: { name_en: null, primary_color: null },
    });
  });

  it("rejects a color that is not hex", () => {
    const result = themeFieldChanges(null, { primary_color: "burgundy" });
    assert.equal(result.error, "اللون يُكتب #rgb أو #rrggbb.");
    assert.equal(result.body, null);
  });
});
