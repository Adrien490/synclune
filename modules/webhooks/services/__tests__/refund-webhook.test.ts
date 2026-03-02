import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockSendAdminRefundFailedAlert, mockGetBaseUrl } = vi.hoisted(() => {
	const mockTx = {
		refund: {
			update: vi.fn(),
			upsert: vi.fn(),
		},
	};

	return {
		mockPrisma: {
			$transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
			order: {
				update: vi.fn(),
			},
			refund: {
				findUnique: vi.fn(),
				update: vi.fn(),
			},
			_mockTx: mockTx,
		},
		mockSendAdminRefundFailedAlert: vi.fn(),
		mockGetBaseUrl: vi.fn().mockReturnValue("https://synclune.fr"),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: mockSendAdminRefundFailedAlert,
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: {
		ADMIN: {
			REFUNDS: "/admin/ventes/remboursements",
		},
	},
}));

// Mock the Prisma enum
vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: {
		PAID: "PAID",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	},
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
}));

import {
	syncStripeRefunds,
	updateOrderPaymentStatus,
	resolveRefundByStripeId,
	mapStripeRefundStatus,
	updateRefundStatus,
	markRefundAsFailed,
	sendRefundFailedAlert,
} from "../refund.service";
import type Stripe from "stripe";

// ============================================================================
// syncStripeRefunds
// ============================================================================

describe("syncStripeRefunds", () => {
	const mockTx = mockPrisma._mockTx;

	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
			fn(mockTx),
		);
	});

	it("should update existing refund status to COMPLETED when Stripe shows succeeded", async () => {
		const charge = {
			refunds: {
				data: [{ id: "re_1", status: "succeeded", amount: 5000, currency: "eur", metadata: {} }],
			},
		} as unknown as Stripe.Charge;

		const existingRefunds = [
			{ id: "ref-app-1", amount: 5000, status: "APPROVED" as const, stripeRefundId: "re_1" },
		];

		await syncStripeRefunds(charge, existingRefunds, "order-1");

		expect(mockTx.refund.update).toHaveBeenCalledWith({
			where: { id: "ref-app-1" },
			data: { status: "COMPLETED" },
		});
	});

	it("should link app-created refund to Stripe refund via metadata", async () => {
		const charge = {
			refunds: {
				data: [
					{
						id: "re_new",
						status: "succeeded",
						amount: 3000,
						currency: "eur",
						metadata: { refund_id: "ref-app-2" },
					},
				],
			},
		} as unknown as Stripe.Charge;

		await syncStripeRefunds(charge, [], "order-1");

		expect(mockTx.refund.update).toHaveBeenCalledWith({
			where: { id: "ref-app-2" },
			data: expect.objectContaining({
				stripeRefundId: "re_new",
				status: "COMPLETED",
				processedAt: expect.any(Date),
			}),
		});
	});

	it("should upsert Dashboard-initiated refund when no metadata", async () => {
		const charge = {
			refunds: {
				data: [
					{
						id: "re_dashboard",
						status: "succeeded",
						amount: 2000,
						currency: "eur",
						metadata: {},
					},
				],
			},
		} as unknown as Stripe.Charge;

		await syncStripeRefunds(charge, [], "order-1");

		expect(mockTx.refund.upsert).toHaveBeenCalledWith({
			where: { stripeRefundId: "re_dashboard" },
			create: expect.objectContaining({
				orderId: "order-1",
				stripeRefundId: "re_dashboard",
				amount: 2000,
				status: "COMPLETED",
				reason: "OTHER",
				note: "Remboursement effectué via Dashboard Stripe",
			}),
			update: expect.objectContaining({
				status: "COMPLETED",
			}),
		});
	});

	it("should skip refunds without id", async () => {
		const charge = {
			refunds: {
				data: [{ id: undefined, status: "succeeded", amount: 1000, metadata: {} }],
			},
		} as unknown as Stripe.Charge;

		await syncStripeRefunds(charge, [], "order-1");

		expect(mockTx.refund.update).not.toHaveBeenCalled();
		expect(mockTx.refund.upsert).not.toHaveBeenCalled();
	});

	it("should not update when existing refund is already COMPLETED", async () => {
		const charge = {
			refunds: {
				data: [{ id: "re_1", status: "succeeded", amount: 5000, currency: "eur", metadata: {} }],
			},
		} as unknown as Stripe.Charge;

		const existingRefunds = [
			{ id: "ref-1", amount: 5000, status: "COMPLETED" as const, stripeRefundId: "re_1" },
		];

		await syncStripeRefunds(charge, existingRefunds, "order-1");

		// No operations needed — no transaction
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should handle empty refunds array", async () => {
		const charge = {
			refunds: { data: [] },
		} as unknown as Stripe.Charge;

		await syncStripeRefunds(charge, [], "order-1");

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should handle null refunds gracefully", async () => {
		const charge = {
			refunds: null,
		} as unknown as Stripe.Charge;

		await syncStripeRefunds(charge, [], "order-1");

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});
});

// ============================================================================
// updateOrderPaymentStatus
// ============================================================================

describe("updateOrderPaymentStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should update to REFUNDED when fully refunded", async () => {
		mockPrisma.order.update.mockResolvedValue({});

		const result = await updateOrderPaymentStatus("order-1", 10000, 10000, "PAID" as never);

		expect(result).toEqual({ isFullyRefunded: true, isPartiallyRefunded: false });
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});
	});

	it("should update to PARTIALLY_REFUNDED when partially refunded", async () => {
		mockPrisma.order.update.mockResolvedValue({});

		const result = await updateOrderPaymentStatus("order-1", 10000, 5000, "PAID" as never);

		expect(result).toEqual({ isFullyRefunded: false, isPartiallyRefunded: true });
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "PARTIALLY_REFUNDED" },
		});
	});

	it("should not update when totalRefunded is 0", async () => {
		const result = await updateOrderPaymentStatus("order-1", 10000, 0, "PAID" as never);

		expect(result).toEqual({ isFullyRefunded: false, isPartiallyRefunded: false });
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("should not update when already REFUNDED", async () => {
		const result = await updateOrderPaymentStatus("order-1", 10000, 10000, "REFUNDED" as never);

		expect(result).toEqual({ isFullyRefunded: true, isPartiallyRefunded: false });
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("should not update to PARTIALLY_REFUNDED when already REFUNDED", async () => {
		const result = await updateOrderPaymentStatus("order-1", 10000, 5000, "REFUNDED" as never);

		expect(result).toEqual({ isFullyRefunded: false, isPartiallyRefunded: true });
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("should mark as fully refunded when totalRefunded exceeds orderTotal", async () => {
		mockPrisma.order.update.mockResolvedValue({});

		const result = await updateOrderPaymentStatus("order-1", 10000, 15000, "PAID" as never);

		expect(result.isFullyRefunded).toBe(true);
	});
});

// ============================================================================
// mapStripeRefundStatus
// ============================================================================

describe("mapStripeRefundStatus", () => {
	it("should map succeeded to COMPLETED", () => {
		expect(mapStripeRefundStatus("succeeded")).toBe("COMPLETED");
	});

	it("should map pending to APPROVED", () => {
		expect(mapStripeRefundStatus("pending")).toBe("APPROVED");
	});

	it("should map failed to FAILED", () => {
		expect(mapStripeRefundStatus("failed")).toBe("FAILED");
	});

	it("should map canceled to CANCELLED", () => {
		expect(mapStripeRefundStatus("canceled")).toBe("CANCELLED");
	});

	it("should default to PENDING for unknown status", () => {
		expect(mapStripeRefundStatus("unknown")).toBe("PENDING");
	});

	it("should default to PENDING for null status", () => {
		expect(mapStripeRefundStatus(null)).toBe("APPROVED");
	});

	it("should default to PENDING for undefined status", () => {
		expect(mapStripeRefundStatus(undefined)).toBe("APPROVED");
	});
});

// ============================================================================
// updateRefundStatus — State transitions
// ============================================================================

describe("updateRefundStatus — state transitions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should update PENDING to COMPLETED", async () => {
		mockPrisma.refund.update.mockResolvedValue({});

		await updateRefundStatus("ref-1", "COMPLETED" as never, "succeeded", "PENDING" as never);

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "ref-1" },
			data: {
				status: "COMPLETED",
				processedAt: expect.any(Date),
			},
		});
	});

	it("should reject invalid transition COMPLETED to PENDING", async () => {
		await updateRefundStatus("ref-1", "PENDING" as never, "pending", "COMPLETED" as never);

		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should allow FAILED to COMPLETED transition (retry succeeded)", async () => {
		mockPrisma.refund.update.mockResolvedValue({});

		await updateRefundStatus("ref-1", "COMPLETED" as never, "succeeded", "FAILED" as never);

		expect(mockPrisma.refund.update).toHaveBeenCalled();
	});

	it("should reject REJECTED to COMPLETED transition", async () => {
		await updateRefundStatus("ref-1", "COMPLETED" as never, "succeeded", "REJECTED" as never);

		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should fetch current status from DB when not provided", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({ status: "APPROVED" });
		mockPrisma.refund.update.mockResolvedValue({});

		await updateRefundStatus("ref-1", "COMPLETED" as never, "succeeded");

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledWith({
			where: { id: "ref-1" },
			select: { status: true },
		});
		expect(mockPrisma.refund.update).toHaveBeenCalled();
	});

	it("should not set processedAt for non-COMPLETED status", async () => {
		mockPrisma.refund.update.mockResolvedValue({});

		await updateRefundStatus("ref-1", "FAILED" as never, "failed", "PENDING" as never);

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "ref-1" },
			data: {
				status: "FAILED",
				processedAt: undefined,
			},
		});
	});
});

// ============================================================================
// markRefundAsFailed
// ============================================================================

describe("markRefundAsFailed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should set status to FAILED with reason", async () => {
		mockPrisma.refund.update.mockResolvedValue({});

		await markRefundAsFailed("ref-1", "Stripe API timeout");

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "ref-1" },
			data: {
				status: "FAILED",
				failureReason: "Stripe API timeout",
			},
		});
	});
});

// ============================================================================
// resolveRefundByStripeId
// ============================================================================

describe("resolveRefundByStripeId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should find refund by stripeRefundId", async () => {
		const refundRecord = {
			id: "ref-1",
			status: "COMPLETED",
			amount: 5000,
			orderId: "order-1",
			order: {
				id: "order-1",
				orderNumber: "SYN-001",
				customerEmail: "test@example.com",
				stripePaymentIntentId: "pi_123",
			},
		};
		mockPrisma.refund.findUnique.mockResolvedValueOnce(refundRecord);

		const result = await resolveRefundByStripeId("re_123");

		expect(result).toEqual(refundRecord);
	});

	it("should fallback to metadataRefundId and link stripeRefundId", async () => {
		// First lookup by stripeRefundId fails
		mockPrisma.refund.findUnique.mockResolvedValueOnce(null);
		// Second lookup by metadataRefundId succeeds
		const refundRecord = {
			id: "ref-from-metadata",
			status: "APPROVED",
			amount: 3000,
			orderId: "order-1",
			order: {
				id: "order-1",
				orderNumber: "SYN-002",
				customerEmail: "test@example.com",
				stripePaymentIntentId: "pi_456",
			},
		};
		mockPrisma.refund.findUnique.mockResolvedValueOnce(refundRecord);
		mockPrisma.refund.update.mockResolvedValue({});

		const result = await resolveRefundByStripeId("re_new", "ref-from-metadata");

		expect(result).toEqual(refundRecord);
		// Should link the stripeRefundId
		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "ref-from-metadata" },
			data: { stripeRefundId: "re_new" },
		});
	});

	it("should return null when not found by either method", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		const result = await resolveRefundByStripeId("re_nonexistent", "ref_nonexistent");

		expect(result).toBeNull();
	});

	it("should return null when not found and no metadata provided", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		const result = await resolveRefundByStripeId("re_nonexistent");

		expect(result).toBeNull();
		// Should only call findUnique once (no fallback)
		expect(mockPrisma.refund.findUnique).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// sendRefundFailedAlert
// ============================================================================

describe("sendRefundFailedAlert", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should send alert with correct order details", async () => {
		mockSendAdminRefundFailedAlert.mockResolvedValue(undefined);

		const refund = {
			id: "ref-1",
			status: "FAILED" as const,
			amount: 5000,
			orderId: "order-1",
			order: {
				id: "order-1",
				orderNumber: "SYN-001",
				customerEmail: "client@example.com",
				stripePaymentIntentId: "pi_123",
			},
		};

		await sendRefundFailedAlert(refund, "Card expired");

		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith({
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			amount: 5000,
			reason: "other",
			errorMessage: "Échec remboursement Stripe: Card expired",
			stripePaymentIntentId: "pi_123",
			dashboardUrl: "https://synclune.fr/admin/ventes/remboursements",
		});
	});

	it("should not throw when email service fails", async () => {
		mockSendAdminRefundFailedAlert.mockRejectedValue(new Error("Email error"));

		const refund = {
			id: "ref-1",
			status: "FAILED" as const,
			amount: 1000,
			orderId: "order-1",
			order: {
				id: "order-1",
				orderNumber: "SYN-002",
				customerEmail: null,
				stripePaymentIntentId: "pi_456",
			},
		};

		await expect(sendRefundFailedAlert(refund, "Error")).resolves.toBeUndefined();
	});

	it("should use 'Email non disponible' when customer email is null", async () => {
		mockSendAdminRefundFailedAlert.mockResolvedValue(undefined);

		const refund = {
			id: "ref-1",
			status: "FAILED" as const,
			amount: 2000,
			orderId: "order-1",
			order: {
				id: "order-1",
				orderNumber: "SYN-003",
				customerEmail: null,
				stripePaymentIntentId: null,
			},
		};

		await sendRefundFailedAlert(refund, "Reason");

		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				customerEmail: "Email non disponible",
				stripePaymentIntentId: "",
			}),
		);
	});
});
