import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/generated/prisma/client", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		CANCELLED: "CANCELLED",
	},
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		EXPIRED: "EXPIRED",
		REFUNDED: "REFUNDED",
	},
	FulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
	},
}));

import {
	canMarkAsShipped,
	isOrderInFinalState,
	canCancelOrder,
	canRefundOrder,
	getOrderPermissions,
	canUpdateOrderTracking,
} from "../order-status-validation.service";

// ============================================================================
// canMarkAsShipped
// ============================================================================

describe("canMarkAsShipped", () => {
	it("should allow shipping a paid, pending order", () => {
		const result = canMarkAsShipped({
			status: "PENDING",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canShip: true });
	});

	it("should allow shipping a paid, processing order", () => {
		const result = canMarkAsShipped({
			status: "PROCESSING",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canShip: true });
	});

	it("should block shipping an already shipped order", () => {
		const result = canMarkAsShipped({
			status: "SHIPPED",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canShip: false, reason: "already_shipped" });
	});

	it("should block shipping a delivered order", () => {
		const result = canMarkAsShipped({
			status: "DELIVERED",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canShip: false, reason: "already_shipped" });
	});

	it("should block shipping a cancelled order", () => {
		const result = canMarkAsShipped({
			status: "CANCELLED",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canShip: false, reason: "cancelled" });
	});

	it("should block shipping an unpaid order", () => {
		const result = canMarkAsShipped({
			status: "PROCESSING",
			paymentStatus: "PENDING",
		});
		expect(result).toEqual({ canShip: false, reason: "unpaid" });
	});

	it("should block shipping a failed payment order", () => {
		const result = canMarkAsShipped({
			status: "PENDING",
			paymentStatus: "FAILED",
		});
		expect(result).toEqual({ canShip: false, reason: "unpaid" });
	});
});

// ============================================================================
// isOrderInFinalState
// ============================================================================

describe("isOrderInFinalState", () => {
	it("should return true for DELIVERED", () => {
		expect(isOrderInFinalState("DELIVERED")).toBe(true);
	});

	it("should return true for CANCELLED", () => {
		expect(isOrderInFinalState("CANCELLED")).toBe(true);
	});

	it("should return false for PENDING", () => {
		expect(isOrderInFinalState("PENDING")).toBe(false);
	});

	it("should return false for PROCESSING", () => {
		expect(isOrderInFinalState("PROCESSING")).toBe(false);
	});

	it("should return false for SHIPPED", () => {
		expect(isOrderInFinalState("SHIPPED")).toBe(false);
	});
});

// ============================================================================
// canCancelOrder
// ============================================================================

describe("canCancelOrder", () => {
	it("should allow cancelling a pending order", () => {
		expect(canCancelOrder({ status: "PENDING", paymentStatus: "PENDING" })).toBe(true);
	});

	it("should allow cancelling a processing order", () => {
		expect(canCancelOrder({ status: "PROCESSING", paymentStatus: "PAID" })).toBe(true);
	});

	it("should block cancelling a shipped order", () => {
		expect(canCancelOrder({ status: "SHIPPED", paymentStatus: "PAID" })).toBe(false);
	});

	it("should block cancelling a delivered order", () => {
		expect(canCancelOrder({ status: "DELIVERED", paymentStatus: "PAID" })).toBe(false);
	});

	it("should block cancelling an already cancelled order", () => {
		expect(canCancelOrder({ status: "CANCELLED", paymentStatus: "PAID" })).toBe(false);
	});
});

// ============================================================================
// canRefundOrder
// ============================================================================

describe("canRefundOrder", () => {
	it("should allow refund for a paid processing order", () => {
		expect(canRefundOrder({ status: "PROCESSING", paymentStatus: "PAID" })).toBe(true);
	});

	it("should allow refund for a paid shipped order", () => {
		expect(canRefundOrder({ status: "SHIPPED", paymentStatus: "PAID" })).toBe(true);
	});

	it("should allow refund for a paid delivered order", () => {
		expect(canRefundOrder({ status: "DELIVERED", paymentStatus: "PAID" })).toBe(true);
	});

	it("should block refund for an unpaid order", () => {
		expect(canRefundOrder({ status: "PROCESSING", paymentStatus: "PENDING" })).toBe(false);
	});

	it("should block refund for a cancelled order", () => {
		expect(canRefundOrder({ status: "CANCELLED", paymentStatus: "PAID" })).toBe(false);
	});

	it("should block refund for an already refunded order", () => {
		expect(canRefundOrder({ status: "PROCESSING", paymentStatus: "REFUNDED" })).toBe(false);
	});
});

// ============================================================================
// getOrderPermissions
// ============================================================================

describe("getOrderPermissions", () => {
	it("should compute correct permissions for a PENDING + PAID order", () => {
		const permissions = getOrderPermissions({
			status: "PENDING",
			paymentStatus: "PAID",
		});

		expect(permissions.canMarkAsProcessing).toBe(true);
		expect(permissions.canCancel).toBe(true);
		expect(permissions.canMarkAsShipped).toBe(false);
		expect(permissions.canMarkAsDelivered).toBe(false);
		expect(permissions.canRevertToProcessing).toBe(false);
		expect(permissions.canRefund).toBe(false);
		expect(permissions.canMarkAsPaid).toBe(false);
	});

	it("should compute correct permissions for a PROCESSING + PAID order", () => {
		const permissions = getOrderPermissions({
			status: "PROCESSING",
			paymentStatus: "PAID",
		});

		expect(permissions.canMarkAsShipped).toBe(true);
		expect(permissions.canRefund).toBe(true);
		expect(permissions.canCancel).toBe(true);
		expect(permissions.canMarkAsProcessing).toBe(false);
		expect(permissions.canMarkAsDelivered).toBe(false);
		expect(permissions.canRevertToProcessing).toBe(false);
	});

	it("should compute correct permissions for a SHIPPED order", () => {
		const permissions = getOrderPermissions({
			status: "SHIPPED",
			paymentStatus: "PAID",
			trackingNumber: "ABC123",
		});

		expect(permissions.canMarkAsDelivered).toBe(true);
		expect(permissions.canRevertToProcessing).toBe(true);
		expect(permissions.canUpdateTracking).toBe(true);
		expect(permissions.canRefund).toBe(true);
		expect(permissions.canCancel).toBe(false);
		expect(permissions.canMarkAsShipped).toBe(false);
		expect(permissions.canMarkAsProcessing).toBe(false);
	});

	it("should compute correct permissions for a DELIVERED order", () => {
		const permissions = getOrderPermissions({
			status: "DELIVERED",
			paymentStatus: "PAID",
			trackingNumber: "ABC123",
		});

		expect(permissions.canRefund).toBe(true);
		expect(permissions.canUpdateTracking).toBe(true);
		expect(permissions.canMarkAsDelivered).toBe(false);
		expect(permissions.canCancel).toBe(false);
		expect(permissions.canMarkAsShipped).toBe(false);
		expect(permissions.canRevertToProcessing).toBe(false);
	});

	it("should compute correct permissions for a CANCELLED order", () => {
		const permissions = getOrderPermissions({
			status: "CANCELLED",
			paymentStatus: "REFUNDED",
		});

		expect(permissions.canRefund).toBe(false);
		expect(permissions.canCancel).toBe(false);
		expect(permissions.canMarkAsShipped).toBe(false);
		expect(permissions.canMarkAsDelivered).toBe(false);
		expect(permissions.canMarkAsProcessing).toBe(false);
		expect(permissions.canRevertToProcessing).toBe(false);
		expect(permissions.canMarkAsPaid).toBe(false);
	});

	it("should allow canMarkAsPaid for PENDING + payment PENDING", () => {
		const permissions = getOrderPermissions({
			status: "PENDING",
			paymentStatus: "PENDING",
		});

		expect(permissions.canMarkAsPaid).toBe(true);
		expect(permissions.canMarkAsProcessing).toBe(false);
	});

	it("should not allow canUpdateTracking without tracking number", () => {
		const permissions = getOrderPermissions({
			status: "SHIPPED",
			paymentStatus: "PAID",
			trackingNumber: null,
		});

		expect(permissions.canUpdateTracking).toBe(false);
	});
});

// ============================================================================
// canUpdateOrderTracking
// ============================================================================

describe("canUpdateOrderTracking", () => {
	it("should return true for shipped order with tracking", () => {
		expect(
			canUpdateOrderTracking({
				status: "SHIPPED",
				paymentStatus: "PAID",
				trackingNumber: "ABC123",
			})
		).toBe(true);
	});

	it("should return false for shipped order without tracking", () => {
		expect(
			canUpdateOrderTracking({
				status: "SHIPPED",
				paymentStatus: "PAID",
				trackingNumber: null,
			})
		).toBe(false);
	});

	it("should return false for pending order", () => {
		expect(
			canUpdateOrderTracking({
				status: "PENDING",
				paymentStatus: "PAID",
				trackingNumber: "ABC123",
			})
		).toBe(false);
	});
});
