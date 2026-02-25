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
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
	},
	FulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
	},
}));

vi.mock("@/app/generated/prisma/browser", () => ({
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
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
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
	canMarkAsDelivered,
	canMarkAsReturned,
	canMarkAsProcessing,
	canRevertToProcessing,
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

// ============================================================================
// canMarkAsDelivered
// ============================================================================

describe("canMarkAsDelivered", () => {
	it("should return canDeliver: true when status is SHIPPED", () => {
		const result = canMarkAsDelivered({ status: "SHIPPED" });
		expect(result).toEqual({ canDeliver: true });
	});

	it("should return already_delivered reason when status is DELIVERED", () => {
		const result = canMarkAsDelivered({ status: "DELIVERED" });
		expect(result).toEqual({ canDeliver: false, reason: "already_delivered" });
	});

	it("should return not_shipped reason when status is PENDING", () => {
		const result = canMarkAsDelivered({ status: "PENDING" });
		expect(result).toEqual({ canDeliver: false, reason: "not_shipped" });
	});

	it("should return not_shipped reason when status is PROCESSING", () => {
		const result = canMarkAsDelivered({ status: "PROCESSING" });
		expect(result).toEqual({ canDeliver: false, reason: "not_shipped" });
	});

	it("should return not_shipped reason when status is CANCELLED", () => {
		const result = canMarkAsDelivered({ status: "CANCELLED" });
		expect(result).toEqual({ canDeliver: false, reason: "not_shipped" });
	});
});

// ============================================================================
// canMarkAsReturned
// ============================================================================

describe("canMarkAsReturned", () => {
	it("should return canReturn: true when status is DELIVERED and fulfillmentStatus is DELIVERED", () => {
		const result = canMarkAsReturned({
			status: "DELIVERED",
			fulfillmentStatus: "DELIVERED",
		});
		expect(result).toEqual({ canReturn: true });
	});

	it("should return already_returned reason when fulfillmentStatus is RETURNED", () => {
		const result = canMarkAsReturned({
			status: "DELIVERED",
			fulfillmentStatus: "RETURNED",
		});
		expect(result).toEqual({ canReturn: false, reason: "already_returned" });
	});

	it("should return not_delivered reason when status is SHIPPED", () => {
		const result = canMarkAsReturned({
			status: "SHIPPED",
			fulfillmentStatus: "SHIPPED",
		});
		expect(result).toEqual({ canReturn: false, reason: "not_delivered" });
	});

	it("should return not_delivered reason when status is PROCESSING", () => {
		const result = canMarkAsReturned({
			status: "PROCESSING",
			fulfillmentStatus: "PROCESSING",
		});
		expect(result).toEqual({ canReturn: false, reason: "not_delivered" });
	});

	it("should return not_delivered reason when status is PENDING", () => {
		const result = canMarkAsReturned({
			status: "PENDING",
			fulfillmentStatus: "UNFULFILLED",
		});
		expect(result).toEqual({ canReturn: false, reason: "not_delivered" });
	});
});

// ============================================================================
// canMarkAsProcessing
// ============================================================================

describe("canMarkAsProcessing", () => {
	it("should return canProcess: true when status is PENDING and paymentStatus is PAID", () => {
		const result = canMarkAsProcessing({
			status: "PENDING",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canProcess: true });
	});

	it("should return already_processing reason when status is PROCESSING", () => {
		const result = canMarkAsProcessing({
			status: "PROCESSING",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canProcess: false, reason: "already_processing" });
	});

	it("should return not_pending reason when status is SHIPPED", () => {
		const result = canMarkAsProcessing({
			status: "SHIPPED",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canProcess: false, reason: "not_pending" });
	});

	it("should return not_pending reason when status is DELIVERED", () => {
		const result = canMarkAsProcessing({
			status: "DELIVERED",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canProcess: false, reason: "not_pending" });
	});

	it("should return cancelled reason when status is CANCELLED", () => {
		const result = canMarkAsProcessing({
			status: "CANCELLED",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canProcess: false, reason: "cancelled" });
	});

	it("should return unpaid reason when paymentStatus is PENDING", () => {
		const result = canMarkAsProcessing({
			status: "PENDING",
			paymentStatus: "PENDING",
		});
		expect(result).toEqual({ canProcess: false, reason: "unpaid" });
	});

	it("should return unpaid reason when paymentStatus is FAILED", () => {
		const result = canMarkAsProcessing({
			status: "PENDING",
			paymentStatus: "FAILED",
		});
		expect(result).toEqual({ canProcess: false, reason: "unpaid" });
	});
});

// ============================================================================
// canRevertToProcessing
// ============================================================================

describe("canRevertToProcessing", () => {
	it("should return canRevert: true when status is SHIPPED", () => {
		const result = canRevertToProcessing({ status: "SHIPPED" });
		expect(result).toEqual({ canRevert: true });
	});

	it("should return not_shipped reason when status is PENDING", () => {
		const result = canRevertToProcessing({ status: "PENDING" });
		expect(result).toEqual({ canRevert: false, reason: "not_shipped" });
	});

	it("should return not_shipped reason when status is PROCESSING", () => {
		const result = canRevertToProcessing({ status: "PROCESSING" });
		expect(result).toEqual({ canRevert: false, reason: "not_shipped" });
	});

	it("should return not_shipped reason when status is DELIVERED", () => {
		const result = canRevertToProcessing({ status: "DELIVERED" });
		expect(result).toEqual({ canRevert: false, reason: "not_shipped" });
	});

	it("should return not_shipped reason when status is CANCELLED", () => {
		const result = canRevertToProcessing({ status: "CANCELLED" });
		expect(result).toEqual({ canRevert: false, reason: "not_shipped" });
	});
});

// ============================================================================
// getOrderPermissions - PARTIALLY_REFUNDED and EXPIRED payment statuses
// ============================================================================

describe("getOrderPermissions - PARTIALLY_REFUNDED payment status", () => {
	it("should allow canMarkAsShipped for PROCESSING + PARTIALLY_REFUNDED (same as PAID)", () => {
		const permissions = getOrderPermissions({
			status: "PROCESSING",
			paymentStatus: "PARTIALLY_REFUNDED",
		});

		// PARTIALLY_REFUNDED is not PAID, so paid-gated permissions are off
		expect(permissions.canMarkAsShipped).toBe(false);
		expect(permissions.canRefund).toBe(false);
		expect(permissions.canMarkAsProcessing).toBe(false);
		expect(permissions.canCancel).toBe(true);
		expect(permissions.canMarkAsDelivered).toBe(false);
		expect(permissions.canRevertToProcessing).toBe(false);
	});

	it("should not allow canMarkAsPaid for PROCESSING + PARTIALLY_REFUNDED", () => {
		const permissions = getOrderPermissions({
			status: "PROCESSING",
			paymentStatus: "PARTIALLY_REFUNDED",
		});

		// canMarkAsPaid requires paymentStatus PENDING
		expect(permissions.canMarkAsPaid).toBe(false);
	});

	it("should not allow canRefund for SHIPPED + PARTIALLY_REFUNDED", () => {
		const permissions = getOrderPermissions({
			status: "SHIPPED",
			paymentStatus: "PARTIALLY_REFUNDED",
			trackingNumber: "XYZ999",
		});

		expect(permissions.canRefund).toBe(false);
		expect(permissions.canMarkAsDelivered).toBe(true);
		expect(permissions.canRevertToProcessing).toBe(true);
		// canUpdateTracking requires tracking number but not PAID
		expect(permissions.canUpdateTracking).toBe(true);
	});
});

describe("getOrderPermissions - EXPIRED payment status", () => {
	it("should block paid-gated permissions for PENDING + EXPIRED", () => {
		const permissions = getOrderPermissions({
			status: "PENDING",
			paymentStatus: "EXPIRED",
		});

		expect(permissions.canMarkAsProcessing).toBe(false);
		expect(permissions.canMarkAsPaid).toBe(false);
		expect(permissions.canRefund).toBe(false);
		expect(permissions.canCancel).toBe(true);
		expect(permissions.canMarkAsShipped).toBe(false);
		expect(permissions.canMarkAsDelivered).toBe(false);
		expect(permissions.canRevertToProcessing).toBe(false);
	});

	it("should block paid-gated permissions for PROCESSING + EXPIRED", () => {
		const permissions = getOrderPermissions({
			status: "PROCESSING",
			paymentStatus: "EXPIRED",
		});

		expect(permissions.canMarkAsShipped).toBe(false);
		expect(permissions.canRefund).toBe(false);
		expect(permissions.canMarkAsPaid).toBe(false);
		expect(permissions.canCancel).toBe(true);
		expect(permissions.canMarkAsDelivered).toBe(false);
		expect(permissions.canRevertToProcessing).toBe(false);
	});
});
