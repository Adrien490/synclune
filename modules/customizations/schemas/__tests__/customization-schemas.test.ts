import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	CustomizationRequestStatus: {
		PENDING: "PENDING",
		IN_PROGRESS: "IN_PROGRESS",
		COMPLETED: "COMPLETED",
		CANCELLED: "CANCELLED",
	},
}));

// Mock libphonenumber-js for customization schema
vi.mock("libphonenumber-js", () => ({
	isValidPhoneNumber: (val: string) => val.startsWith("+33"),
}));

import { customizationSchema } from "../customization.schema";
import { updateStatusSchema } from "../update-status.schema";
import { bulkUpdateStatusSchema } from "../bulk-update-status.schema";

// ============================================================================
// CUSTOMIZATION FORM SCHEMA
// ============================================================================

describe("customizationSchema", () => {
	const validData = {
		firstName: "Alice",
		email: "alice@example.com",
		phone: "",
		productTypeLabel: "Bague",
		details: "Je souhaite une bague en or avec gravure personnalisee sur l'interieur",
		rgpdConsent: true,
		website: "",
	};

	it("should accept valid data", () => {
		const result = customizationSchema.safeParse(validData);

		expect(result.success).toBe(true);
	});

	describe("firstName", () => {
		it("should reject firstName shorter than 2 characters", () => {
			const result = customizationSchema.safeParse({
				...validData,
				firstName: "A",
			});

			expect(result.success).toBe(false);
		});

		it("should reject firstName longer than 50 characters", () => {
			const result = customizationSchema.safeParse({
				...validData,
				firstName: "A".repeat(51),
			});

			expect(result.success).toBe(false);
		});

		it("should trim whitespace", () => {
			const result = customizationSchema.safeParse({
				...validData,
				firstName: "  Alice  ",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.firstName).toBe("Alice");
			}
		});
	});

	describe("email", () => {
		it("should reject invalid email format", () => {
			const result = customizationSchema.safeParse({
				...validData,
				email: "not-an-email",
			});

			expect(result.success).toBe(false);
		});

		it("should lowercase the email", () => {
			const result = customizationSchema.safeParse({
				...validData,
				email: "Alice@Example.COM",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe("alice@example.com");
			}
		});

		it("should reject email longer than 100 characters", () => {
			const result = customizationSchema.safeParse({
				...validData,
				email: `${"a".repeat(90)}@example.com`,
			});

			expect(result.success).toBe(false);
		});
	});

	describe("phone", () => {
		it("should accept empty phone", () => {
			const result = customizationSchema.safeParse({
				...validData,
				phone: "",
			});

			expect(result.success).toBe(true);
		});

		it("should accept valid French phone number", () => {
			const result = customizationSchema.safeParse({
				...validData,
				phone: "+33612345678",
			});

			expect(result.success).toBe(true);
		});

		it("should reject invalid phone number", () => {
			const result = customizationSchema.safeParse({
				...validData,
				phone: "invalid-phone",
			});

			expect(result.success).toBe(false);
		});
	});

	describe("details", () => {
		it("should reject details shorter than 20 characters", () => {
			const result = customizationSchema.safeParse({
				...validData,
				details: "Too short",
			});

			expect(result.success).toBe(false);
		});

		it("should reject details longer than 2000 characters", () => {
			const result = customizationSchema.safeParse({
				...validData,
				details: "A".repeat(2001),
			});

			expect(result.success).toBe(false);
		});
	});

	describe("rgpdConsent", () => {
		it("should reject when rgpdConsent is false", () => {
			const result = customizationSchema.safeParse({
				...validData,
				rgpdConsent: false,
			});

			expect(result.success).toBe(false);
		});
	});

	describe("honeypot", () => {
		it("should accept empty website (honeypot)", () => {
			const result = customizationSchema.safeParse({
				...validData,
				website: "",
			});

			expect(result.success).toBe(true);
		});

		it("should accept filled website field (honeypot catches bots at action level)", () => {
			const result = customizationSchema.safeParse({
				...validData,
				website: "http://spam.com",
			});

			// Schema passes, honeypot is checked in the action
			expect(result.success).toBe(true);
		});
	});
});

// ============================================================================
// UPDATE STATUS SCHEMA
// ============================================================================

describe("updateStatusSchema", () => {
	it("should accept valid requestId and status", () => {
		const result = updateStatusSchema.safeParse({
			requestId: "cm1234567890abcdefghijklm",
			status: "IN_PROGRESS",
		});

		expect(result.success).toBe(true);
	});

	it("should reject invalid requestId format", () => {
		const result = updateStatusSchema.safeParse({
			requestId: "not-a-cuid2",
			status: "PENDING",
		});

		expect(result.success).toBe(false);
	});

	it("should reject invalid status value", () => {
		const result = updateStatusSchema.safeParse({
			requestId: "cm1234567890abcdefghijklm",
			status: "INVALID_STATUS",
		});

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// BULK UPDATE STATUS SCHEMA
// ============================================================================

describe("bulkUpdateStatusSchema", () => {
	const validId = "cm1234567890abcdefghijklm";

	it("should accept valid array of requestIds and status", () => {
		const result = bulkUpdateStatusSchema.safeParse({
			requestIds: [validId],
			status: "COMPLETED",
		});

		expect(result.success).toBe(true);
	});

	it("should reject empty requestIds array", () => {
		const result = bulkUpdateStatusSchema.safeParse({
			requestIds: [],
			status: "COMPLETED",
		});

		expect(result.success).toBe(false);
	});

	it("should reject more than 100 requestIds", () => {
		const result = bulkUpdateStatusSchema.safeParse({
			requestIds: Array.from({ length: 101 }, () => validId),
			status: "COMPLETED",
		});

		expect(result.success).toBe(false);
	});

	it("should accept exactly 100 requestIds", () => {
		const result = bulkUpdateStatusSchema.safeParse({
			requestIds: Array.from({ length: 100 }, () => validId),
			status: "COMPLETED",
		});

		expect(result.success).toBe(true);
	});

	it("should reject invalid status", () => {
		const result = bulkUpdateStatusSchema.safeParse({
			requestIds: [validId],
			status: "UNKNOWN",
		});

		expect(result.success).toBe(false);
	});
});
