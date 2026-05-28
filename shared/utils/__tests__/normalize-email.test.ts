import { describe, it, expect } from "vitest";
import { normalizeEmail } from "../normalize-email";

describe("normalizeEmail", () => {
	it("lowercases mixed-case input", () => {
		expect(normalizeEmail("User@Mail.COM")).toBe("user@mail.com");
	});

	it("trims surrounding whitespace", () => {
		expect(normalizeEmail("  user@mail.com  ")).toBe("user@mail.com");
	});

	it("combines lowercase + trim", () => {
		expect(normalizeEmail("  User@Mail.COM\t")).toBe("user@mail.com");
	});

	it("is idempotent on already-normalized input", () => {
		expect(normalizeEmail("user@mail.com")).toBe("user@mail.com");
	});

	it("preserves +suffix aliases (out of scope)", () => {
		expect(normalizeEmail("User+promo@Mail.com")).toBe("user+promo@mail.com");
	});

	it("preserves dot-aliases (out of scope)", () => {
		expect(normalizeEmail("John.Doe@Mail.com")).toBe("john.doe@mail.com");
	});
});
