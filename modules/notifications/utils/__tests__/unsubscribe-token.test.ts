import { describe, expect, it, beforeAll } from "vitest";
import { generateUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribe-token";

beforeAll(() => {
	process.env.BETTER_AUTH_SECRET = "0".repeat(64);
});

describe("unsubscribe-token", () => {
	it("verifies a token issued for the same email", () => {
		const email = "buyer@example.test";
		const token = generateUnsubscribeToken(email);
		expect(verifyUnsubscribeToken(email, token)).toBe(true);
	});

	it("rejects a token bound to a different email", () => {
		const token = generateUnsubscribeToken("alice@example.test");
		expect(verifyUnsubscribeToken("eve@example.test", token)).toBe(false);
	});

	it("normalises whitespace + casing (so email URL-encoded variants match)", () => {
		const a = generateUnsubscribeToken("Buyer@Example.test");
		const b = generateUnsubscribeToken("  buyer@example.test  ");
		expect(a).toBe(b);
		expect(verifyUnsubscribeToken("buyer@example.test", a)).toBe(true);
	});

	it("rejects null / empty / wrong-length candidates", () => {
		const email = "buyer@example.test";
		expect(verifyUnsubscribeToken(email, null)).toBe(false);
		expect(verifyUnsubscribeToken(email, "")).toBe(false);
		expect(verifyUnsubscribeToken(email, "abc")).toBe(false);
		expect(verifyUnsubscribeToken(null, generateUnsubscribeToken(email))).toBe(false);
	});

	it("token is 32 hex chars (16 bytes truncated HMAC-SHA256)", () => {
		const token = generateUnsubscribeToken("buyer@example.test");
		expect(token).toMatch(/^[0-9a-f]{32}$/);
	});
});
