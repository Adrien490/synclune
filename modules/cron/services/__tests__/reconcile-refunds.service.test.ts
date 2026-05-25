import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockStripe, mockGetStripeClient, mockCanTransition, mockCaptureRefundError } =
	vi.hoisted(() => ({
		mockPrisma: {
			refund: {
				findMany: vi.fn(),
				findUnique: vi.fn(),
				updateMany: vi.fn(),
				aggregate: vi.fn(),
			},
			order: { update: vi.fn() },
			$transaction: vi.fn(),
		},
		mockStripe: {
			refunds: { retrieve: vi.fn() },
		},
		mockGetStripeClient: vi.fn(),
		mockCanTransition: vi.fn(() => true),
		mockCaptureRefundError: vi.fn(),
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

vi.mock("@/modules/refunds/services/refund-state-machine.service", () => ({
	canTransition: mockCanTransition,
}));

vi.mock("@/modules/refunds/utils/capture-refund-error", () => ({
	captureRefundError: mockCaptureRefundError,
}));

import { reconcileRefunds } from "../reconcile-refunds.service";
import { THRESHOLDS } from "@/modules/cron/constants/limits";

function buildCandidate(overrides: Partial<{ id: string; stripeRefundId: string }> = {}) {
	return {
		id: overrides.id ?? "refund-1",
		stripeRefundId: overrides.stripeRefundId ?? "re_test_1",
		amount: 2000,
		orderId: "order-1",
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			total: 5000,
			userId: "user-1",
		},
	};
}

describe("reconcileRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-02-09T12:00:00Z"));
		mockGetStripeClient.mockReturnValue(mockStripe);
		mockPrisma.refund.findMany.mockResolvedValue([]);
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
			fn(mockPrisma),
		);
		mockCanTransition.mockReturnValue(true);
	});

	it("returns skipped result with STRIPE_KEY_MISSING when Stripe is not configured", async () => {
		mockGetStripeClient.mockReturnValue(null);

		const result = await reconcileRefunds();

		expect(result).toEqual({
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		});
	});

	it("returns zero counts when no candidates exist", async () => {
		const result = await reconcileRefunds();

		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 0, hasMore: false });
	});

	it("queries refunds with APPROVED status, stripeRefundId set, processedAt null, in 7d window", async () => {
		await reconcileRefunds();

		const call = mockPrisma.refund.findMany.mock.calls[0]![0];
		expect(call.where.status).toBe("APPROVED");
		expect(call.where.stripeRefundId).toEqual({ not: null });
		expect(call.where.processedAt).toBeNull();
		expect(call.where.deletedAt).toBeNull();

		const sevenDays = 7 * 24 * 60 * 60 * 1000;
		const expectedMaxAge = new Date(Date.now() - sevenDays);
		const expectedMinAge = new Date(Date.now() - THRESHOLDS.REFUND_RECONCILE_MIN_AGE_MS);
		expect(call.where.createdAt.gte.getTime()).toBe(expectedMaxAge.getTime());
		expect(call.where.createdAt.lt.getTime()).toBe(expectedMinAge.getTime());
	});

	it("finalises a refund to COMPLETED when Stripe says succeeded (partial refund → PARTIALLY_REFUNDED)", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });

		const result = await reconcileRefunds();

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: "refund-1", status: "APPROVED" },
			data: expect.objectContaining({
				status: "COMPLETED",
				processedAt: expect.any(Date),
			}),
		});
		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "PARTIALLY_REFUNDED" },
		});
		expect(result).toMatchObject({ processed: 1, errored: 0, skipped: 0 });
	});

	it("flags the order as REFUNDED when totalRefunded reaches orderTotal", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

		await reconcileRefunds();

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { paymentStatus: "REFUNDED" },
		});
	});

	it("marks refund FAILED locally when Stripe says failed", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({
			status: "failed",
			failure_reason: "expired_or_canceled_card",
		});
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });

		const result = await reconcileRefunds();

		expect(mockPrisma.refund.updateMany).toHaveBeenCalledWith({
			where: { id: "refund-1", status: "APPROVED" },
			data: { status: "FAILED", failureReason: "expired_or_canceled_card" },
		});
		expect(result).toMatchObject({ processed: 1, errored: 0, skipped: 0 });
	});

	it("skips pending refunds (the webhook will pick them up)", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "pending" });

		const result = await reconcileRefunds();

		expect(mockPrisma.refund.updateMany).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
	});

	it("skips refund with null stripeRefundId without calling Stripe", async () => {
		const candidate = buildCandidate();
		mockPrisma.refund.findMany.mockResolvedValue([{ ...candidate, stripeRefundId: null }]);

		const result = await reconcileRefunds();

		expect(mockStripe.refunds.retrieve).not.toHaveBeenCalled();
		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
	});

	it("counts as skipped when the optimistic guard misses (concurrent webhook reconciliation race)", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([buildCandidate()]);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "succeeded" });
		// Simulates the webhook beating the cron : `status: APPROVED` no longer matches.
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.refund.findUnique.mockResolvedValue({ status: "COMPLETED" });
		mockCanTransition.mockReturnValue(false);

		const result = await reconcileRefunds();

		expect(result).toMatchObject({ processed: 0, errored: 0, skipped: 1 });
	});

	it("captures and counts a Stripe API error as errored without aborting the batch", async () => {
		mockPrisma.refund.findMany.mockResolvedValue([
			buildCandidate({ id: "r1", stripeRefundId: "re_err" }),
			buildCandidate({ id: "r2", stripeRefundId: "re_ok" }),
		]);
		mockStripe.refunds.retrieve
			.mockRejectedValueOnce(new Error("Stripe 502"))
			.mockResolvedValueOnce({ status: "succeeded" });
		mockPrisma.refund.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });

		const result = await reconcileRefunds();

		expect(mockCaptureRefundError).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({ processed: 1, errored: 1, skipped: 0 });
	});

	it("flags hasMore: true when BATCH_SIZE_MEDIUM (25) candidates are returned", async () => {
		const candidates = Array.from({ length: 25 }, (_, i) =>
			buildCandidate({ id: `r${i}`, stripeRefundId: `re_${i}` }),
		);
		mockPrisma.refund.findMany.mockResolvedValue(candidates);
		mockStripe.refunds.retrieve.mockResolvedValue({ status: "pending" });

		const result = await reconcileRefunds();

		expect(result.hasMore).toBe(true);
	});
});
