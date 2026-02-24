import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be set up before any module under test is imported.
// ---------------------------------------------------------------------------

const { mockOrderStatus, mockPaymentStatus, mockFulfillmentStatus } = vi.hoisted(() => ({
	mockOrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		CANCELLED: "CANCELLED",
		RETURNED: "RETURNED",
	},
	mockPaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		REFUNDED: "REFUNDED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
	},
	mockFulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	OrderStatus: mockOrderStatus,
	PaymentStatus: mockPaymentStatus,
	FulfillmentStatus: mockFulfillmentStatus,
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

vi.mock("../constants/order.constants", () => ({
	GET_ORDERS_DEFAULT_PER_PAGE: 20,
	GET_ORDERS_MAX_RESULTS_PER_PAGE: 100,
	SORT_OPTIONS: {
		CREATED_DESC: "created-descending",
		CREATED_ASC: "created-ascending",
		TOTAL_DESC: "total-descending",
		TOTAL_ASC: "total-ascending",
		STATUS_ASC: "status-ascending",
		STATUS_DESC: "status-descending",
		PAYMENT_STATUS_ASC: "paymentStatus-ascending",
		PAYMENT_STATUS_DESC: "paymentStatus-descending",
		FULFILLMENT_STATUS_ASC: "fulfillmentStatus-ascending",
		FULFILLMENT_STATUS_DESC: "fulfillmentStatus-descending",
	},
}));

import {
	getOrderSchema,
	deleteOrderSchema,
	cancelOrderSchema,
	markAsShippedSchema,
	carrierEnum,
	addOrderNoteSchema,
	bulkDeleteOrdersSchema,
	exportInvoicesSchema,
} from "../order.schemas";

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
// getOrderSchema
// ============================================================================

describe("getOrderSchema", () => {
	it("accepts a valid orderNumber", () => {
		const result = getOrderSchema.safeParse({ orderNumber: "SYN-2024-0001" });
		expect(result.success).toBe(true);
	});

	it("trims whitespace from orderNumber", () => {
		const result = getOrderSchema.safeParse({ orderNumber: "  SYN-0001  " });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.orderNumber).toBe("SYN-0001");
		}
	});

	it("rejects an empty orderNumber", () => {
		const result = getOrderSchema.safeParse({ orderNumber: "" });
		expect(result.success).toBe(false);
	});

	it("rejects when orderNumber is missing", () => {
		const result = getOrderSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// deleteOrderSchema
// ============================================================================

describe("deleteOrderSchema", () => {
	it("accepts a valid cuid2 id", () => {
		const result = deleteOrderSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid id format", () => {
		const result = deleteOrderSchema.safeParse({ id: "not-a-cuid2" });
		expect(result.success).toBe(false);
	});

	it("rejects an empty id", () => {
		const result = deleteOrderSchema.safeParse({ id: "" });
		expect(result.success).toBe(false);
	});

	it("rejects when id is missing", () => {
		const result = deleteOrderSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// cancelOrderSchema
// ============================================================================

describe("cancelOrderSchema", () => {
	it("accepts a valid id without a reason", () => {
		const result = cancelOrderSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("accepts a valid id with an optional reason", () => {
		const result = cancelOrderSchema.safeParse({
			id: VALID_CUID,
			reason: "Customer requested cancellation",
		});
		expect(result.success).toBe(true);
	});

	it("accepts reason at exactly 500 characters", () => {
		const result = cancelOrderSchema.safeParse({
			id: VALID_CUID,
			reason: "a".repeat(500),
		});
		expect(result.success).toBe(true);
	});

	it("rejects reason longer than 500 characters", () => {
		const result = cancelOrderSchema.safeParse({
			id: VALID_CUID,
			reason: "a".repeat(501),
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid id", () => {
		const result = cancelOrderSchema.safeParse({ id: "bad-id" });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// markAsShippedSchema
// ============================================================================

describe("markAsShippedSchema", () => {
	const validInput = {
		id: VALID_CUID,
		trackingNumber: "1Z999AA10123456784",
		trackingUrl: "https://tracking.example.com/track/1Z999AA10123456784",
		carrier: "colissimo" as const,
	};

	it("accepts full valid tracking info", () => {
		const result = markAsShippedSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("accepts without optional trackingUrl and carrier", () => {
		const result = markAsShippedSchema.safeParse({
			id: VALID_CUID,
			trackingNumber: "1Z999AA10123456784",
		});
		expect(result.success).toBe(true);
	});

	it("rejects when trackingNumber is empty", () => {
		const result = markAsShippedSchema.safeParse({
			...validInput,
			trackingNumber: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects when trackingNumber is missing", () => {
		const { trackingNumber: _tn, ...withoutTracking } = validInput;
		const result = markAsShippedSchema.safeParse(withoutTracking);
		expect(result.success).toBe(false);
	});

	it("rejects an invalid trackingUrl that is not a URL or empty string", () => {
		const result = markAsShippedSchema.safeParse({
			...validInput,
			trackingUrl: "not-a-url",
		});
		expect(result.success).toBe(false);
	});

	it("accepts an empty trackingUrl string", () => {
		const result = markAsShippedSchema.safeParse({
			...validInput,
			trackingUrl: "",
		});
		expect(result.success).toBe(true);
	});

	it("defaults sendEmail to true when omitted", () => {
		const result = markAsShippedSchema.safeParse({
			id: VALID_CUID,
			trackingNumber: "TRACK123",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sendEmail).toBe(true);
		}
	});
});

// ============================================================================
// carrierEnum
// ============================================================================

describe("carrierEnum", () => {
	it('accepts "colissimo"', () => {
		const result = carrierEnum.safeParse("colissimo");
		expect(result.success).toBe(true);
	});

	it('accepts "chronopost"', () => {
		const result = carrierEnum.safeParse("chronopost");
		expect(result.success).toBe(true);
	});

	it('accepts "mondial_relay"', () => {
		const result = carrierEnum.safeParse("mondial_relay");
		expect(result.success).toBe(true);
	});

	it('accepts "lettre_suivie"', () => {
		const result = carrierEnum.safeParse("lettre_suivie");
		expect(result.success).toBe(true);
	});

	it('accepts "autre"', () => {
		const result = carrierEnum.safeParse("autre");
		expect(result.success).toBe(true);
	});

	it("rejects an invalid carrier name", () => {
		const result = carrierEnum.safeParse("invalid_carrier");
		expect(result.success).toBe(false);
	});

	it("rejects an empty string", () => {
		const result = carrierEnum.safeParse("");
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// addOrderNoteSchema
// ============================================================================

describe("addOrderNoteSchema", () => {
	it("accepts a valid orderId and non-empty content", () => {
		const result = addOrderNoteSchema.safeParse({
			orderId: VALID_CUID,
			content: "This is an internal note about the order.",
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty content", () => {
		const result = addOrderNoteSchema.safeParse({
			orderId: VALID_CUID,
			content: "",
		});
		expect(result.success).toBe(false);
	});

	it("accepts content at exactly 5000 characters", () => {
		const result = addOrderNoteSchema.safeParse({
			orderId: VALID_CUID,
			content: "a".repeat(5000),
		});
		expect(result.success).toBe(true);
	});

	it("rejects content longer than 5000 characters", () => {
		const result = addOrderNoteSchema.safeParse({
			orderId: VALID_CUID,
			content: "a".repeat(5001),
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid orderId", () => {
		const result = addOrderNoteSchema.safeParse({
			orderId: "not-a-cuid2",
			content: "Valid note content",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkDeleteOrdersSchema
// ============================================================================

describe("bulkDeleteOrdersSchema", () => {
	it("accepts an array with a single valid cuid2", () => {
		const result = bulkDeleteOrdersSchema.safeParse({ ids: [VALID_CUID] });
		expect(result.success).toBe(true);
	});

	it("accepts an array of exactly 100 valid cuid2s (max)", () => {
		const result = bulkDeleteOrdersSchema.safeParse({ ids: makeCuids(100) });
		expect(result.success).toBe(true);
	});

	it("rejects an empty ids array", () => {
		const result = bulkDeleteOrdersSchema.safeParse({ ids: [] });
		expect(result.success).toBe(false);
	});

	it("rejects an array with 101 ids (exceeds max of 100)", () => {
		const result = bulkDeleteOrdersSchema.safeParse({ ids: makeCuids(101) });
		expect(result.success).toBe(false);
	});

	it("rejects when any id is not a valid cuid2", () => {
		const result = bulkDeleteOrdersSchema.safeParse({
			ids: [VALID_CUID, "not-a-cuid2"],
		});
		expect(result.success).toBe(false);
	});

	it("rejects when ids field is missing", () => {
		const result = bulkDeleteOrdersSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// exportInvoicesSchema
// ============================================================================

describe("exportInvoicesSchema", () => {
	it('accepts periodType "all" without additional params', () => {
		const result = exportInvoicesSchema.safeParse({ periodType: "all" });
		expect(result.success).toBe(true);
	});

	it("defaults periodType to all when omitted", () => {
		const result = exportInvoicesSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.periodType).toBe("all");
		}
	});

	it('accepts periodType "year" with a valid year', () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "year",
			year: 2024,
		});
		expect(result.success).toBe(true);
	});

	it('rejects periodType "year" without a year param', () => {
		const result = exportInvoicesSchema.safeParse({ periodType: "year" });
		expect(result.success).toBe(false);
	});

	it('accepts periodType "month" with year and month', () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "month",
			year: 2024,
			month: 6,
		});
		expect(result.success).toBe(true);
	});

	it('rejects periodType "month" without month param', () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "month",
			year: 2024,
		});
		expect(result.success).toBe(false);
	});

	it('rejects periodType "month" without year param', () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "month",
			month: 6,
		});
		expect(result.success).toBe(false);
	});

	it('accepts periodType "custom" with dateFrom and dateTo', () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "custom",
			dateFrom: "2024-01-01",
			dateTo: "2024-12-31",
		});
		expect(result.success).toBe(true);
	});

	it('rejects periodType "custom" without dateFrom', () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "custom",
			dateTo: "2024-12-31",
		});
		expect(result.success).toBe(false);
	});

	it('rejects periodType "custom" without dateTo', () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "custom",
			dateFrom: "2024-01-01",
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid periodType value", () => {
		const result = exportInvoicesSchema.safeParse({ periodType: "weekly" });
		expect(result.success).toBe(false);
	});

	it("rejects a year below 2020", () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "year",
			year: 2019,
		});
		expect(result.success).toBe(false);
	});

	it("rejects a month outside 1-12 range", () => {
		const result = exportInvoicesSchema.safeParse({
			periodType: "month",
			year: 2024,
			month: 13,
		});
		expect(result.success).toBe(false);
	});
});
