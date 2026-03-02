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

import { bulkUpdateStatusSchema } from "../bulk-update-status.schema";

// A valid cuid2 string (26 lowercase alphanumeric chars, starts with a letter).
const VALID_CUID = "clh1234567890abcdefghijklm";

// Generate an array of `count` distinct valid cuid2 strings.
function makeCuids(count: number): string[] {
	return Array.from({ length: count }, (_, i) => {
		const suffix = String(i).padStart(10, "0");
		return `clh${suffix}abcdefghijklm`;
	});
}

// ============================================================================
// bulkUpdateStatusSchema
// ============================================================================

describe("bulkUpdateStatusSchema", () => {
	it("should accept a single valid requestId with a valid status", () => {
		const result = bulkUpdateStatusSchema.safeParse({
			requestIds: [VALID_CUID],
			status: "PENDING",
		});

		expect(result.success).toBe(true);
	});

	it("should accept multiple valid requestIds", () => {
		const result = bulkUpdateStatusSchema.safeParse({
			requestIds: makeCuids(5),
			status: "APPROVED",
		});

		expect(result.success).toBe(true);
	});

	it("should accept exactly 100 requestIds (boundary max)", () => {
		const result = bulkUpdateStatusSchema.safeParse({
			requestIds: makeCuids(100),
			status: "COMPLETED",
		});

		expect(result.success).toBe(true);
	});

	describe("requestIds field", () => {
		it("should reject an empty requestIds array", () => {
			const result = bulkUpdateStatusSchema.safeParse({
				requestIds: [],
				status: "PENDING",
			});

			expect(result.success).toBe(false);
		});

		it("should reject more than 100 requestIds", () => {
			const result = bulkUpdateStatusSchema.safeParse({
				requestIds: makeCuids(101),
				status: "PENDING",
			});

			expect(result.success).toBe(false);
		});

		it("should reject when any requestId is not a valid cuid2", () => {
			const result = bulkUpdateStatusSchema.safeParse({
				requestIds: [VALID_CUID, "not-a-cuid2"],
				status: "PENDING",
			});

			expect(result.success).toBe(false);
		});

		it("should reject when requestIds field is missing", () => {
			const result = bulkUpdateStatusSchema.safeParse({ status: "PENDING" });

			expect(result.success).toBe(false);
		});
	});

	describe("status field", () => {
		it("should accept IN_REVIEW status", () => {
			const result = bulkUpdateStatusSchema.safeParse({
				requestIds: [VALID_CUID],
				status: "IN_REVIEW",
			});

			expect(result.success).toBe(true);
		});

		it("should accept REJECTED status", () => {
			const result = bulkUpdateStatusSchema.safeParse({
				requestIds: [VALID_CUID],
				status: "REJECTED",
			});

			expect(result.success).toBe(true);
		});

		it("should reject an invalid status value", () => {
			const result = bulkUpdateStatusSchema.safeParse({
				requestIds: [VALID_CUID],
				status: "UNKNOWN",
			});

			expect(result.success).toBe(false);
		});

		it("should reject when status is missing", () => {
			const result = bulkUpdateStatusSchema.safeParse({
				requestIds: [VALID_CUID],
			});

			expect(result.success).toBe(false);
		});
	});
});
