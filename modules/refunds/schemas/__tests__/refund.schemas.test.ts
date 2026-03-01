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

vi.mock("@/shared/constants/pagination", () => ({
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

import {
	getRefundSchema,
	refundFiltersSchema,
	createRefundSchema,
	createRefundItemSchema,
	approveRefundSchema,
	rejectRefundSchema,
	bulkApproveRefundsSchema,
	requestReturnSchema,
} from "../refund.schemas";
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

describe("createRefundItemSchema", () => {
	const validItem = {
		orderItemId: VALID_CUID,
		quantity: 1,
		amount: 2990,
		restock: true,
	};

	it("should accept a valid refund item", () => {
		const result = createRefundItemSchema.safeParse(validItem);

		expect(result.success).toBe(true);
	});

	it("should reject negative quantity", () => {
		const result = createRefundItemSchema.safeParse({
			...validItem,
			quantity: -1,
		});

		expect(result.success).toBe(false);
	});

	it("should reject zero quantity", () => {
		const result = createRefundItemSchema.safeParse({
			...validItem,
			quantity: 0,
		});

		expect(result.success).toBe(false);
	});

	it("should reject negative amount", () => {
		const result = createRefundItemSchema.safeParse({
			...validItem,
			amount: -100,
		});

		expect(result.success).toBe(false);
	});

	it("should reject zero amount", () => {
		const result = createRefundItemSchema.safeParse({
			...validItem,
			amount: 0,
		});

		expect(result.success).toBe(false);
	});

	it("should reject amount exceeding maximum", () => {
		const result = createRefundItemSchema.safeParse({
			...validItem,
			amount: 9999999999,
		});

		expect(result.success).toBe(false);
	});

	it("should default restock to true", () => {
		const result = createRefundItemSchema.safeParse({
			orderItemId: VALID_CUID,
			quantity: 1,
			amount: 1000,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.restock).toBe(true);
		}
	});
});

describe("createRefundSchema", () => {
	const validRefund = {
		orderId: VALID_CUID,
		reason: "CUSTOMER_REQUEST",
		items: [
			{
				orderItemId: VALID_CUID,
				quantity: 1,
				amount: 2990,
				restock: true,
			},
		],
	};

	it("should accept a valid refund with items", () => {
		const result = createRefundSchema.safeParse(validRefund);

		expect(result.success).toBe(true);
	});

	it("should require at least one item", () => {
		const result = createRefundSchema.safeParse({
			...validRefund,
			items: [],
		});

		expect(result.success).toBe(false);
	});

	it("should reject more than 100 items", () => {
		const items = Array.from({ length: 101 }, () => ({
			orderItemId: VALID_CUID,
			quantity: 1,
			amount: 100,
			restock: true,
		}));

		const result = createRefundSchema.safeParse({
			...validRefund,
			items,
		});

		expect(result.success).toBe(false);
	});

	it("should require a valid reason enum", () => {
		const result = createRefundSchema.safeParse({
			...validRefund,
			reason: "INVALID_REASON",
		});

		expect(result.success).toBe(false);
	});

	it("should require a valid orderId", () => {
		const result = createRefundSchema.safeParse({
			...validRefund,
			orderId: "not-a-cuid",
		});

		expect(result.success).toBe(false);
	});

	it("should accept optional note", () => {
		const result = createRefundSchema.safeParse({
			...validRefund,
			note: "Client requests full refund",
		});

		expect(result.success).toBe(true);
	});

	it("should reject note exceeding max length", () => {
		const result = createRefundSchema.safeParse({
			...validRefund,
			note: "a".repeat(2001),
		});

		expect(result.success).toBe(false);
	});
});

describe("approveRefundSchema", () => {
	it("should accept a valid cuid2 id", () => {
		const result = approveRefundSchema.safeParse({ id: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should reject missing id", () => {
		const result = approveRefundSchema.safeParse({});

		expect(result.success).toBe(false);
	});
});

describe("rejectRefundSchema", () => {
	it("should accept valid rejection with reason", () => {
		const result = rejectRefundSchema.safeParse({
			id: VALID_CUID,
			reason: "Retour hors delai",
		});

		expect(result.success).toBe(true);
	});

	it("should accept rejection without reason", () => {
		const result = rejectRefundSchema.safeParse({ id: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should reject reason exceeding max length", () => {
		const result = rejectRefundSchema.safeParse({
			id: VALID_CUID,
			reason: "a".repeat(501),
		});

		expect(result.success).toBe(false);
	});
});

describe("bulkApproveRefundsSchema", () => {
	it("should accept array of valid ids", () => {
		const result = bulkApproveRefundsSchema.safeParse({
			ids: [VALID_CUID],
		});

		expect(result.success).toBe(true);
	});

	it("should require at least one id", () => {
		const result = bulkApproveRefundsSchema.safeParse({ ids: [] });

		expect(result.success).toBe(false);
	});

	it("should reject more than 100 ids", () => {
		const ids = Array.from({ length: 101 }, () => VALID_CUID);
		const result = bulkApproveRefundsSchema.safeParse({ ids });

		expect(result.success).toBe(false);
	});
});

describe("requestReturnSchema", () => {
	it("should accept valid customer return request", () => {
		const result = requestReturnSchema.safeParse({
			orderId: VALID_CUID,
			reason: "CUSTOMER_REQUEST",
		});

		expect(result.success).toBe(true);
	});

	it("should accept DEFECTIVE reason", () => {
		const result = requestReturnSchema.safeParse({
			orderId: VALID_CUID,
			reason: "DEFECTIVE",
		});

		expect(result.success).toBe(true);
	});

	it("should accept WRONG_ITEM reason", () => {
		const result = requestReturnSchema.safeParse({
			orderId: VALID_CUID,
			reason: "WRONG_ITEM",
		});

		expect(result.success).toBe(true);
	});

	it("should reject non-customer reasons (FRAUD, LOST_IN_TRANSIT, OTHER)", () => {
		for (const reason of ["FRAUD", "LOST_IN_TRANSIT", "OTHER"]) {
			const result = requestReturnSchema.safeParse({
				orderId: VALID_CUID,
				reason,
			});

			expect(result.success).toBe(false);
		}
	});

	it("should accept optional message", () => {
		const result = requestReturnSchema.safeParse({
			orderId: VALID_CUID,
			reason: "CUSTOMER_REQUEST",
			message: "Je souhaite retourner cet article.",
		});

		expect(result.success).toBe(true);
	});

	it("should reject message exceeding max length", () => {
		const result = requestReturnSchema.safeParse({
			orderId: VALID_CUID,
			reason: "CUSTOMER_REQUEST",
			message: "a".repeat(501),
		});

		expect(result.success).toBe(false);
	});
});
