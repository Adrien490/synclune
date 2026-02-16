import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockStripe,
	mockGetStripeClient,
	mockMapStripeRefundStatus,
	mockUpdateRefundStatus,
	mockMarkRefundAsFailed,
} = vi.hoisted(() => ({
	mockPrisma: {
		refund: { findMany: vi.fn() },
	},
	mockStripe: {
		refunds: { retrieve: vi.fn() },
	},
	mockGetStripeClient: vi.fn(),
	mockMapStripeRefundStatus: vi.fn(),
	mockUpdateRefundStatus: vi.fn(),
	mockMarkRefundAsFailed: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/stripe", () => ({
	getStripeClient: mockGetStripeClient,
}));

vi.mock("@/modules/webhooks/services/refund.service", () => ({
	mapStripeRefundStatus: mockMapStripeRefundStatus,
	updateRefundStatus: mockUpdateRefundStatus,
	markRefundAsFailed: mockMarkRefundAsFailed,
}));

import { reconcilePendingRefunds } from "../reconcile-refunds.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

describe("reconcilePendingRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-09T18:00:00Z"));
		mockGetStripeClient.mockReturnValue(mockStripe);
	});

	it("should return null when Stripe is not configured", async () => {
		mockGetStripeClient.mockReturnValue(null);

		const result = await reconcilePendingRefunds();

		expect(result).toBeNull();
	});

	it("should return zero counts when no pending refunds exist", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([]);

		const result = await reconcilePendingRefunds();

		expect(result).toEqual({ checked: 0, updated: 0, errors: 0, hasMore: false });
	});

	it("should query APPROVED refunds with correct time threshold", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([]);

		await reconcilePendingRefunds();

		const call = mockPrisma.refund.findMany.mock.calls[0][0];
		expect(call.where.status).toBe("APPROVED");
		expect(call.where.stripeRefundId).toEqual({ not: null });
		expect(call.where.deletedAt).toBeNull();

		const minAge = new Date(
			Date.now() - THRESHOLDS.REFUND_RECONCILE_MIN_AGE_MS
		);
		expect(call.where.processedAt.lt.getTime()).toBe(minAge.getTime());
		expect(call.take).toBe(25);
	});

	it("should update refund to COMPLETED when Stripe shows succeeded", async () => {
		const refund = {
			id: "refund-1",
			stripeRefundId: "re_success",
			status: "APPROVED",
			order: { orderNumber: "SYN-001" },
		};
		mockPrisma.refund.findMany.mockResolvedValue([refund]);
		mockStripe.refunds.retrieve.mockResolvedValue({
			status: "succeeded",
			failure_reason: null,
		});
		mockMapStripeRefundStatus.mockReturnValue("COMPLETED");

		const result = await reconcilePendingRefunds();

		expect(mockUpdateRefundStatus).toHaveBeenCalledWith(
			"refund-1",
			"COMPLETED",
			"succeeded"
		);
		expect(result!.updated).toBe(1);
	});

	it("should mark refund as failed when Stripe shows failed", async () => {
		const refund = {
			id: "refund-2",
			stripeRefundId: "re_failed",
			status: "APPROVED",
			order: { orderNumber: "SYN-002" },
		};
		mockPrisma.refund.findMany.mockResolvedValue([refund]);
		mockStripe.refunds.retrieve.mockResolvedValue({
			status: "failed",
			failure_reason: "charge_for_pending_refund_disputed",
		});
		mockMapStripeRefundStatus.mockReturnValue("FAILED");

		const result = await reconcilePendingRefunds();

		expect(mockMarkRefundAsFailed).toHaveBeenCalledWith(
			"refund-2",
			"charge_for_pending_refund_disputed"
		);
		expect(result!.updated).toBe(1);
	});

	it("should use 'Unknown failure' when no failure_reason from Stripe", async () => {
		const refund = {
			id: "refund-3",
			stripeRefundId: "re_no_reason",
			status: "APPROVED",
			order: { orderNumber: "SYN-003" },
		};
		mockPrisma.refund.findMany.mockResolvedValue([refund]);
		mockStripe.refunds.retrieve.mockResolvedValue({
			status: "failed",
			failure_reason: null,
		});
		mockMapStripeRefundStatus.mockReturnValue("FAILED");

		await reconcilePendingRefunds();

		expect(mockMarkRefundAsFailed).toHaveBeenCalledWith(
			"refund-3",
			"Unknown failure"
		);
	});

	it("should not update when status has not changed", async () => {
		const refund = {
			id: "refund-4",
			stripeRefundId: "re_same",
			status: "APPROVED",
			order: { orderNumber: "SYN-004" },
		};
		mockPrisma.refund.findMany.mockResolvedValue([refund]);
		mockStripe.refunds.retrieve.mockResolvedValue({
			status: "pending",
		});
		mockMapStripeRefundStatus.mockReturnValue("APPROVED");

		const result = await reconcilePendingRefunds();

		expect(mockUpdateRefundStatus).not.toHaveBeenCalled();
		expect(mockMarkRefundAsFailed).not.toHaveBeenCalled();
		expect(result!.updated).toBe(0);
	});

	it("should count errors when Stripe API fails", async () => {
		const refund = {
			id: "refund-5",
			stripeRefundId: "re_error",
			status: "APPROVED",
			order: { orderNumber: "SYN-005" },
		};
		mockPrisma.refund.findMany.mockResolvedValue([refund]);
		mockStripe.refunds.retrieve.mockRejectedValue(
			new Error("Stripe API error")
		);

		const result = await reconcilePendingRefunds();

		expect(result!.errors).toBe(1);
		expect(result!.updated).toBe(0);
	});

	it("should skip refunds with null stripeRefundId", async () => {
		const refund = {
			id: "refund-6",
			stripeRefundId: null,
			status: "APPROVED",
			order: { orderNumber: "SYN-006" },
		};
		mockPrisma.refund.findMany.mockResolvedValue([refund]);

		const result = await reconcilePendingRefunds();

		expect(mockStripe.refunds.retrieve).not.toHaveBeenCalled();
		expect(result!.checked).toBe(1);
		expect(result!.updated).toBe(0);
	});

	it("should handle mixed results across multiple refunds", async () => {
		const refunds = [
			{
				id: "r-completed",
				stripeRefundId: "re_ok",
				status: "APPROVED",
				order: { orderNumber: "SYN-A" },
			},
			{
				id: "r-failed",
				stripeRefundId: "re_fail",
				status: "APPROVED",
				order: { orderNumber: "SYN-B" },
			},
			{
				id: "r-error",
				stripeRefundId: "re_err",
				status: "APPROVED",
				order: { orderNumber: "SYN-C" },
			},
		];
		mockPrisma.refund.findMany.mockResolvedValue(refunds);
		mockStripe.refunds.retrieve
			.mockResolvedValueOnce({ status: "succeeded" })
			.mockResolvedValueOnce({ status: "failed", failure_reason: "disputed" })
			.mockRejectedValueOnce(new Error("Network error"));
		mockMapStripeRefundStatus
			.mockReturnValueOnce("COMPLETED")
			.mockReturnValueOnce("FAILED");

		const result = await reconcilePendingRefunds();

		expect(result!.checked).toBe(3);
		expect(result!.updated).toBe(2);
		expect(result!.errors).toBe(1);
	});
});
