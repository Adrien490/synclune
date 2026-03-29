import { describe, it, expect, vi } from "vitest";

// Mock isAllowedMediaDomain: allow all domains except evil.com
vi.mock("@/shared/lib/media-validation", () => ({
	isAllowedMediaDomain: (url: string) => {
		try {
			const hostname = new URL(url).hostname;
			return !hostname.includes("evil.com");
		} catch {
			return false;
		}
	},
}));

// Use real libphonenumber-js for accurate phone validation
import { customizationSchema, customizationDraftSchema } from "../customization.schema";

// ============================================================================
// HELPERS
// ============================================================================

/** Minimal valid form data for customizationSchema */
const validData = {
	firstName: "Alice",
	email: "alice@example.com",
	details: "Je souhaite une bague en or avec gravure personnalisee",
};

// ============================================================================
// customizationSchema — full form
// ============================================================================

describe("customizationSchema", () => {
	it("accepts a fully valid form submission", () => {
		const result = customizationSchema.safeParse({
			...validData,
			phone: "+33612345678",
			productTypeLabel: "Bague",
			inspirationMedias: [
				{
					url: "https://utfs.io/f/abc123",
					blurDataUrl: "data:image/png;base64,abc",
					altText: "Bague en or",
				},
			],
			website: "",
		});

		expect(result.success).toBe(true);
	});

	// --------------------------------------------------------------------------
	// firstName
	// --------------------------------------------------------------------------

	describe("firstName", () => {
		it("is required — missing firstName fails", () => {
			const result = customizationSchema.safeParse({
				email: validData.email,
				details: validData.details,
			});
			expect(result.success).toBe(false);
		});

		it("requires at least 2 characters", () => {
			const result = customizationSchema.safeParse({ ...validData, firstName: "A" });
			expect(result.success).toBe(false);
		});

		it("accepts exactly 2 characters", () => {
			const result = customizationSchema.safeParse({ ...validData, firstName: "Al" });
			expect(result.success).toBe(true);
		});

		it("rejects more than 50 characters", () => {
			const result = customizationSchema.safeParse({ ...validData, firstName: "A".repeat(51) });
			expect(result.success).toBe(false);
		});

		it("accepts exactly 50 characters", () => {
			const result = customizationSchema.safeParse({ ...validData, firstName: "A".repeat(50) });
			expect(result.success).toBe(true);
		});

		it("trims surrounding whitespace", () => {
			const result = customizationSchema.safeParse({ ...validData, firstName: "  Alice  " });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.firstName).toBe("Alice");
			}
		});
	});

	// --------------------------------------------------------------------------
	// email
	// --------------------------------------------------------------------------

	describe("email", () => {
		it("is required — missing email fails", () => {
			const result = customizationSchema.safeParse({
				firstName: validData.firstName,
				details: validData.details,
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid email format", () => {
			const result = customizationSchema.safeParse({ ...validData, email: "not-an-email" });
			expect(result.success).toBe(false);
		});

		it("rejects email missing domain", () => {
			const result = customizationSchema.safeParse({ ...validData, email: "alice@" });
			expect(result.success).toBe(false);
		});

		it("rejects email longer than 100 characters", () => {
			const result = customizationSchema.safeParse({
				...validData,
				email: `${"a".repeat(90)}@example.com`,
			});
			expect(result.success).toBe(false);
		});

		it("lowercases the email on parse", () => {
			const result = customizationSchema.safeParse({ ...validData, email: "Alice@Example.COM" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe("alice@example.com");
			}
		});
	});

	// --------------------------------------------------------------------------
	// phone
	// --------------------------------------------------------------------------

	describe("phone", () => {
		it("is optional — omitted phone is accepted", () => {
			const result = customizationSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("accepts empty string", () => {
			const result = customizationSchema.safeParse({ ...validData, phone: "" });
			expect(result.success).toBe(true);
		});

		it("accepts a valid international number (+33612345678)", () => {
			const result = customizationSchema.safeParse({ ...validData, phone: "+33612345678" });
			expect(result.success).toBe(true);
		});

		it("accepts a valid US number (+12125551234)", () => {
			const result = customizationSchema.safeParse({ ...validData, phone: "+12125551234" });
			expect(result.success).toBe(true);
		});

		it("rejects an obviously invalid string", () => {
			const result = customizationSchema.safeParse({ ...validData, phone: "invalid-phone" });
			expect(result.success).toBe(false);
		});

		it("transforms a country-code-only value (+33) to empty string", () => {
			// The regex /^\+\d{1,4}$/ matches bare dial codes and replaces them with ""
			const result = customizationSchema.safeParse({ ...validData, phone: "+33" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.phone).toBe("");
			}
		});

		it("transforms +1 (country code only) to empty string", () => {
			const result = customizationSchema.safeParse({ ...validData, phone: "+1" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.phone).toBe("");
			}
		});
	});

	// --------------------------------------------------------------------------
	// details
	// --------------------------------------------------------------------------

	describe("details", () => {
		it("is required — missing details fails", () => {
			const result = customizationSchema.safeParse({
				firstName: validData.firstName,
				email: validData.email,
			});
			expect(result.success).toBe(false);
		});

		it("requires at least 10 characters", () => {
			const result = customizationSchema.safeParse({ ...validData, details: "Too short" });
			expect(result.success).toBe(false);
		});

		it("accepts exactly 10 characters", () => {
			const result = customizationSchema.safeParse({ ...validData, details: "1234567890" });
			expect(result.success).toBe(true);
		});

		it("rejects more than 2000 characters", () => {
			const result = customizationSchema.safeParse({ ...validData, details: "A".repeat(2001) });
			expect(result.success).toBe(false);
		});

		it("accepts exactly 2000 characters", () => {
			const result = customizationSchema.safeParse({ ...validData, details: "A".repeat(2000) });
			expect(result.success).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// inspirationMedias
	// --------------------------------------------------------------------------

	describe("inspirationMedias", () => {
		it("defaults to an empty array when not provided", () => {
			const result = customizationSchema.safeParse(validData);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.inspirationMedias).toEqual([]);
			}
		});

		it("accepts an empty array", () => {
			const result = customizationSchema.safeParse({ ...validData, inspirationMedias: [] });
			expect(result.success).toBe(true);
		});

		it("rejects more than 5 items", () => {
			const result = customizationSchema.safeParse({
				...validData,
				inspirationMedias: Array.from({ length: 6 }, (_, i) => ({
					url: `https://utfs.io/f/file${i}`,
				})),
			});
			expect(result.success).toBe(false);
		});

		it("accepts exactly 5 items", () => {
			const result = customizationSchema.safeParse({
				...validData,
				inspirationMedias: Array.from({ length: 5 }, (_, i) => ({
					url: `https://utfs.io/f/file${i}`,
				})),
			});
			expect(result.success).toBe(true);
		});

		it("rejects URLs from unauthorized domains (evil.com)", () => {
			const result = customizationSchema.safeParse({
				...validData,
				inspirationMedias: [{ url: "https://evil.com/image.jpg" }],
			});
			expect(result.success).toBe(false);
		});

		it("accepts URLs from authorized domains (utfs.io)", () => {
			const result = customizationSchema.safeParse({
				...validData,
				inspirationMedias: [{ url: "https://utfs.io/f/abc123" }],
			});
			expect(result.success).toBe(true);
		});

		it("validates blurDataUrl format — accepts data:image/png;base64,...", () => {
			const result = customizationSchema.safeParse({
				...validData,
				inspirationMedias: [
					{
						url: "https://utfs.io/f/abc123",
						blurDataUrl: "data:image/png;base64,iVBORw0KGgo=",
					},
				],
			});
			expect(result.success).toBe(true);
		});

		it("validates blurDataUrl format — accepts data:image/jpeg;base64,...", () => {
			const result = customizationSchema.safeParse({
				...validData,
				inspirationMedias: [
					{
						url: "https://utfs.io/f/abc123",
						blurDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgAB",
					},
				],
			});
			expect(result.success).toBe(true);
		});

		it("rejects blurDataUrl with unsupported format (data:image/bmp;...)", () => {
			const result = customizationSchema.safeParse({
				...validData,
				inspirationMedias: [
					{
						url: "https://utfs.io/f/abc123",
						blurDataUrl: "data:image/bmp;base64,somedata",
					},
				],
			});
			expect(result.success).toBe(false);
		});

		it("rejects blurDataUrl that does not start with data:image/", () => {
			const result = customizationSchema.safeParse({
				...validData,
				inspirationMedias: [
					{
						url: "https://utfs.io/f/abc123",
						blurDataUrl: "https://example.com/blur.png",
					},
				],
			});
			expect(result.success).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// website (honeypot)
	// --------------------------------------------------------------------------

	describe("website honeypot", () => {
		it("is optional — omitted website is accepted", () => {
			const result = customizationSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("accepts empty string", () => {
			const result = customizationSchema.safeParse({ ...validData, website: "" });
			expect(result.success).toBe(true);
		});

		it("accepts a filled value (bot detection happens at the action level)", () => {
			const result = customizationSchema.safeParse({ ...validData, website: "http://spam.com" });
			expect(result.success).toBe(true);
		});
	});
});

// ============================================================================
// customizationDraftSchema — localStorage partial data
// ============================================================================

describe("customizationDraftSchema", () => {
	it("accepts a fully empty object", () => {
		const result = customizationDraftSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts partial data with only firstName", () => {
		const result = customizationDraftSchema.safeParse({ firstName: "Alice" });
		expect(result.success).toBe(true);
	});

	it("accepts partial data with only email", () => {
		const result = customizationDraftSchema.safeParse({ email: "alice@example.com" });
		expect(result.success).toBe(true);
	});

	it("accepts partial data with only details", () => {
		const result = customizationDraftSchema.safeParse({ details: "Some draft text" });
		expect(result.success).toBe(true);
	});

	it("accepts all known fields together", () => {
		const result = customizationDraftSchema.safeParse({
			firstName: "Alice",
			email: "alice@example.com",
			phone: "+33612345678",
			productTypeLabel: "Collier",
			details: "Projet en cours de redaction",
		});
		expect(result.success).toBe(true);
	});

	it("allows extra keys via passthrough", () => {
		// passthrough() preserves unknown keys without failing
		const result = customizationDraftSchema.safeParse({
			firstName: "Alice",
			unknownKey: "some-value",
			anotherExtra: 42,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toHaveProperty("unknownKey", "some-value");
			expect(result.data).toHaveProperty("anotherExtra", 42);
		}
	});

	it("enforces max 50 characters on firstName", () => {
		const result = customizationDraftSchema.safeParse({ firstName: "A".repeat(51) });
		expect(result.success).toBe(false);
	});

	it("enforces max 100 characters on email", () => {
		const result = customizationDraftSchema.safeParse({ email: "a".repeat(101) });
		expect(result.success).toBe(false);
	});

	it("enforces max 2000 characters on details", () => {
		const result = customizationDraftSchema.safeParse({ details: "A".repeat(2001) });
		expect(result.success).toBe(false);
	});

	it("enforces max 100 characters on productTypeLabel", () => {
		const result = customizationDraftSchema.safeParse({ productTypeLabel: "A".repeat(101) });
		expect(result.success).toBe(false);
	});

	it("accepts undefined for all fields", () => {
		const result = customizationDraftSchema.safeParse({
			firstName: undefined,
			email: undefined,
			phone: undefined,
			productTypeLabel: undefined,
			details: undefined,
		});
		expect(result.success).toBe(true);
	});
});
