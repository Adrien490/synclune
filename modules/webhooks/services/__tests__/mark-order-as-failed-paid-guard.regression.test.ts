/**
 * @regression mark-order-as-failed-paid-guard (audit webhooks 2026-07-02, F1)
 *
 * Lock-in : `markOrderAsFailed` ne doit JAMAIS rétrograder une commande
 * PAID/REFUNDED/PARTIALLY_REFUNDED vers FAILED. L'ancienne implémentation
 * (findFirst snapshot + update inconditionnel, seule garde `=== "FAILED"`)
 * laissait deux brèches :
 *  1. un appelant passant un ordre PAID (payment_failed hors-ordre) écrasait
 *     la commande payée (FAILED + CANCELLED + discount libéré) ;
 *  2. fenêtre read-committed : un `payment_intent.succeeded` concurrent
 *     commitant PAID entre la lecture et l'écriture était écrasé.
 * La garde est désormais ATOMIQUE : `updateMany` conditionnel
 * `paymentStatus: { in: ["PENDING", "EXPIRED"] }` — le prédicat est ré-évalué
 * au lock de ligne. Un blocage PAID→FAILED remonte en Sentry warning (ce chemin
 * ne doit jamais se produire : bug appelant ou race à investiguer).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockTx,
	mockPrisma,
	mockReleaseOrderDiscountUsageTx,
	mockUpdateTag,
	mockSentryWithScope,
	mockSentryCaptureMessage,
	mockScope,
} = vi.hoisted(() => {
	const mockTx = {
		order: {
			findFirst: vi.fn(),
			updateMany: vi.fn(),
		},
		orderHistory: {
			create: vi.fn(),
		},
	};
	const mockScope = {
		setTag: vi.fn(),
		setLevel: vi.fn(),
		setFingerprint: vi.fn(),
		setContext: vi.fn(),
	};
	return {
		mockTx,
		mockPrisma: { $transaction: vi.fn() },
		mockReleaseOrderDiscountUsageTx: vi.fn().mockResolvedValue([]),
		mockUpdateTag: vi.fn(),
		mockSentryWithScope: vi.fn((cb: (scope: typeof mockScope) => void) => cb(mockScope)),
		mockSentryCaptureMessage: vi.fn(),
		mockScope,
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: mockSentryWithScope,
	captureMessage: mockSentryCaptureMessage,
	captureException: vi.fn(),
	addBreadcrumb: vi.fn(),
	startSpan: vi.fn(),
}));

vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminRefundFailedAlert: vi.fn(),
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: vi.fn().mockReturnValue("https://synclune.fr"),
	ROUTES: { ADMIN: { ORDER_DETAIL: (id: string) => `/admin/${id}` } },
}));

vi.mock("@/modules/discounts/services/release-order-discount-usage.service", () => ({
	releaseOrderDiscountUsageTx: mockReleaseOrderDiscountUsageTx,
}));

vi.mock("@/modules/discounts/constants/cache", () => ({
	DISCOUNT_CACHE_TAGS: { USAGE: (id: string) => `discount-usage-${id}` },
}));

vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));

import { markOrderAsFailed } from "../payment-intent.service";

const FAILURE_DETAILS = {
	code: "card_declined",
	declineCode: null,
	message: null,
};

describe("[regression] markOrderAsFailed — garde atomique anti-PAID", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReleaseOrderDiscountUsageTx.mockResolvedValue([]);
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
	});

	it("PAID → écriture bloquée (count 0) : pas de release discount, pas d'audit, Sentry warning", async () => {
		mockTx.order.findFirst
			// Snapshot initial (PAID — l'appelant a raté sa propre garde)
			.mockResolvedValueOnce({ status: "PROCESSING", paymentStatus: "PAID" })
			// Relecture de classification après count 0
			.mockResolvedValueOnce({ paymentStatus: "PAID" });
		mockTx.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await markOrderAsFailed("order-paid", "pi_stale", FAILURE_DETAILS);

		expect(result).toEqual({ transitioned: false });
		expect(mockReleaseOrderDiscountUsageTx).not.toHaveBeenCalled();
		expect(mockTx.orderHistory.create).not.toHaveBeenCalled();
		expect(mockUpdateTag).not.toHaveBeenCalled();
		// Visibilité : ce chemin ne doit jamais fire en prod → Sentry warning.
		expect(mockScope.setLevel).toHaveBeenCalledWith("warning");
		expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
			expect.stringContaining("PAID→FAILED transition blocked"),
		);
	});

	it("race read-committed : snapshot PENDING mais succeeded commit avant l'update → count 0, aucune écriture", async () => {
		mockTx.order.findFirst
			.mockResolvedValueOnce({ status: "PENDING", paymentStatus: "PENDING" })
			.mockResolvedValueOnce({ paymentStatus: "PAID" });
		// Le prédicat ré-évalué au lock de ligne voit PAID → 0 ligne touchée.
		mockTx.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await markOrderAsFailed("order-race", "pi_race", FAILURE_DETAILS);

		expect(result).toEqual({ transitioned: false });
		expect(mockReleaseOrderDiscountUsageTx).not.toHaveBeenCalled();
		expect(mockTx.orderHistory.create).not.toHaveBeenCalled();
	});

	it("FAILED → skip idempotent silencieux (pas de Sentry)", async () => {
		mockTx.order.findFirst.mockResolvedValue({ status: "CANCELLED", paymentStatus: "FAILED" });

		const result = await markOrderAsFailed("order-failed", "pi_x", FAILURE_DETAILS);

		expect(result).toEqual({ transitioned: false });
		expect(mockTx.order.updateMany).not.toHaveBeenCalled();
		expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
	});

	it("PENDING (contrôle) → transition + release discount + audit, prédicat PENDING/EXPIRED dans le WHERE", async () => {
		mockTx.order.findFirst.mockResolvedValue({ status: "PENDING", paymentStatus: "PENDING" });
		mockTx.order.updateMany.mockResolvedValue({ count: 1 });
		mockReleaseOrderDiscountUsageTx.mockResolvedValue(["disc_1"]);

		const result = await markOrderAsFailed("order-ok", "pi_ok", FAILURE_DETAILS);

		expect(result).toEqual({ transitioned: true });
		expect(mockTx.order.updateMany).toHaveBeenCalledWith({
			where: {
				id: "order-ok",
				paymentStatus: { in: ["PENDING", "EXPIRED"] },
				deletedAt: null,
			},
			data: expect.objectContaining({
				paymentStatus: "FAILED",
				status: "CANCELLED",
			}),
		});
		expect(mockReleaseOrderDiscountUsageTx).toHaveBeenCalledWith(mockTx, "order-ok");
		expect(mockTx.orderHistory.create).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("discount-usage-disc_1");
		expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
	});
});
