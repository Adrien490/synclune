import { describe, expect, it } from "vitest";
import { isSafeLink } from "../announcement-bar.constants";

// ─── isSafeLink ─────────────────────────────────────────────────────

describe("isSafeLink", () => {
	it("accepts relative paths starting with /", () => {
		expect(isSafeLink("/boutique")).toBe(true);
		expect(isSafeLink("/collections/soldes")).toBe(true);
	});

	it("accepts https URLs", () => {
		expect(isSafeLink("https://example.com")).toBe(true);
		expect(isSafeLink("https://synclune.fr/boutique")).toBe(true);
	});

	it("rejects javascript: protocol", () => {
		expect(isSafeLink("javascript:alert(1)")).toBe(false);
	});

	it("rejects data: protocol", () => {
		expect(isSafeLink("data:text/html,<script>alert(1)</script>")).toBe(false);
	});

	it("rejects http: protocol (non-secure)", () => {
		expect(isSafeLink("http://example.com")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(isSafeLink("")).toBe(false);
	});

	it("rejects relative paths without leading slash", () => {
		expect(isSafeLink("boutique/collections")).toBe(false);
	});
});
