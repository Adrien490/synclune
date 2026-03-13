import { describe, expect, it } from "vitest";
import { simpleHash, isSafeLink } from "../announcement-bar.constants";

// ─── simpleHash ─────────────────────────────────────────────────────

describe("simpleHash", () => {
	it("returns a consistent hash for the same input", () => {
		const hash1 = simpleHash("hello");
		const hash2 = simpleHash("hello");
		expect(hash1).toBe(hash2);
	});

	it("returns different hashes for different inputs", () => {
		const hash1 = simpleHash("Livraison offerte dès 50€");
		const hash2 = simpleHash("Soldes -20% sur tout le site");
		expect(hash1).not.toBe(hash2);
	});

	it("returns a base36 string", () => {
		const hash = simpleHash("test");
		expect(hash).toMatch(/^[0-9a-z]+$/);
	});

	it("handles empty string", () => {
		const hash = simpleHash("");
		expect(hash).toBe("0");
	});

	it("handles unicode characters", () => {
		const hash = simpleHash("💎 Nouvelle collection ✨");
		expect(hash).toMatch(/^[0-9a-z]+$/);
	});
});

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
