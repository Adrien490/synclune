import { describe, it, expect } from "vitest";
import { generateAnonymizedEmail } from "../anonymization.utils";

describe("generateAnonymizedEmail", () => {
	it("should return an email with the anonymized- prefix", () => {
		const result = generateAnonymizedEmail("user-123");
		expect(result).toMatch(/^anonymized-/);
	});

	it("should embed the userId in the email", () => {
		const userId = "clxyz123abc";
		const result = generateAnonymizedEmail(userId);
		expect(result).toContain(userId);
	});

	it("should use the @deleted.synclune.local domain", () => {
		const result = generateAnonymizedEmail("any-id");
		expect(result).toBe("anonymized-any-id@deleted.synclune.local");
	});

	it("should produce unique emails for different userIds", () => {
		const email1 = generateAnonymizedEmail("id-001");
		const email2 = generateAnonymizedEmail("id-002");
		expect(email1).not.toBe(email2);
	});

	it("should be deterministic: same userId always gives the same email", () => {
		const userId = "stable-id-42";
		expect(generateAnonymizedEmail(userId)).toBe(generateAnonymizedEmail(userId));
	});
});
