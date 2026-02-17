import { describe, it, expect, vi } from "vitest";

import {
	subscribeToNewsletterSchema,
	confirmationTokenSchema,
	unsubscribeTokenSchema,
} from "../newsletter.schemas";

// A well-formed UUID v4 for token tests
const VALID_UUID_V4 = "550e8400-e29b-41d4-a716-446655440000";

// ============================================================================
// subscribeToNewsletterSchema
// ============================================================================

describe("subscribeToNewsletterSchema", () => {
	const validData = {
		email: "alice@example.com",
		consent: true,
	};

	it("should accept a valid email with consent", () => {
		const result = subscribeToNewsletterSchema.safeParse(validData);

		expect(result.success).toBe(true);
	});

	describe("email field", () => {
		it("should reject an invalid email format", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "not-an-email",
			});

			expect(result.success).toBe(false);
		});

		it("should reject an email with missing domain", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@",
			});

			expect(result.success).toBe(false);
		});

		it("should auto-correct gmial.com typo to gmail.com", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@gmial.com",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe("alice@gmail.com");
			}
		});

		it("should auto-correct yahooo.com typo to yahoo.com", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@yahooo.com",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe("alice@yahoo.com");
			}
		});

		it("should auto-correct outloook.com typo to outlook.com", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@outloook.com",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe("alice@outlook.com");
			}
		});

		it("should block yopmail.com disposable email domain", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@yopmail.com",
			});

			expect(result.success).toBe(false);
		});

		it("should block mailinator.com disposable email domain", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@mailinator.com",
			});

			expect(result.success).toBe(false);
		});

		it("should block 10minutemail.com disposable email domain", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@10minutemail.com",
			});

			expect(result.success).toBe(false);
		});

		it("should block guerrillamail.com disposable email domain", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@guerrillamail.com",
			});

			expect(result.success).toBe(false);
		});

		it("should accept a valid hotmail.fr address (not blocked, not corrected)", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				email: "alice@hotmail.fr",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe("alice@hotmail.fr");
			}
		});
	});

	describe("consent field", () => {
		it("should reject when consent is false", () => {
			const result = subscribeToNewsletterSchema.safeParse({
				...validData,
				consent: false,
			});

			expect(result.success).toBe(false);
		});

		it("should reject when consent is missing", () => {
			const { consent: _consent, ...withoutConsent } = validData;
			const result = subscribeToNewsletterSchema.safeParse(withoutConsent);

			expect(result.success).toBe(false);
		});
	});
});

// ============================================================================
// confirmationTokenSchema
// ============================================================================

describe("confirmationTokenSchema", () => {
	it("should accept a valid UUID v4 token", () => {
		const result = confirmationTokenSchema.safeParse({ token: VALID_UUID_V4 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.token).toBe(VALID_UUID_V4);
		}
	});

	it("should reject an empty string", () => {
		const result = confirmationTokenSchema.safeParse({ token: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a non-UUID string", () => {
		const result = confirmationTokenSchema.safeParse({ token: "not-a-uuid" });

		expect(result.success).toBe(false);
	});

	it("should reject a UUID v1 (not v4)", () => {
		const result = confirmationTokenSchema.safeParse({
			// Version digit is 1, not 4
			token: "550e8400-e29b-11d4-a716-446655440000",
		});

		expect(result.success).toBe(false);
	});

	it("should reject when token field is missing", () => {
		const result = confirmationTokenSchema.safeParse({});

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// unsubscribeTokenSchema
// ============================================================================

describe("unsubscribeTokenSchema", () => {
	it("should accept a valid UUID v4 token", () => {
		const result = unsubscribeTokenSchema.safeParse({ token: VALID_UUID_V4 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.token).toBe(VALID_UUID_V4);
		}
	});

	it("should reject an empty string", () => {
		const result = unsubscribeTokenSchema.safeParse({ token: "" });

		expect(result.success).toBe(false);
	});

	it("should reject an invalid format string", () => {
		const result = unsubscribeTokenSchema.safeParse({ token: "invalid-token" });

		expect(result.success).toBe(false);
	});

	it("should reject when token field is missing", () => {
		const result = unsubscribeTokenSchema.safeParse({});

		expect(result.success).toBe(false);
	});
});
