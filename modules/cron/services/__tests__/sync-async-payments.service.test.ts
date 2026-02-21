import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockStripe,
	mockGetStripeClient,
	mockMarkOrderAsPaid,
	mockMarkOrderAsFailed,
	mockExtractPaymentFailureDetails,
	mockRestoreStockForOrder,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findMany: vi.fn() },
	},
	mockStripe: {
		paymentIntents: { retrieve: vi.fn() },
	},
	mockGetStripeClient: vi.fn(),
	mockMarkOrderAsPaid: vi.fn(),
	mockMarkOrderAsFailed: vi.fn(),
	mockExtractPaymentFailureDetails: vi.fn(),
	mockRestoreStockForOrder: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/shared/lib/stripe", () => ({
	getStripeClient: mockGetStripeClient,
}));

vi.mock("next/cache", () => ({
	updateTag: vi.fn(),
}));

vi.mock("@/modules/webhooks/services/payment-intent.service", () => ({
	markOrderAsPaid: mockMarkOrderAsPaid,
	markOrderAsFailed: mockMarkOrderAsFailed,
	extractPaymentFailureDetails: mockExtractPaymentFailureDetails,
	restoreStockForOrder: mockRestoreStockForOrder,
}));

import { syncAsyncPayments } from "../sync-async-payments.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

describe("syncAsyncPayments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
		mockGetStripeClient.mockReturnValue(mockStripe);
	});

	it("should return null when Stripe is not configured", async () => {
		mockGetStripeClient.mockReturnValue(null);

		const result = await syncAsyncPayments();

		expect(result).toBeNull();
	});

	it("should return zero counts when no pending orders exist", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await syncAsyncPayments();

		expect(result).toEqual({ checked: 0, updated: 0, errors: 0, hasMore: false });
	});

	it("should query orders with correct time window", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		await syncAsyncPayments();

		const call = mockPrisma.order.findMany.mock.calls[0][0];
		expect(call.where.paymentStatus).toBe("PENDING");
		expect(call.where.stripePaymentIntentId).toEqual({ not: null });
		expect(call.where.deletedAt).toBeNull();

		const minAge = new Date(
			Date.now() - THRESHOLDS.ASYNC_PAYMENT_MIN_AGE_MS
		);
		const maxAge = new Date(
			Date.now() - THRESHOLDS.ASYNC_PAYMENT_MAX_AGE_MS
		);
		expect(call.where.createdAt.gte.getTime()).toBe(maxAge.getTime());
		expect(call.where.createdAt.lt.getTime()).toBe(minAge.getTime());
	});

	it("should mark order as paid when Stripe shows succeeded", async () => {
		const order = {
			id: "order-1",
			orderNumber: "SYN-001",
			stripePaymentIntentId: "pi_success",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "succeeded",
		});

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsPaid).toHaveBeenCalledWith("order-1", "pi_success");
		expect(result!.updated).toBe(1);
		expect(result!.checked).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should mark order as failed and restore stock when Stripe shows canceled", async () => {
		const order = {
			id: "order-2",
			orderNumber: "SYN-002",
			stripePaymentIntentId: "pi_canceled",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "canceled",
		});
		const failureDetails = { reason: "canceled" };
		mockExtractPaymentFailureDetails.mockReturnValue(failureDetails);

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith(
			"order-2",
			"pi_canceled",
			failureDetails
		);
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-2");
		expect(result!.updated).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should mark order as failed when Stripe shows requires_payment_method", async () => {
		const order = {
			id: "order-3",
			orderNumber: "SYN-003",
			stripePaymentIntentId: "pi_needs_method",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "requires_payment_method",
		});
		mockExtractPaymentFailureDetails.mockReturnValue({});

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).toHaveBeenCalled();
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-3");
		expect(result!.updated).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should not update orders still in processing state", async () => {
		const order = {
			id: "order-4",
			orderNumber: "SYN-004",
			stripePaymentIntentId: "pi_processing",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "processing",
		});

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsPaid).not.toHaveBeenCalled();
		expect(mockMarkOrderAsFailed).not.toHaveBeenCalled();
		expect(result!.updated).toBe(0);
		expect(result!.checked).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should count errors when Stripe API call fails", async () => {
		const order = {
			id: "order-5",
			orderNumber: "SYN-005",
			stripePaymentIntentId: "pi_error",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockRejectedValue(
			new Error("Stripe API error")
		);

		const result = await syncAsyncPayments();

		expect(result!.errors).toBe(1);
		expect(result!.updated).toBe(0);
		expect(result!.hasMore).toBe(false);
	});

	it("should skip orders with null stripePaymentIntentId", async () => {
		const order = {
			id: "order-6",
			orderNumber: "SYN-006",
			stripePaymentIntentId: null,
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await syncAsyncPayments();

		expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
		expect(result!.checked).toBe(1);
		expect(result!.updated).toBe(0);
		expect(result!.hasMore).toBe(false);
	});

	it("should handle mixed results across multiple orders", async () => {
		const orders = [
			{
				id: "order-ok",
				orderNumber: "SYN-OK",
				stripePaymentIntentId: "pi_ok",
				paymentStatus: "PENDING",
			},
			{
				id: "order-err",
				orderNumber: "SYN-ERR",
				stripePaymentIntentId: "pi_err",
				paymentStatus: "PENDING",
			},
			{
				id: "order-pending",
				orderNumber: "SYN-PEND",
				stripePaymentIntentId: "pi_pend",
				paymentStatus: "PENDING",
			},
		];
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockStripe.paymentIntents.retrieve
			.mockResolvedValueOnce({ status: "succeeded" })
			.mockRejectedValueOnce(new Error("API error"))
			.mockResolvedValueOnce({ status: "processing" });

		const result = await syncAsyncPayments();

		expect(result!.checked).toBe(3);
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(1);
		expect(result!.hasMore).toBe(false);
	});

	it("should return hasMore: true when exactly 25 orders are returned", async () => {
		const orders = Array.from({ length: 25 }, (_, i) => ({
			id: `order-${i}`,
			orderNumber: `SYN-${String(i).padStart(3, "0")}`,
			stripePaymentIntentId: `pi_${i}`,
			paymentStatus: "PENDING",
		}));
		mockPrisma.order.findMany.mockResolvedValue(orders);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "processing",
		});

		const result = await syncAsyncPayments();

		expect(result!.checked).toBe(25);
		expect(result!.hasMore).toBe(true);
	});

	it("should continue counting order as updated even if restoreStockForOrder fails", async () => {
		const order = {
			id: "order-stock-fail",
			orderNumber: "SYN-STOCK-FAIL",
			stripePaymentIntentId: "pi_canceled",
			paymentStatus: "PENDING",
		};
		mockPrisma.order.findMany.mockResolvedValue([order]);
		mockStripe.paymentIntents.retrieve.mockResolvedValue({
			status: "canceled",
		});
		const failureDetails = { reason: "canceled" };
		mockExtractPaymentFailureDetails.mockReturnValue(failureDetails);
		mockRestoreStockForOrder.mockRejectedValue(
			new Error("Stock restore failed")
		);

		const result = await syncAsyncPayments();

		expect(mockMarkOrderAsFailed).toHaveBeenCalledWith(
			"order-stock-fail",
			"pi_canceled",
			failureDetails
		);
		expect(mockRestoreStockForOrder).toHaveBeenCalledWith("order-stock-fail");
		expect(result!.updated).toBe(1);
		expect(result!.errors).toBe(0);
		expect(result!.hasMore).toBe(false);
	});
});
