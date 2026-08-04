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
	canCancelOrder,
	getOrderPermissions,
	canMarkAsDelivered,
	canMarkAsReturned,
	canMarkAsProcessing,
	canRevertToProcessing,
} from "../order-status-validation.service";

// ============================================================================
// canMarkAsShipped
// ============================================================================

describe("canMarkAsShipped", () => {
	it("should block shipping a pending order (must transition to PROCESSING first)", () => {
		const result = canMarkAsShipped({
			status: "PENDING",
			paymentStatus: "PAID",
		});
		expect(result).toEqual({ canShip: false, reason: "not_processing" });
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

	it("should block shipping a processing but unpaid order", () => {
		const result = canMarkAsShipped({
			status: "PROCESSING",
			paymentStatus: "PENDING",
		});
		expect(result).toEqual({ canShip: false, reason: "unpaid" });
	});

	it("should block shipping a processing order with FAILED payment", () => {
		const result = canMarkAsShipped({
			status: "PROCESSING",
			paymentStatus: "FAILED",
		});
		expect(result).toEqual({ canShip: false, reason: "unpaid" });
	});

	it("should allow shipping a partially refunded order", () => {
		const result = canMarkAsShipped({
			status: "PROCESSING",
			paymentStatus: "PARTIALLY_REFUNDED",
		});
		expect(result).toEqual({ canShip: true });
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
// getOrderPermissions
// ============================================================================

describe("getOrderPermissions", () => {
	// canDelete — règle rapatriée depuis `use-order-actions.ts` (audit 2026-07-26).
	// Miroir EXACT des gardes de `delete-order.ts` : jamais facturée + jamais encaissée.
	describe("canDelete", () => {
		it("autorise une commande jamais facturée et jamais encaissée", () => {
			expect(getOrderPermissions({ status: "PENDING", paymentStatus: "PENDING" }).canDelete).toBe(
				true,
			);
		});

		it("refuse une commande facturée (Art. 286 CGI — la facture est immuable)", () => {
			expect(
				getOrderPermissions({
					status: "PENDING",
					paymentStatus: "PENDING",
					invoiceNumber: "F-2026-00001",
				}).canDelete,
			).toBe(false);
		});

		it("refuse une commande PAID", () => {
			expect(getOrderPermissions({ status: "PROCESSING", paymentStatus: "PAID" }).canDelete).toBe(
				false,
			);
		});

		it("refuse une commande REFUNDED", () => {
			expect(
				getOrderPermissions({ status: "CANCELLED", paymentStatus: "REFUNDED" }).canDelete,
			).toBe(false);
		});

		it("autorise FAILED (paiement jamais abouti)", () => {
			expect(getOrderPermissions({ status: "PENDING", paymentStatus: "FAILED" }).canDelete).toBe(
				true,
			);
		});

		it("laisse passer PARTIALLY_REFUNDED — miroir exact du serveur, borné par la facture", () => {
			// `delete-order.ts` ne bloque QUE PAID et REFUNDED : PARTIALLY_REFUNDED n'est
			// pas dans sa liste. On reproduit ce comportement à l'identique plutôt que de
			// rendre l'UI plus stricte que l'action — une divergence, même dans le sens
			// prudent, est exactement ce que cette rapatriation vise à supprimer.
			//
			// En pratique le cas est inatteignable : une commande partiellement remboursée
			// a été encaissée, donc porte un `invoiceNumber` (émis à l'encaissement,
			// Art. 289-I CGI), et c'est cette condition qui la rend non supprimable.
			expect(
				getOrderPermissions({ status: "PROCESSING", paymentStatus: "PARTIALLY_REFUNDED" })
					.canDelete,
			).toBe(true);
			expect(
				getOrderPermissions({
					status: "PROCESSING",
					paymentStatus: "PARTIALLY_REFUNDED",
					invoiceNumber: "F-2026-00001",
				}).canDelete,
			).toBe(false);
		});
	});

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
		expect(permissions.canMarkAsReturned).toBe(false);
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
		expect(permissions.canMarkAsReturned).toBe(true);
		expect(permissions.canMarkAsDelivered).toBe(false);
		expect(permissions.canCancel).toBe(false);
		expect(permissions.canMarkAsShipped).toBe(false);
		expect(permissions.canRevertToProcessing).toBe(false);
	});

	it("should not allow canMarkAsReturned for a DELIVERED + RETURNED order", () => {
		const permissions = getOrderPermissions({
			status: "DELIVERED",
			paymentStatus: "PAID",
			fulfillmentStatus: "RETURNED",
			trackingNumber: "ABC123",
		});

		expect(permissions.canMarkAsReturned).toBe(false);
		expect(permissions.canRefund).toBe(true);
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
		expect(permissions.canMarkAsReturned).toBe(false);
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

	it("should allow canMarkAsFullyRefunded for PAID and PARTIALLY_REFUNDED orders", () => {
		expect(
			getOrderPermissions({ status: "PROCESSING", paymentStatus: "PAID" }).canMarkAsFullyRefunded,
		).toBe(true);
		expect(
			getOrderPermissions({ status: "SHIPPED", paymentStatus: "PARTIALLY_REFUNDED" })
				.canMarkAsFullyRefunded,
		).toBe(true);
		expect(
			getOrderPermissions({ status: "DELIVERED", paymentStatus: "PAID" }).canMarkAsFullyRefunded,
		).toBe(true);
	});

	it("should not allow canMarkAsFullyRefunded for unpaid or already REFUNDED orders", () => {
		expect(
			getOrderPermissions({ status: "PENDING", paymentStatus: "PENDING" }).canMarkAsFullyRefunded,
		).toBe(false);
		expect(
			getOrderPermissions({ status: "CANCELLED", paymentStatus: "REFUNDED" })
				.canMarkAsFullyRefunded,
		).toBe(false);
		expect(
			getOrderPermissions({ status: "PROCESSING", paymentStatus: "FAILED" }).canMarkAsFullyRefunded,
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

	it("should allow processing when paymentStatus is PARTIALLY_REFUNDED", () => {
		const result = canMarkAsProcessing({
			status: "PENDING",
			paymentStatus: "PARTIALLY_REFUNDED",
		});
		expect(result).toEqual({ canProcess: true });
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
	it("should treat PARTIALLY_REFUNDED same as PAID for paid-gated permissions", () => {
		const permissions = getOrderPermissions({
			status: "PROCESSING",
			paymentStatus: "PARTIALLY_REFUNDED",
		});

		// PARTIALLY_REFUNDED allows shipping, refunding, and processing (remaining items)
		expect(permissions.canMarkAsShipped).toBe(true);
		expect(permissions.canRefund).toBe(true);
		expect(permissions.canMarkAsProcessing).toBe(false); // already PROCESSING
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

	it("should allow canRefund for SHIPPED + PARTIALLY_REFUNDED", () => {
		const permissions = getOrderPermissions({
			status: "SHIPPED",
			paymentStatus: "PARTIALLY_REFUNDED",
			trackingNumber: "XYZ999",
		});

		expect(permissions.canRefund).toBe(true);
		expect(permissions.canMarkAsDelivered).toBe(true);
		expect(permissions.canRevertToProcessing).toBe(true);
		expect(permissions.canUpdateTracking).toBe(true);
	});

	it("should allow canMarkAsProcessing for PENDING + PARTIALLY_REFUNDED", () => {
		const permissions = getOrderPermissions({
			status: "PENDING",
			paymentStatus: "PARTIALLY_REFUNDED",
		});

		expect(permissions.canMarkAsProcessing).toBe(true);
		expect(permissions.canRefund).toBe(false); // PENDING is not in refundable statuses
		expect(permissions.canCancel).toBe(true);
	});
});

// Le bloc « EXPIRED payment status » est parti au Lot 6 avec la valeur d'enum
// (vestige du flux Checkout Session — la recovery ORD-BIZ-004 ne couvre plus
// que FAILED, testée ci-dessus).
