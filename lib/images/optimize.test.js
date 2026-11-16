import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nextConfig from "../../next.config.mjs";
import { shouldOptimize } from "./optimize.js";

const photo = "https://nadeeni-api.onrender.com/api/public/restaurants/shawarma-house/menu-items/4/photo?v=ab";

describe("shouldOptimize", () => {
  it("resizes public menu files and files in public/", () => {
    assert.equal(shouldOptimize(photo), true);
    assert.equal(shouldOptimize("/choice-dining.png"), true);
  });

  it("leaves local APIs, other sites, SVG icons, and file previews as the original file", () => {
    assert.equal(shouldOptimize("http://127.0.0.1:8000/api/public/restaurants/a/menu-items/1/photo"), false);
    assert.equal(shouldOptimize("http://192.168.1.8:8000/api/public/restaurants/a/icon"), false);
    assert.equal(shouldOptimize("https://nadeeni-api.onrender.com/api/public/restaurants/kfc/icon?v=ab"), false);
    assert.equal(shouldOptimize("https://nadeeni-api.onrender.com/api/public/restaurants/kfc/menu-categories/1/icon"), false);
    assert.equal(shouldOptimize("https://example.com/plate.jpg"), false);
    assert.equal(shouldOptimize("blob:http://localhost/123"), false);
    assert.equal(shouldOptimize(""), false);
  });

  it("agrees with the image hosts allowed in next.config", () => {
    const url = new URL(photo);
    const allowed = nextConfig.images.remotePatterns.some(
      (pattern) => pattern.protocol === url.protocol.replace(":", "") && pattern.hostname === url.hostname,
    );
    assert.equal(shouldOptimize(photo), allowed);
    assert.equal(
      nextConfig.images.remotePatterns.some((pattern) => pattern.hostname === "127.0.0.1"),
      false,
    );
  });
});
