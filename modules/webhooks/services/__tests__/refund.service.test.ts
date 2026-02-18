import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// ============================================================================
// Hoisted mocks - must be declared before any imports
// ============================================================================

const {
	mockPrisma,
	mockTx,
	mockSendRefundConfirmationEmail,
	mockSendAdminRefundFailedAlert,
	mockGetBaseUrl,
	mockROUTES,
} = vi.hoisted(() => {
	const mockTx = {
		refund: {
			update: vi.fn(),
			upsert: vi.fn(),
		},
	};

	return {
		mockPrisma: {
			$transaction: vi.fn(),
			refund: {
				update: vi.fn(),
				upsert: vi.fn(),
				findUnique: vi.fn(),
			},
			order: {
				update: vi.fn(),
				findUnique: vi.fn(),
			},
		},
		mockTx,
		mockSendRefundConfirmationEmail: vi.fn(),
		mockSendAdminRefundFailedAlert: vi.fn(),
		mockGetBaseUrl: vi.fn(),
		mockROUTES: {
			ACCOUNT: {
				ORDER_DETAIL: (orderNumber: string) => `/compte/commandes/${orderNumber}`,
			},
		},
	};
});

vi.mock("@/app/generated/prisma/client", () => ({
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
	PaymentStatus: {
		REFUNDED: "REFUNDED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/emails/services/refund-emails", () => ({
	sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: mockSendAdminRefundFailedAlert,
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: mockROUTES,
}));

import {
	syncStripeRefunds,
	updateOrderPaymentStatus,
	findRefundByStripeId,
	mapStripeRefundStatus,
	updateRefundStatus,
	markRefundAsFailed,
	sendRefundFailedAlert,
} from "../refund.service";

// ============================================================================
// Helpers
// ============================================================================

function makeCharge(refunds: Partial<Stripe.Refund>[]): Stripe.Charge {
	return {
		id: "ch_test_1",
		refunds: {
			data: refunds,
		},
	} as unknown as Stripe.Charge;
}

function makeRefundRecord() {
	return {
		id: "refund-1",
		status: "APPROVED" as const,
		amount: 5000,
		orderId: "order-1",
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			customerEmail: "client@test.com",
			stripePaymentIntentId: "pi_test_1",
		},
	};
}

// ============================================================================
// syncStripeRefunds
// ============================================================================

describe("syncStripeRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTx.refund.update.mockResolvedValue({});
		mockTx.refund.upsert.mockResolvedValue({});
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<void>) =>
			cb(mockTx)
		);
	});

	it("should update existing refund status to COMPLETED when Stripe shows succeeded", async () => {
		const charge = makeCharge([
			{ id: "re_stripe_1", status: "succeeded", amount: 5000 },
		]);
		const existingRefunds = [
			{ id: "refund-app-1", amount: 5000, status: "APPROVED" as const, stripeRefundId: "re_stripe_1" },
		];

		await syncStripeRefunds(charge, existingRefunds, "order-1");

		expect(mockTx.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-app-1" },
			data: { status: "COMPLETED" },
		});
	});

	it("should not update existing refund already at COMPLETED status", async () => {
		const charge = makeCharge([
			{ id: "re_stripe_1", status: "succeeded", amount: 5000 },
		]);
		const existingRefunds = [
			{ id: "refund-app-1", amount: 5000, status: "COMPLETED" as const, stripeRefundId: "re_stripe_1" },
		];

		await syncStripeRefunds(charge, existingRefunds, "order-1");

		expect(mockTx.refund.update).not.toHaveBeenCalled();
		expect(mockTx.refund.upsert).not.toHaveBeenCalled();
	});

	it("should link app-initiated refund via metadata.refund_id", async () => {
		const charge = makeCharge([
			{
				id: "re_stripe_2",
				status: "succeeded",
				amount: 3000,
				metadata: { refund_id: "refund-app-2" },
			},
		]);
		const existingRefunds: Array<{ id: string; amount: number; status: "COMPLETED"; stripeRefundId: string | null }> = [];

		await syncStripeRefunds(charge, existingRefunds, "order-1");

		expect(mockTx.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "refund-app-2" },
				data: expect.objectContaining({
					stripeRefundId: "re_stripe_2",
					status: "COMPLETED",
				}),
			})
		);
		expect(mockTx.refund.upsert).not.toHaveBeenCalled();
	});

	it("should link app-initiated refund with PENDING status when Stripe status is not succeeded", async () => {
		const charge = makeCharge([
			{
				id: "re_stripe_3",
				status: "pending",
				amount: 3000,
				metadata: { refund_id: "refund-app-3" },
			},
		]);
		const existingRefunds: Array<{ id: string; amount: number; status: "COMPLETED"; stripeRefundId: string | null }> = [];

		await syncStripeRefunds(charge, existingRefunds, "order-1");

		expect(mockTx.refund.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "refund-app-3" },
				data: expect.objectContaining({
					stripeRefundId: "re_stripe_3",
					status: "PENDING",
				}),
			})
		);
	});

	it("should upsert dashboard-initiated refund when no metadata and no existing match", async () => {
		const charge = makeCharge([
			{
				id: "re_dashboard_1",
				status: "succeeded",
				amount: 7500,
				currency: "eur",
			},
		]);
		const existingRefunds: Array<{ id: string; amount: number; status: "COMPLETED"; stripeRefundId: string | null }> = [];

		await syncStripeRefunds(charge, existingRefunds, "order-1");

		expect(mockTx.refund.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stripeRefundId: "re_dashboard_1" },
				create: expect.objectContaining({
					orderId: "order-1",
					stripeRefundId: "re_dashboard_1",
					amount: 7500,
					status: "COMPLETED",
					reason: "OTHER",
					note: "Remboursement effectué via Dashboard Stripe",
				}),
				update: expect.objectContaining({
					status: "COMPLETED",
				}),
			})
		);
	});

	it("should throw when any operation fails (atomic transaction)", async () => {
		const charge = makeCharge([
			{ id: "re_ok", status: "succeeded", amount: 5000, metadata: { refund_id: "app-ok" } },
			{ id: "re_fail", status: "succeeded", amount: 3000, metadata: { refund_id: "app-fail" } },
		]);
		const existingRefunds: Array<{ id: string; amount: number; status: "COMPLETED"; stripeRefundId: string | null }> = [];

		mockTx.refund.update
			.mockResolvedValueOnce({})
			.mockRejectedValueOnce(new Error("DB error"));

		// Transaction should propagate the error (all-or-nothing)
		await expect(syncStripeRefunds(charge, existingRefunds, "order-1")).rejects.toThrow("DB error");
	});

	it("should skip refunds without an ID", async () => {
		const charge = makeCharge([
			{ id: undefined, status: "succeeded", amount: 5000 },
		]);
		const existingRefunds: Array<{ id: string; amount: number; status: "COMPLETED"; stripeRefundId: string | null }> = [];

		await syncStripeRefunds(charge, existingRefunds, "order-1");

		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should handle empty charge refunds list", async () => {
		const charge = makeCharge([]);

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
		mockPrisma.order.update.mockResolvedValue({});
	});

	it("should mark order as REFUNDED when fully refunded", async () => {
		const result = await updateOrderPaymentStatus("order-1", 10000, 10000, "PAID" as never);

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});
		expect(result).toEqual({ isFullyRefunded: true, isPartiallyRefunded: false });
	});

	it("should mark order as REFUNDED when totalRefunded exceeds orderTotal", async () => {
		const result = await updateOrderPaymentStatus("order-1", 10000, 12000, "PAID" as never);

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});
		expect(result.isFullyRefunded).toBe(true);
	});

	it("should mark order as PARTIALLY_REFUNDED when partially refunded", async () => {
		const result = await updateOrderPaymentStatus("order-1", 10000, 4000, "PAID" as never);

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "PARTIALLY_REFUNDED" },
		});
		expect(result).toEqual({ isFullyRefunded: false, isPartiallyRefunded: true });
	});

	it("should not update order when already REFUNDED and fully refunded", async () => {
		await updateOrderPaymentStatus("order-1", 10000, 10000, "REFUNDED" as never);

		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("should not update order when already PARTIALLY_REFUNDED and partially refunded", async () => {
		await updateOrderPaymentStatus("order-1", 10000, 4000, "PARTIALLY_REFUNDED" as never);

		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("should not update order when already REFUNDED even if partially refunded amount is provided", async () => {
		// Already REFUNDED status is terminal for partially refunded too
		await updateOrderPaymentStatus("order-1", 10000, 4000, "REFUNDED" as never);

		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("should not update order when no refund has been made", async () => {
		const result = await updateOrderPaymentStatus("order-1", 10000, 0, "PAID" as never);

		expect(mockPrisma.order.update).not.toHaveBeenCalled();
		expect(result).toEqual({ isFullyRefunded: false, isPartiallyRefunded: false });
	});

	it("should return correct booleans without DB update when status already matches", async () => {
		const result = await updateOrderPaymentStatus("order-1", 10000, 10000, "REFUNDED" as never);

		expect(result).toEqual({ isFullyRefunded: true, isPartiallyRefunded: false });
	});
});

// ============================================================================
// findRefundByStripeId
// ============================================================================

describe("findRefundByStripeId", () => {
	const refundSelect = {
		id: true,
		status: true,
		amount: true,
		orderId: true,
		order: {
			select: {
				id: true,
				orderNumber: true,
				customerEmail: true,
				stripePaymentIntentId: true,
			},
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should find refund by stripeRefundId when it exists", async () => {
		const expectedRefund = makeRefundRecord();
		mockPrisma.refund.findUnique.mockResolvedValueOnce(expectedRefund);

		const result = await findRefundByStripeId("re_found_1");

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledWith({
			where: { stripeRefundId: "re_found_1" },
			select: refundSelect,
		});
		expect(result).toEqual(expectedRefund);
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should find refund by metadata and link stripeRefundId when not found by stripeRefundId", async () => {
		const expectedRefund = makeRefundRecord();
		mockPrisma.refund.findUnique
			.mockResolvedValueOnce(null) // first call by stripeRefundId returns null
			.mockResolvedValueOnce(expectedRefund); // second call by metadata id
		mockPrisma.refund.update.mockResolvedValue({});

		const result = await findRefundByStripeId("re_new_stripe_1", "refund-1");

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledTimes(2);
		expect(mockPrisma.refund.findUnique).toHaveBeenNthCalledWith(1, {
			where: { stripeRefundId: "re_new_stripe_1" },
			select: refundSelect,
		});
		expect(mockPrisma.refund.findUnique).toHaveBeenNthCalledWith(2, {
			where: { id: "refund-1" },
			select: refundSelect,
		});
		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-1" },
			data: { stripeRefundId: "re_new_stripe_1" },
		});
		expect(result).toEqual(expectedRefund);
	});

	it("should return null when not found by stripeRefundId and no metadataRefundId", async () => {
		mockPrisma.refund.findUnique.mockResolvedValueOnce(null);

		const result = await findRefundByStripeId("re_not_found_1");

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledTimes(1);
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});

	it("should return null when not found by stripeRefundId and not found by metadataRefundId either", async () => {
		mockPrisma.refund.findUnique
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null);

		const result = await findRefundByStripeId("re_not_found_1", "also-not-found");

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledTimes(2);
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
		expect(result).toBeNull();
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

	it("should default to PENDING for unknown status string", () => {
		// Unknown status: statusMap["unknown_status"] is undefined, fallback is RefundStatus.PENDING
		expect(mapStripeRefundStatus("unknown_status")).toBe("PENDING");
	});

	it("should default to APPROVED for null input", () => {
		expect(mapStripeRefundStatus(null)).toBe("APPROVED");
	});

	it("should default to APPROVED for undefined input", () => {
		expect(mapStripeRefundStatus(undefined)).toBe("APPROVED");
	});

	it("should default to APPROVED for empty string input", () => {
		expect(mapStripeRefundStatus("")).toBe("APPROVED");
	});
});

// ============================================================================
// updateRefundStatus
// ============================================================================

describe("updateRefundStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-17T12:00:00Z"));
		mockPrisma.refund.update.mockResolvedValue({});
	});

	it("should update refund status with a valid transition", async () => {
		await updateRefundStatus("refund-1", "COMPLETED" as never, "succeeded", "APPROVED" as never);

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-1" },
			data: {
				status: "COMPLETED",
				processedAt: new Date("2026-02-17T12:00:00Z"),
			},
		});
	});

	it("should skip invalid state transition (COMPLETED -> PENDING)", async () => {
		await updateRefundStatus("refund-1", "PENDING" as never, "pending", "COMPLETED" as never);

		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should skip invalid state transition (REJECTED -> any)", async () => {
		await updateRefundStatus("refund-1", "APPROVED" as never, "pending", "REJECTED" as never);

		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should skip invalid state transition (CANCELLED -> any)", async () => {
		await updateRefundStatus("refund-1", "COMPLETED" as never, "succeeded", "CANCELLED" as never);

		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should set processedAt only when new status is COMPLETED", async () => {
		await updateRefundStatus("refund-1", "COMPLETED" as never, "succeeded", "APPROVED" as never);

		const call = mockPrisma.refund.update.mock.calls[0][0];
		expect(call.data.processedAt).toEqual(new Date("2026-02-17T12:00:00Z"));
	});

	it("should not set processedAt when new status is not COMPLETED", async () => {
		await updateRefundStatus("refund-1", "FAILED" as never, "failed", "APPROVED" as never);

		const call = mockPrisma.refund.update.mock.calls[0][0];
		expect(call.data.processedAt).toBeUndefined();
	});

	it("should fetch current status from DB and validate when currentStatus is not provided", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({ status: "APPROVED" });

		await updateRefundStatus("refund-1", "COMPLETED" as never, "succeeded");

		expect(mockPrisma.refund.findUnique).toHaveBeenCalledWith({
			where: { id: "refund-1" },
			select: { status: true },
		});
		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-1" },
			data: {
				status: "COMPLETED",
				processedAt: new Date("2026-02-17T12:00:00Z"),
			},
		});
	});

	it("should reject invalid transition after fetching from DB when currentStatus is not provided", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue({ status: "COMPLETED" });

		await updateRefundStatus("refund-1", "PENDING" as never, "pending");

		expect(mockPrisma.refund.findUnique).toHaveBeenCalled();
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});

	it("should proceed without validation when refund not found in DB and no currentStatus", async () => {
		mockPrisma.refund.findUnique.mockResolvedValue(null);

		await updateRefundStatus("refund-1", "FAILED" as never, "failed");

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-1" },
			data: {
				status: "FAILED",
				processedAt: undefined,
			},
		});
	});

	it("should allow PENDING -> APPROVED transition", async () => {
		await updateRefundStatus("refund-1", "APPROVED" as never, "pending", "PENDING" as never);

		expect(mockPrisma.refund.update).toHaveBeenCalled();
	});

	it("should allow FAILED -> COMPLETED transition", async () => {
		await updateRefundStatus("refund-1", "COMPLETED" as never, "succeeded", "FAILED" as never);

		expect(mockPrisma.refund.update).toHaveBeenCalled();
	});
});

// ============================================================================
// markRefundAsFailed
// ============================================================================

describe("markRefundAsFailed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.refund.update.mockResolvedValue({});
	});

	it("should update refund with FAILED status and failure reason", async () => {
		await markRefundAsFailed("refund-1", "insufficient_funds");

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-1" },
			data: {
				status: "FAILED",
				failureReason: "insufficient_funds",
			},
		});
	});

	it("should propagate DB errors", async () => {
		mockPrisma.refund.update.mockRejectedValue(new Error("DB connection lost"));

		await expect(markRefundAsFailed("refund-1", "some_reason")).rejects.toThrow("DB connection lost");
	});
});

// ============================================================================
// sendRefundFailedAlert
// ============================================================================

describe("sendRefundFailedAlert", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.com");
		mockSendAdminRefundFailedAlert.mockResolvedValue(undefined);
	});

	it("should send admin alert email with correct payload", async () => {
		const refund = makeRefundRecord();

		await sendRefundFailedAlert(refund, "charge_for_pending_refund_disputed");

		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith({
			orderNumber: "SYN-001",
			customerEmail: "client@test.com",
			amount: 5000,
			reason: "other",
			errorMessage: "Échec remboursement Stripe: charge_for_pending_refund_disputed",
			stripePaymentIntentId: "pi_test_1",
			dashboardUrl: "https://synclune.com/admin/ventes/remboursements",
		});
	});

	it("should use empty string for stripePaymentIntentId when null", async () => {
		const refund = {
			...makeRefundRecord(),
			order: {
				...makeRefundRecord().order,
				stripePaymentIntentId: null,
			},
		};

		await sendRefundFailedAlert(refund, "some_error");

		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				stripePaymentIntentId: "",
			})
		);
	});

	it("should use fallback email message when customerEmail is null", async () => {
		const refund = {
			...makeRefundRecord(),
			order: {
				...makeRefundRecord().order,
				customerEmail: null,
			},
		};

		await sendRefundFailedAlert(refund, "some_error");

		expect(mockSendAdminRefundFailedAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				customerEmail: "Email non disponible",
			})
		);
	});

	it("should handle email errors gracefully without throwing", async () => {
		const refund = makeRefundRecord();
		mockSendAdminRefundFailedAlert.mockRejectedValue(new Error("SMTP error"));

		// Should not throw
		await expect(sendRefundFailedAlert(refund, "some_error")).resolves.toBeUndefined();
	});
});
