import { describe, it, expect } from "vitest";

import { addressIdSchema } from "../user-addresses.schemas";

// A valid cuid2 string (26 lowercase alphanumeric chars, starts with a letter).
const VALID_CUID = "clh1234567890abcdefghijklm";

// ============================================================================
// addressIdSchema
// ============================================================================

describe("addressIdSchema", () => {
	it("should accept a valid cuid2 addressId", () => {
		const result = addressIdSchema.safeParse({ addressId: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should preserve the addressId value on success", () => {
		const result = addressIdSchema.safeParse({ addressId: VALID_CUID });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.addressId).toBe(VALID_CUID);
		}
	});

	it("should reject a plain string that is not cuid2 format", () => {
		const result = addressIdSchema.safeParse({ addressId: "not-a-cuid2" });

		expect(result.success).toBe(false);
	});

	it("should reject an empty addressId string", () => {
		const result = addressIdSchema.safeParse({ addressId: "" });

		expect(result.success).toBe(false);
	});

	it("should reject a numeric addressId", () => {
		const result = addressIdSchema.safeParse({ addressId: 12345 });

		expect(result.success).toBe(false);
	});

	it("should reject when addressId is missing", () => {
		const result = addressIdSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject when addressId is null", () => {
		const result = addressIdSchema.safeParse({ addressId: null });

		expect(result.success).toBe(false);
	});

	it("should reject a UUID (not cuid2 format)", () => {
		const result = addressIdSchema.safeParse({
			addressId: "550e8400-e29b-41d4-a716-446655440000",
		});

		expect(result.success).toBe(false);
	});
});
