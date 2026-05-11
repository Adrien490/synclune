import { describe, it, expect } from "vitest";

import { isSafeStorefrontLink } from "../is-safe-storefront-link";

describe("isSafeStorefrontLink", () => {
	it("accepts an internal path starting with /", () => {
		expect(isSafeStorefrontLink("/shop")).toBe(true);
		expect(isSafeStorefrontLink("/collections/promo")).toBe(true);
		expect(isSafeStorefrontLink("/")).toBe(true);
	});

	it("accepts an https absolute URL", () => {
		expect(isSafeStorefrontLink("https://example.com")).toBe(true);
		expect(isSafeStorefrontLink("https://synclune.fr/landing")).toBe(true);
	});

	it("rejects empty string", () => {
		expect(isSafeStorefrontLink("")).toBe(false);
	});

	it("rejects protocol-relative URLs (open redirect)", () => {
		expect(isSafeStorefrontLink("//evil.com")).toBe(false);
		expect(isSafeStorefrontLink("//evil.com/path")).toBe(false);
		expect(isSafeStorefrontLink("///path")).toBe(false);
	});

	it("rejects javascript: URLs (XSS)", () => {
		expect(isSafeStorefrontLink("javascript:alert(1)")).toBe(false);
		expect(isSafeStorefrontLink("JAVASCRIPT:alert(1)")).toBe(false);
	});

	it("rejects http:// (insecure)", () => {
		expect(isSafeStorefrontLink("http://example.com")).toBe(false);
	});

	it("rejects other schemes", () => {
		expect(isSafeStorefrontLink("mailto:foo@bar.com")).toBe(false);
		expect(isSafeStorefrontLink("tel:+33123456789")).toBe(false);
		expect(isSafeStorefrontLink("data:text/html,<script>alert(1)</script>")).toBe(false);
		expect(isSafeStorefrontLink("ftp://example.com")).toBe(false);
	});

	it("rejects bare relative paths without leading /", () => {
		expect(isSafeStorefrontLink("shop")).toBe(false);
		expect(isSafeStorefrontLink("./shop")).toBe(false);
		expect(isSafeStorefrontLink("../shop")).toBe(false);
	});
});
