import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
	isReturnEligible,
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
// isReturnEligible
// ============================================================================

describe("isReturnEligible", () => {
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
		it("should return true for PAID orders", () => {
			const order = makeOrder({ paymentStatus: "PAID" });
			expect(isReturnEligible(order)).toBe(true);
		});

		it("should return true for PARTIALLY_REFUNDED orders", () => {
			const order = makeOrder({ paymentStatus: "PARTIALLY_REFUNDED" });
			expect(isReturnEligible(order)).toBe(true);
		});

		it("should return false for REFUNDED orders", () => {
			const order = makeOrder({ paymentStatus: "REFUNDED" });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false for PENDING payment orders", () => {
			const order = makeOrder({ paymentStatus: "PENDING" });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false for FAILED payment orders", () => {
			const order = makeOrder({ paymentStatus: "FAILED" });
			expect(isReturnEligible(order)).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Fulfillment status
	// --------------------------------------------------------------------------

	describe("fulfillment status", () => {
		it("should return true when fulfillment status is DELIVERED", () => {
			const order = makeOrder({ fulfillmentStatus: "DELIVERED" });
			expect(isReturnEligible(order)).toBe(true);
		});

		it("should return false when fulfillment status is SHIPPED", () => {
			const order = makeOrder({ fulfillmentStatus: "SHIPPED" });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when fulfillment status is PROCESSING", () => {
			const order = makeOrder({ fulfillmentStatus: "PROCESSING" });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when fulfillment status is UNFULFILLED", () => {
			const order = makeOrder({ fulfillmentStatus: "UNFULFILLED" });
			expect(isReturnEligible(order)).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Delivery date / withdrawal period
	// --------------------------------------------------------------------------

	describe("withdrawal period", () => {
		it("should return true when delivery is within the 14-day period", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_WITHIN_PERIOD });
			expect(isReturnEligible(order)).toBe(true);
		});

		it("should return true when delivery is just before the 14-day deadline expires", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_JUST_BEFORE_EXPIRY });
			expect(isReturnEligible(order)).toBe(true);
		});

		it("should return false when delivery is exactly 14 days ago (boundary expired)", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_EXACTLY_ON_BOUNDARY });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when delivery is older than 14 days", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_EXPIRED });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when actualDelivery is null", () => {
			const order = makeOrder({ actualDelivery: null });
			expect(isReturnEligible(order)).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Active refunds
	// --------------------------------------------------------------------------

	describe("active refunds", () => {
		it("should return true when refunds array is empty", () => {
			const order = makeOrder({ refunds: [] });
			expect(isReturnEligible(order)).toBe(true);
		});

		it("should return false when a PENDING refund exists", () => {
			const order = makeOrder({ refunds: [{ status: "PENDING" }] });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when an APPROVED refund exists", () => {
			const order = makeOrder({ refunds: [{ status: "APPROVED" }] });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return true when only REJECTED refunds exist", () => {
			const order = makeOrder({ refunds: [{ status: "REJECTED" }] });
			expect(isReturnEligible(order)).toBe(true);
		});

		it("should return true when only COMPLETED refunds exist", () => {
			const order = makeOrder({ refunds: [{ status: "COMPLETED" }] });
			expect(isReturnEligible(order)).toBe(true);
		});

		it("should return false when one refund among many is PENDING", () => {
			const order = makeOrder({
				refunds: [
					{ status: "REJECTED" },
					{ status: "COMPLETED" },
					{ status: "PENDING" },
				],
			});
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when one refund among many is APPROVED", () => {
			const order = makeOrder({
				refunds: [
					{ status: "REJECTED" },
					{ status: "APPROVED" },
				],
			});
			expect(isReturnEligible(order)).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Combined conditions
	// --------------------------------------------------------------------------

	describe("combined conditions", () => {
		it("should return false when all conditions pass except payment status", () => {
			const order = makeOrder({ paymentStatus: "REFUNDED" });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when all conditions pass except fulfillment status", () => {
			const order = makeOrder({ fulfillmentStatus: "UNFULFILLED" });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when all conditions pass except delivery date", () => {
			const order = makeOrder({ actualDelivery: DELIVERED_EXPIRED });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when all conditions pass except active refund", () => {
			const order = makeOrder({ refunds: [{ status: "APPROVED" }] });
			expect(isReturnEligible(order)).toBe(false);
		});

		it("should return false when no conditions are met", () => {
			const order = makeOrder({
				paymentStatus: "FAILED",
				fulfillmentStatus: "UNFULFILLED",
				actualDelivery: null,
				refunds: [{ status: "PENDING" }],
			});
			expect(isReturnEligible(order)).toBe(false);
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
