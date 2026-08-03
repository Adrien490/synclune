import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

const { mockRefundStatus, mockRefundReason } = vi.hoisted(() => ({
	mockRefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
	mockRefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		DEFECTIVE: "DEFECTIVE",
		WRONG_ITEM: "WRONG_ITEM",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	RefundStatus: mockRefundStatus,
	RefundReason: mockRefundReason,
}));

vi.mock("@/shared/schemas/pagination-schema", () => ({
	cursorSchema: z.string().optional(),
	directionSchema: z.enum(["forward", "backward"]).default("forward"),
}));

vi.mock("@/shared/utils/pagination", () => ({
	createPerPageSchema: (defaultVal: number, max: number) =>
		z.coerce.number().int().min(1).max(max).default(defaultVal),
}));

vi.mock("@/shared/schemas/date.schemas", () => ({
	stringOrDateSchema: z.coerce.date().optional(),
}));

vi.mock("../../constants/refund.constants", () => ({
	GET_REFUNDS_DEFAULT_PER_PAGE: 10,
	GET_REFUNDS_MAX_RESULTS_PER_PAGE: 100,
	SORT_OPTIONS: {
		CREATED_DESC: "created-descending",
		CREATED_ASC: "created-ascending",
		AMOUNT_DESC: "amount-descending",
		AMOUNT_ASC: "amount-ascending",
		STATUS_ASC: "status-ascending",
		STATUS_DESC: "status-descending",
	},
}));

import { getRefundSchema, refundFiltersSchema } from "../refund.schemas";
import { VALID_CUID } from "@/test/factories";

describe("getRefundSchema", () => {
	it("should accept a valid cuid2 id", () => {
		const result = getRefundSchema.safeParse({ id: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should reject an empty id", () => {
		const result = getRefundSchema.safeParse({ id: "" });

		expect(result.success).toBe(false);
	});
});

describe("refundFiltersSchema", () => {
	it("should accept empty filters", () => {
		const result = refundFiltersSchema.safeParse({});

		expect(result.success).toBe(true);
	});

	it("should accept a single status filter", () => {
		const result = refundFiltersSchema.safeParse({ status: "PENDING" });

		expect(result.success).toBe(true);
	});

	it("should accept an array of statuses", () => {
		const result = refundFiltersSchema.safeParse({
			status: ["PENDING", "APPROVED"],
		});

		expect(result.success).toBe(true);
	});

	it("should reject an invalid status", () => {
		const result = refundFiltersSchema.safeParse({ status: "INVALID_STATUS" });

		expect(result.success).toBe(false);
	});

	it("should accept a single reason filter", () => {
		const result = refundFiltersSchema.safeParse({ reason: "DEFECTIVE" });

		expect(result.success).toBe(true);
	});

	it("should accept an array of reasons", () => {
		const result = refundFiltersSchema.safeParse({
			reason: ["DEFECTIVE", "WRONG_ITEM"],
		});

		expect(result.success).toBe(true);
	});

	it("should accept orderId filter", () => {
		const result = refundFiltersSchema.safeParse({ orderId: VALID_CUID });

		expect(result.success).toBe(true);
	});
});

// Les suites create/approve/reject sont parties au Lot 2 (SIMPLIFICATION.md
// S3.3) avec les schémas du workflow in-app : les remboursements se créent
// dans le dashboard Stripe.
