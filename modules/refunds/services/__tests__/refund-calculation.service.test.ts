import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/enums", () => ({
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		WRONG_ITEM: "WRONG_ITEM",
		DEFECTIVE: "DEFECTIVE",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	RefundReason: {
		CUSTOMER_REQUEST: "CUSTOMER_REQUEST",
		WRONG_ITEM: "WRONG_ITEM",
		DEFECTIVE: "DEFECTIVE",
		LOST_IN_TRANSIT: "LOST_IN_TRANSIT",
		FRAUD: "FRAUD",
		OTHER: "OTHER",
	},
}));

import {
	getAvailableQuantity,
	calculateAlreadyRefunded,
	calculateMaxRefundable,
	calculateRefundAmount,
	calculateDiscountRatio,
	initializeRefundItems,
	updateItemsRestock,
	validateRefundQuantity,
	canSubmitRefund,
	getSelectedItems,
	formatItemsForAction,
} from "../refund-calculation.service";
import type { OrderItemForRefundCalc } from "../refund-calculation.service";
import type { RefundItemValue } from "../../types/refund.types";

// ============================================================================
// Helpers
// ============================================================================

function makeOrderItem(overrides: Partial<OrderItemForRefundCalc> = {}): OrderItemForRefundCalc {
	return {
		id: "item-1",
		quantity: 3,
		price: 5000,
		refundItems: [],
		...overrides,
	};
}

function makeRefundItem(overrides: Partial<RefundItemValue> = {}): RefundItemValue {
	return {
		orderItemId: "item-1",
		quantity: 1,
		restock: true,
		selected: true,
		...overrides,
	};
}

// ============================================================================
// getAvailableQuantity
// ============================================================================

describe("getAvailableQuantity", () => {
	it("should return full quantity when no refunds exist", () => {
		const item = makeOrderItem({ quantity: 3, refundItems: [] });
		expect(getAvailableQuantity(item)).toBe(3);
	});

	it("should subtract already refunded quantities", () => {
		const item = makeOrderItem({
			quantity: 3,
			refundItems: [{ quantity: 1 }],
		});
		expect(getAvailableQuantity(item)).toBe(2);
	});

	it("should handle multiple refund items", () => {
		const item = makeOrderItem({
			quantity: 5,
			refundItems: [{ quantity: 2 }, { quantity: 1 }],
		});
		expect(getAvailableQuantity(item)).toBe(2);
	});

	it("should return 0 when fully refunded", () => {
		const item = makeOrderItem({
			quantity: 2,
			refundItems: [{ quantity: 2 }],
		});
		expect(getAvailableQuantity(item)).toBe(0);
	});
});

// ============================================================================
// calculateAlreadyRefunded
// ============================================================================

describe("calculateAlreadyRefunded", () => {
	it("should return 0 for empty refunds list", () => {
		expect(calculateAlreadyRefunded([])).toBe(0);
	});

	it("should sum all refund amounts", () => {
		const refunds = [{ amount: 3000 }, { amount: 2000 }, { amount: 500 }];
		expect(calculateAlreadyRefunded(refunds)).toBe(5500);
	});

	it("should handle a single refund", () => {
		expect(calculateAlreadyRefunded([{ amount: 10000 }])).toBe(10000);
	});
});

// ============================================================================
// calculateMaxRefundable
// ============================================================================

describe("calculateMaxRefundable", () => {
	it("should return order total when nothing refunded yet", () => {
		expect(calculateMaxRefundable(15000, 0)).toBe(15000);
	});

	it("should subtract already refunded from order total", () => {
		expect(calculateMaxRefundable(15000, 5000)).toBe(10000);
	});

	it("should return 0 when fully refunded", () => {
		expect(calculateMaxRefundable(15000, 15000)).toBe(0);
	});
});

// ============================================================================
// calculateDiscountRatio
// ============================================================================

describe("calculateDiscountRatio", () => {
	it("should return 0 when no discount", () => {
		expect(calculateDiscountRatio(10000, 0)).toBe(0);
	});

	it("should return correct ratio for percentage discount", () => {
		// 20% discount: 2000 / 10000 = 0.2
		expect(calculateDiscountRatio(10000, 2000)).toBe(0.2);
	});

	it("should return 0 when subtotal is 0", () => {
		expect(calculateDiscountRatio(0, 1000)).toBe(0);
	});

	it("should cap at 1 when discount exceeds subtotal", () => {
		expect(calculateDiscountRatio(5000, 10000)).toBe(1);
	});

	it("should return 0 when subtotal is negative", () => {
		expect(calculateDiscountRatio(-100, 50)).toBe(0);
	});
});

// ============================================================================
// calculateRefundAmount
// ============================================================================

describe("calculateRefundAmount", () => {
	it("should return 0 when no items selected", () => {
		const orderItems = [makeOrderItem()];
		expect(calculateRefundAmount([], orderItems)).toBe(0);
	});

	it("should calculate amount as price x quantity for selected items", () => {
		const orderItems = [makeOrderItem({ id: "item-1", price: 5000 })];
		const selected = [makeRefundItem({ orderItemId: "item-1", quantity: 2 })];
		expect(calculateRefundAmount(selected, orderItems)).toBe(10000);
	});

	it("should sum amounts across multiple selected items", () => {
		const orderItems = [
			makeOrderItem({ id: "item-1", price: 5000 }),
			makeOrderItem({ id: "item-2", price: 3000 }),
		];
		const selected = [
			makeRefundItem({ orderItemId: "item-1", quantity: 1 }),
			makeRefundItem({ orderItemId: "item-2", quantity: 2 }),
		];
		expect(calculateRefundAmount(selected, orderItems)).toBe(11000);
	});

	it("should return 0 for items not found in order", () => {
		const orderItems = [makeOrderItem({ id: "item-1", price: 5000 })];
		const selected = [makeRefundItem({ orderItemId: "nonexistent", quantity: 1 })];
		expect(calculateRefundAmount(selected, orderItems)).toBe(0);
	});

	it("should prorate discount when discount info is provided", () => {
		// Item: 100€, 20% discount → refund should be 80€
		const orderItems = [makeOrderItem({ id: "item-1", price: 10000 })];
		const selected = [makeRefundItem({ orderItemId: "item-1", quantity: 1 })];
		const result = calculateRefundAmount(selected, orderItems, {
			subtotal: 10000,
			discountAmount: 2000,
		});
		expect(result).toBe(8000);
	});

	it("should prorate discount across multiple items", () => {
		// 2 items: 50€ + 30€ = 80€ subtotal, 20% discount (16€)
		// Refund item-1 (1 × 50€ × 0.8 = 40€) + item-2 (1 × 30€ × 0.8 = 24€)
		const orderItems = [
			makeOrderItem({ id: "item-1", price: 5000 }),
			makeOrderItem({ id: "item-2", price: 3000 }),
		];
		const selected = [
			makeRefundItem({ orderItemId: "item-1", quantity: 1 }),
			makeRefundItem({ orderItemId: "item-2", quantity: 1 }),
		];
		const result = calculateRefundAmount(selected, orderItems, {
			subtotal: 8000,
			discountAmount: 1600,
		});
		expect(result).toBe(6400); // 4000 + 2400
	});

	it("should not prorate when discount is 0", () => {
		const orderItems = [makeOrderItem({ id: "item-1", price: 5000 })];
		const selected = [makeRefundItem({ orderItemId: "item-1", quantity: 2 })];
		const result = calculateRefundAmount(selected, orderItems, {
			subtotal: 10000,
			discountAmount: 0,
		});
		expect(result).toBe(10000);
	});

	it("should handle rounding correctly with odd discount ratios", () => {
		// Item: 33.33€ (3333 cents), 10% discount → 2999.7 → rounds to 3000
		const orderItems = [makeOrderItem({ id: "item-1", price: 3333 })];
		const selected = [makeRefundItem({ orderItemId: "item-1", quantity: 1 })];
		const result = calculateRefundAmount(selected, orderItems, {
			subtotal: 3333,
			discountAmount: 333,
		});
		// 3333 * (1 - 333/3333) = 3333 * 0.9000... = 2999.7 → Math.round = 3000
		expect(result).toBe(3000);
	});
});

// ============================================================================
// initializeRefundItems
// ============================================================================

describe("initializeRefundItems", () => {
	it("should create items with quantity 0, not selected, and restock based on reason", () => {
		const orderItems = [makeOrderItem({ id: "item-1" }), makeOrderItem({ id: "item-2" })];
		const result = initializeRefundItems(orderItems, "CUSTOMER_REQUEST" as never);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			orderItemId: "item-1",
			quantity: 0,
			restock: true,
			selected: false,
		});
		expect(result[1]).toEqual({
			orderItemId: "item-2",
			quantity: 0,
			restock: true,
			selected: false,
		});
	});

	it("should set restock to false for non-restockable reasons", () => {
		const orderItems = [makeOrderItem({ id: "item-1" })];
		const result = initializeRefundItems(orderItems, "DEFECTIVE" as never);

		expect(result[0]!.restock).toBe(false);
	});
});

// ============================================================================
// updateItemsRestock
// ============================================================================

describe("updateItemsRestock", () => {
	it("should update all items restock based on new reason", () => {
		const items: RefundItemValue[] = [
			makeRefundItem({ orderItemId: "item-1", restock: false }),
			makeRefundItem({ orderItemId: "item-2", restock: false }),
		];
		const result = updateItemsRestock(items, "CUSTOMER_REQUEST" as never);

		expect(result[0]!.restock).toBe(true);
		expect(result[1]!.restock).toBe(true);
	});

	it("should set restock to false for non-restockable reason", () => {
		const items: RefundItemValue[] = [makeRefundItem({ orderItemId: "item-1", restock: true })];
		const result = updateItemsRestock(items, "LOST_IN_TRANSIT" as never);

		expect(result[0]!.restock).toBe(false);
	});

	it("should preserve other item properties", () => {
		const items: RefundItemValue[] = [
			makeRefundItem({ orderItemId: "item-1", quantity: 3, selected: true, restock: false }),
		];
		const result = updateItemsRestock(items, "CUSTOMER_REQUEST" as never);

		expect(result[0]!.orderItemId).toBe("item-1");
		expect(result[0]!.quantity).toBe(3);
		expect(result[0]!.selected).toBe(true);
	});
});

// ============================================================================
// validateRefundQuantity
// ============================================================================

describe("validateRefundQuantity", () => {
	it("should return requested quantity when within range", () => {
		expect(validateRefundQuantity(2, 5)).toBe(2);
	});

	it("should cap at available quantity when requested exceeds it", () => {
		expect(validateRefundQuantity(10, 3)).toBe(3);
	});

	it("should return 0 when requested is negative", () => {
		expect(validateRefundQuantity(-1, 5)).toBe(0);
	});

	it("should return 0 when available is 0", () => {
		expect(validateRefundQuantity(3, 0)).toBe(0);
	});

	it("should return exact available when requested equals available", () => {
		expect(validateRefundQuantity(5, 5)).toBe(5);
	});
});

// ============================================================================
// canSubmitRefund
// ============================================================================

describe("canSubmitRefund", () => {
	it("should return true when items selected with valid amount within max", () => {
		const items = [makeRefundItem()];
		expect(canSubmitRefund(items, 5000, 10000)).toBe(true);
	});

	it("should return false when no items selected", () => {
		expect(canSubmitRefund([], 5000, 10000)).toBe(false);
	});

	it("should return false when total amount is 0", () => {
		const items = [makeRefundItem()];
		expect(canSubmitRefund(items, 0, 10000)).toBe(false);
	});

	it("should return false when total exceeds max refundable", () => {
		const items = [makeRefundItem()];
		expect(canSubmitRefund(items, 15000, 10000)).toBe(false);
	});

	it("should return true when total equals max refundable", () => {
		const items = [makeRefundItem()];
		expect(canSubmitRefund(items, 10000, 10000)).toBe(true);
	});
});

// ============================================================================
// getSelectedItems
// ============================================================================

describe("getSelectedItems", () => {
	it("should return only selected items with quantity > 0", () => {
		const items: RefundItemValue[] = [
			makeRefundItem({ orderItemId: "item-1", selected: true, quantity: 2 }),
			makeRefundItem({ orderItemId: "item-2", selected: false, quantity: 1 }),
			makeRefundItem({ orderItemId: "item-3", selected: true, quantity: 0 }),
			makeRefundItem({ orderItemId: "item-4", selected: true, quantity: 3 }),
		];
		const result = getSelectedItems(items);

		expect(result).toHaveLength(2);
		expect(result[0]!.orderItemId).toBe("item-1");
		expect(result[1]!.orderItemId).toBe("item-4");
	});

	it("should return empty array when nothing selected", () => {
		const items: RefundItemValue[] = [makeRefundItem({ selected: false, quantity: 1 })];
		expect(getSelectedItems(items)).toHaveLength(0);
	});

	it("should return empty array for empty input", () => {
		expect(getSelectedItems([])).toHaveLength(0);
	});
});

// ============================================================================
// formatItemsForAction
// ============================================================================

describe("formatItemsForAction", () => {
	const orderItems: OrderItemForRefundCalc[] = [
		makeOrderItem({ id: "item-1", price: 5000 }),
		makeOrderItem({ id: "item-2", price: 3000 }),
	];

	it("should emit orderItemId, quantity, amount, and restock for each item", () => {
		const items: RefundItemValue[] = [
			makeRefundItem({ orderItemId: "item-1", quantity: 2, restock: true }),
			makeRefundItem({ orderItemId: "item-2", quantity: 1, restock: false }),
		];
		const result = formatItemsForAction(items, orderItems);

		expect(result).toEqual([
			{ orderItemId: "item-1", quantity: 2, amount: 10000, restock: true },
			{ orderItemId: "item-2", quantity: 1, amount: 3000, restock: false },
		]);
	});

	it("should prorate amount when a discount is provided", () => {
		const items: RefundItemValue[] = [
			makeRefundItem({ orderItemId: "item-1", quantity: 2, restock: true }),
		];
		// 20% de réduction → 10000 × 0.8
		const result = formatItemsForAction(items, orderItems, {
			subtotal: 13000,
			discountAmount: 2600,
		});

		expect(result[0]?.amount).toBe(8000);
	});

	it("should strip the selected property", () => {
		const items: RefundItemValue[] = [
			makeRefundItem({ orderItemId: "item-1", quantity: 1, restock: true, selected: true }),
		];
		const result = formatItemsForAction(items, orderItems);

		expect(result[0]).not.toHaveProperty("selected");
	});

	it("should return empty array for empty input", () => {
		expect(formatItemsForAction([], orderItems)).toEqual([]);
	});
});
