import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contactChanges,
  contactErrorFromApi,
  publicContactLinks,
  readFacebookUrl,
  readInstagramUrl,
  readPhone,
} from "./contact.js";

describe("restaurant contact", () => {
  it("accepts http and https links on the Facebook hosts", () => {
    assert.equal(readFacebookUrl("https://facebook.com/shawarmahouse"), "https://facebook.com/shawarmahouse");
    assert.equal(readFacebookUrl(" http://www.facebook.com/page "), "http://www.facebook.com/page");
    assert.equal(readFacebookUrl("https://m.facebook.com/x"), "https://m.facebook.com/x");
    assert.equal(readFacebookUrl("https://fb.com/abc"), "https://fb.com/abc");
    assert.equal(readFacebookUrl("https://fb.me/abc"), "https://fb.me/abc");
  });

  it("rejects a Facebook link that is not on those hosts", () => {
    assert.equal(readFacebookUrl("https://evil.com/facebook.com"), null);
    assert.equal(readFacebookUrl("https://facebook.com.evil.com/x"), null);
    assert.equal(readFacebookUrl("https://notfacebook.com/x"), null);
    assert.equal(readFacebookUrl("ftp://facebook.com/x"), null);
    assert.equal(readFacebookUrl("https://facebook.com@evil.com/x"), null);
    assert.equal(readFacebookUrl("javascript:alert(1)"), null);
    assert.equal(readFacebookUrl(`https://facebook.com/${"a".repeat(250)}`), null);
  });

  it("accepts Instagram hosts and rejects lookalikes", () => {
    assert.equal(readInstagramUrl("https://instagram.com/shawarmahouse"), "https://instagram.com/shawarmahouse");
    assert.equal(readInstagramUrl("https://www.instagr.am/x"), "https://www.instagr.am/x");
    assert.equal(readInstagramUrl("https://instagram.com.evil.com/x"), null);
    assert.equal(readInstagramUrl("https://evil.com/instagram.com"), null);
  });

  it("accepts a phone of digits, spaces, and + ( ) . - with at least 6 digits", () => {
    assert.equal(readPhone("+963944123456"), "+963944123456");
    assert.equal(readPhone(" (0944) 123-456 "), "(0944) 123-456");
    assert.equal(readPhone("123.456"), "123.456");
    assert.equal(readPhone("12345"), null);
    assert.equal(readPhone("12345a"), null);
    assert.equal(readPhone("١٢٣٤٥٦"), null);
    assert.equal(readPhone("1".repeat(33)), null);
  });

  it("sends only changed contact fields and null to clear one", () => {
    const current = {
      facebook_url: "https://facebook.com/shawarmahouse",
      instagram_url: null,
      phone: "+963944123456",
    };

    assert.deepEqual(
      contactChanges(current, {
        facebook_url: "https://facebook.com/shawarmahouse",
        instagram_url: "https://instagram.com/shawarmahouse",
        phone: "",
      }),
      {
        error: "",
        body: {
          instagram_url: "https://instagram.com/shawarmahouse",
          phone: null,
        },
      },
    );
  });

  it("omits contact fields that are still empty", () => {
    assert.deepEqual(
      contactChanges(null, { facebook_url: "", instagram_url: "  ", phone: "" }),
      { error: "", body: {} },
    );
  });

  it("refuses the patch when one filled field is invalid", () => {
    const result = contactChanges(
      {},
      { facebook_url: "https://example.com", instagram_url: "", phone: "+963944123456" },
    );
    assert.equal(result.body, null);
    assert.match(result.error, /فيسبوك/);
  });

  it("turns the API field error into the Arabic rule", () => {
    assert.match(
      contactErrorFromApi({ facebook_url: ["The facebook url field is invalid."] }),
      /فيسبوك/,
    );
    assert.equal(contactErrorFromApi({ slug: ["The slug has already been taken."] }), "");
  });

  it("builds a call button and links only for filled values", () => {
    assert.deepEqual(
      publicContactLinks({
        facebook_url: "https://facebook.com/shawarmahouse",
        instagram_url: null,
        phone: "+963944123456",
      }),
      [
        { kind: "phone", href: "tel:+963944123456", label: "+963944123456", external: false },
        { kind: "facebook", href: "https://facebook.com/shawarmahouse", label: "فيسبوك", external: true },
      ],
    );
    assert.deepEqual(publicContactLinks({ facebook_url: null, instagram_url: null, phone: null }), []);
    assert.deepEqual(publicContactLinks({ facebook_url: "https://evil.com", phone: "123" }), []);
  });
});
