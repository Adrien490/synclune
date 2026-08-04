import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
	getReturnIneligibilityReason,
	getReturnDaysRemaining,
} from "../return-eligibility.service";
import type { FulfillmentStatus, PaymentStatus, RefundStatus } from "@/app/generated/prisma/client";

// ============================================================================
// Helpers
// ============================================================================

interface OrderInput {
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	actualDelivery: Date | null;
	refunds: Array<{ status: RefundStatus }>;
}

const NOW = new Date("2026-02-23T12:00:00Z");
const DELIVERED_WITHIN_PERIOD = new Date("2026-02-20T12:00:00Z"); // 3 days ago
const DELIVERED_JUST_BEFORE_EXPIRY = new Date("2026-02-09T12:00:00.001Z"); // ~14 days ago, barely within
const DELIVERED_EXACTLY_ON_BOUNDARY = new Date("2026-02-09T12:00:00Z"); // exactly 14 days ago, expired
const DELIVERED_EXPIRED = new Date("2026-02-01T12:00:00Z"); // 22 days ago

function makeOrder(overrides: Partial<OrderInput> = {}): OrderInput {
	return {
		paymentStatus: "PAID",
		fulfillmentStatus: "DELIVERED",
		actualDelivery: DELIVERED_WITHIN_PERIOD,
		refunds: [],
		...overrides,
	};
}

// ============================================================================
// getReturnIneligibilityReason
// (couvre aussi l'ex-`isReturnEligible`, supprimé avec le flow self-service :
// éligible ≡ raison `null`)
// ============================================================================

describe("getReturnIneligibilityReason", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// --------------------------------------------------------------------------
	// Payment status
	// --------------------------------------------------------------------------

	describe("payment status", () => {
		it("should return null for PAID orders", () => {
			const order = makeOrder({ paymentStatus: "PAID" });
			expect(getReturnIneligibilityReason(order)).toBeNull();
		});

		it("should return null for PARTIALLY_REFUNDED orders", () => {
			const order = makeOrder({ paymentStatus: "PARTIALLY_REFUNDED" });
			expect(getReturnIneligibilityReason(order)).toBeNull();
		});

		it("should return NOT_PAID for REFUNDED orders", () => {
			const order = makeOrder({ paymentStatus: "REFUNDED" });
			expect(getReturnIneligibilityReason(order)).toBe("NOT_PAID");
		});

		it("should return NOT_PAID for PENDING payment orders", () => {
			const order = makeOrder({ paymentStatus: "PENDING" });
			expect(getReturnIneligibilityReason(order)).toBe("NOT_PAID");
		});

		it("should return NOT_PAID for FAILED payment orders", () => {
			const order = makeOrder({ paymentStatus: "FAILED" });
			expect(getReturnIneligibilityReason(order)).toBe("NOT_PAID");
		});
	});

	// --------------------------------------------------------------------------
	// Fulfillment status
	// --------------------------------------------------------------------------

	describe("fulfillment status", () => {
		it("should return null when fulfillment status is DELIVERED", () => {
			const order = makeOrder({ fulfillmentStatus: "DELIVERED" });
			expect(getReturnIneligibilityReason(order)).toBeNull();
		});

		it("should return NOT_DELIVERED when fulfillment status is SHIPPED", () => {
			const order = makeOrder({ fulfillmentStatus: "SHIPPED" });
			expect(getReturnIneligibilityReason(order)).toBe("NOT_DELIVERED");
		});

		it("should return NOT_DELIVERED when fulfillment status is PROCESSING", () => {
			const order = makeOrder({ fulfillmentStatus: "PROCESSING" });
			expect(getReturnIneligibilityReason(order)).toBe("NOT_DELIVERED");
		});

		it("should return NOT_DELIVERED when fulfillment status is UNFULFILLED", () => {
			const order = makeOrder({ fulfillmentStatus: "UNFULFILLED" });
			expect(getReturnIneligibilityReason(order)).toBe("NOT_DELIVERED");
		});
	});

	// --------------------------------------------------------------------------
	// Delivery date / withdrawal period
	// --------------------------------------------------------------------------

	describe("withdrawal period", () => {
		it("should return null when delivery is within the 14-day period", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_WITHIN_PERIOD });
			expect(getReturnIneligibilityReason(order)).toBeNull();
		});

		it("should return null when delivery is just before the 14-day deadline expires", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_JUST_BEFORE_EXPIRY });
			expect(getReturnIneligibilityReason(order)).toBeNull();
		});

		it("should return DEADLINE_EXCEEDED when delivery is exactly 14 days ago (boundary expired)", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_EXACTLY_ON_BOUNDARY });
			expect(getReturnIneligibilityReason(order)).toBe("DEADLINE_EXCEEDED");
		});

		it("should return DEADLINE_EXCEEDED when delivery is older than 14 days", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_EXPIRED });
			expect(getReturnIneligibilityReason(order)).toBe("DEADLINE_EXCEEDED");
		});

		it("should return NOT_DELIVERED when actualDelivery is null", () => {
			const order = makeOrder({ actualDelivery: null });
			expect(getReturnIneligibilityReason(order)).toBe("NOT_DELIVERED");
		});
	});

	// --------------------------------------------------------------------------
	// Active refunds
	// --------------------------------------------------------------------------

	describe("active refunds", () => {
		it("should return null when refunds array is empty", () => {
			const order = makeOrder({ refunds: [] });
			expect(getReturnIneligibilityReason(order)).toBeNull();
		});

		it("should return ALREADY_REQUESTED when a PENDING refund exists", () => {
			const order = makeOrder({ refunds: [{ status: "PENDING" }] });
			expect(getReturnIneligibilityReason(order)).toBe("ALREADY_REQUESTED");
		});

		it("should return ALREADY_REQUESTED when an APPROVED refund exists", () => {
			const order = makeOrder({ refunds: [{ status: "APPROVED" }] });
			expect(getReturnIneligibilityReason(order)).toBe("ALREADY_REQUESTED");
		});

		it("should return null when only CANCELLED refunds exist", () => {
			const order = makeOrder({ refunds: [{ status: "CANCELLED" }] });
			expect(getReturnIneligibilityReason(order)).toBeNull();
		});

		it("should return null when only COMPLETED refunds exist", () => {
			const order = makeOrder({ refunds: [{ status: "COMPLETED" }] });
			expect(getReturnIneligibilityReason(order)).toBeNull();
		});

		it("should return ALREADY_REQUESTED when one refund among many is PENDING", () => {
			const order = makeOrder({
				refunds: [{ status: "CANCELLED" }, { status: "COMPLETED" }, { status: "PENDING" }],
			});
			expect(getReturnIneligibilityReason(order)).toBe("ALREADY_REQUESTED");
		});

		it("should return ALREADY_REQUESTED when one refund among many is APPROVED", () => {
			const order = makeOrder({
				refunds: [{ status: "CANCELLED" }, { status: "APPROVED" }],
			});
			expect(getReturnIneligibilityReason(order)).toBe("ALREADY_REQUESTED");
		});
	});

	// --------------------------------------------------------------------------
	// Discrimination order — the UI (OrderReturnGuidance) branches on the FIRST
	// failing condition, so the priority payment > delivery > deadline > refund
	// is part of the contract.
	// --------------------------------------------------------------------------

	describe("discrimination order", () => {
		it("should report NOT_PAID even when the order is also undelivered", () => {
			const order = makeOrder({
				paymentStatus: "FAILED",
				fulfillmentStatus: "UNFULFILLED",
				actualDelivery: null,
				refunds: [{ status: "PENDING" }],
			});
			expect(getReturnIneligibilityReason(order)).toBe("NOT_PAID");
		});

		it("should report NOT_DELIVERED before checking the deadline or refunds", () => {
			const order = makeOrder({
				fulfillmentStatus: "SHIPPED",
				actualDelivery: null,
				refunds: [{ status: "PENDING" }],
			});
			expect(getReturnIneligibilityReason(order)).toBe("NOT_DELIVERED");
		});

		it("should report DEADLINE_EXCEEDED before checking refunds", () => {
			const order = makeOrder({
				actualDelivery: DELIVERED_EXPIRED,
				refunds: [{ status: "PENDING" }],
			});
			expect(getReturnIneligibilityReason(order)).toBe("DEADLINE_EXCEEDED");
		});
	});
});

// ============================================================================
// getReturnDaysRemaining
// ============================================================================

describe("getReturnDaysRemaining", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return 0 when actualDelivery is null", () => {
		expect(getReturnDaysRemaining(null)).toBe(0);
	});

	it("should return 14 when delivered today", () => {
		expect(getReturnDaysRemaining(NOW)).toBe(14);
	});

	it("should return 11 when delivered 3 days ago", () => {
		expect(getReturnDaysRemaining(DELIVERED_WITHIN_PERIOD)).toBe(11);
	});

	it("should return 1 when delivered 13 days ago", () => {
		const thirteenDaysAgo = new Date(NOW.getTime() - 13 * 86_400_000);
		expect(getReturnDaysRemaining(thirteenDaysAgo)).toBe(1);
	});

	it("should return 0 when delivered exactly 14 days ago", () => {
		expect(getReturnDaysRemaining(DELIVERED_EXACTLY_ON_BOUNDARY)).toBe(0);
	});

	it("should return 0 when delivery period has expired", () => {
		expect(getReturnDaysRemaining(DELIVERED_EXPIRED)).toBe(0);
	});

	it("should never return a negative number", () => {
		const veryOldDelivery = new Date("2020-01-01T00:00:00Z");
		expect(getReturnDaysRemaining(veryOldDelivery)).toBe(0);
	});

	it("should accept a Date object", () => {
		const result = getReturnDaysRemaining(new Date(NOW));
		expect(result).toBe(14);
	});
});
