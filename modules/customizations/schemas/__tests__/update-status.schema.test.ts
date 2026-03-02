import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	CustomizationRequestStatus: {
		PENDING: "PENDING",
		IN_REVIEW: "IN_REVIEW",
		APPROVED: "APPROVED",
		REJECTED: "REJECTED",
		COMPLETED: "COMPLETED",
	},
}));

import { updateStatusSchema } from "../update-status.schema";

// A valid cuid2 string (26 lowercase alphanumeric chars, starts with a letter).
const VALID_CUID = "clh1234567890abcdefghijklm";

// ============================================================================
// updateStatusSchema
// ============================================================================

describe("updateStatusSchema", () => {
	it("should accept valid requestId and PENDING status", () => {
		const result = updateStatusSchema.safeParse({
			requestId: VALID_CUID,
			status: "PENDING",
		});

		expect(result.success).toBe(true);
	});

	it("should accept IN_REVIEW status", () => {
		const result = updateStatusSchema.safeParse({
			requestId: VALID_CUID,
			status: "IN_REVIEW",
		});

		expect(result.success).toBe(true);
	});

	it("should accept APPROVED status", () => {
		const result = updateStatusSchema.safeParse({
			requestId: VALID_CUID,
			status: "APPROVED",
		});

		expect(result.success).toBe(true);
	});

	it("should accept REJECTED status", () => {
		const result = updateStatusSchema.safeParse({
			requestId: VALID_CUID,
			status: "REJECTED",
		});

		expect(result.success).toBe(true);
	});

	it("should accept COMPLETED status", () => {
		const result = updateStatusSchema.safeParse({
			requestId: VALID_CUID,
			status: "COMPLETED",
		});

		expect(result.success).toBe(true);
	});

	describe("requestId field", () => {
		it("should reject an invalid requestId (not cuid2)", () => {
			const result = updateStatusSchema.safeParse({
				requestId: "not-a-cuid2",
				status: "PENDING",
			});

			expect(result.success).toBe(false);
		});

		it("should reject an empty requestId", () => {
			const result = updateStatusSchema.safeParse({
				requestId: "",
				status: "PENDING",
			});

			expect(result.success).toBe(false);
		});

		it("should reject when requestId is missing", () => {
			const result = updateStatusSchema.safeParse({ status: "PENDING" });

			expect(result.success).toBe(false);
		});
	});

	describe("status field", () => {
		it("should reject an invalid status value", () => {
			const result = updateStatusSchema.safeParse({
				requestId: VALID_CUID,
				status: "INVALID_STATUS",
			});

			expect(result.success).toBe(false);
		});

		it("should reject when status is missing", () => {
			const result = updateStatusSchema.safeParse({ requestId: VALID_CUID });

			expect(result.success).toBe(false);
		});

		it("should reject a lowercase status value", () => {
			const result = updateStatusSchema.safeParse({
				requestId: VALID_CUID,
				status: "pending",
			});

			expect(result.success).toBe(false);
		});
	});
});
