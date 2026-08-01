/**
 * @regression refund-webhook-saga-in-flight-skip
 *
 * Garde-fou ORD-REFUND-AUDIT-004 : le webhook `refund.updated` doit skip
 * la transition `APPROVED → COMPLETED` quand le SAGA admin (processRefund)
 * est in-flight (Step 2.5 a posé stripeRefundId mais Step 3 n'a pas encore
 * commit). Sans ce guard, le webhook gagne la race et Step 3 abort → restock
 * + audit ADMIN perdus. Critère SAGA in-flight :
 *   status === APPROVED && processedAt === null && (now - updatedAt) < 30s.
 *
 * Depuis P1-C (audit « Admin commandes » 2026-08-01), hors fenêtre SAGA la
 * transition → COMPLETED passe par `finalizeRefundCompletion` (restock + avoir
 * + email + paymentStatus), plus par le `updateRefundStatus` maigre.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockPrisma,
	mockSyncStripeRefunds,
	mockUpdateOrderPaymentStatus,
	mockResolveRefundByStripeId,
	mockMapStripeRefundStatus,
	mockUpdateRefundStatus,
	mockMarkRefundAsFailed,
	mockGetBaseUrl,
	mockFinalizeRefundCompletion,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findFirst: vi.fn(),
			findUnique: vi.fn().mockResolvedValue({ invoiceStatus: null, invoiceNumber: null }),
		},
		refund: {
			findMany: vi.fn().mockResolvedValue([]),
			findFirst: vi.fn().mockResolvedValue(null),
			findUnique: vi.fn().mockResolvedValue(null),
		},
	},
	mockSyncStripeRefunds: vi.fn(),
	mockUpdateOrderPaymentStatus: vi.fn(),
	mockResolveRefundByStripeId: vi.fn(),
	mockMapStripeRefundStatus: vi.fn(),
	mockUpdateRefundStatus: vi.fn(),
	mockMarkRefundAsFailed: vi.fn(),
	mockGetBaseUrl: vi.fn(() => "https://synclune.fr"),
	mockFinalizeRefundCompletion: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("../../services/refund.service", () => ({
	syncStripeRefunds: mockSyncStripeRefunds,
	updateOrderPaymentStatus: mockUpdateOrderPaymentStatus,
	resolveRefundByStripeId: mockResolveRefundByStripeId,
	mapStripeRefundStatus: mockMapStripeRefundStatus,
	updateRefundStatus: mockUpdateRefundStatus,
	markRefundAsFailed: mockMarkRefundAsFailed,
	WEBHOOK_AUDIT_AUTHOR: "Système (webhook Stripe)",
}));
vi.mock("@/modules/orders/constants/cache", async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("@/modules/orders/constants/cache")>();
	return actual;
});
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "ab", ADMIN_ORDERS_LIST: "aol" },
}));
vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: {
		ACCOUNT: { ORDER_DETAIL: (n: string) => `/o/${n}` },
		ADMIN: { REFUNDS: "/admin/r" },
	},
}));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));
vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: vi.fn().mockResolvedValue({ kind: "noop", reason: "no-active-invoice" }),
}));
vi.mock("@/modules/refunds/services/issue-credit-note.service", () => ({
	issueCreditNoteForRefund: vi.fn().mockResolvedValue({ kind: "noop", reason: "missing" }),
}));
vi.mock("../../constants/webhook.constants", () => ({ SYSTEM_AUTHOR_ID: "system" }));
vi.mock("@/modules/refunds/services/finalize-refund.service", () => ({
	finalizeRefundCompletion: mockFinalizeRefundCompletion,
}));
vi.mock("@sentry/nextjs", () => ({
	captureMessage: vi.fn(),
	captureException: vi.fn(),
	withScope: (
		cb: (s: {
			setLevel: () => void;
			setTag: () => void;
			setFingerprint: () => void;
			setContext: () => void;
		}) => void,
	) => cb({ setLevel: () => {}, setTag: () => {}, setFingerprint: () => {}, setContext: () => {} }),
}));
vi.mock("@/app/generated/prisma/client", () => ({
	HistorySource: { WEBHOOK: "WEBHOOK" },
	InvoiceStatus: { GENERATED: "GENERATED" },
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		FAILED: "FAILED",
		CANCELLED: "CANCELLED",
	},
}));

import { handleRefundUpdated } from "../refund-handlers";

function makeStripeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "re_stripe_123",
		status: "succeeded",
		metadata: {},
		...overrides,
	} as Parameters<typeof handleRefundUpdated>[0];
}

describe("@regression refund-webhook-saga-in-flight-skip — ORD-REFUND-AUDIT-004", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMapStripeRefundStatus.mockReturnValue("COMPLETED");
		mockFinalizeRefundCompletion.mockResolvedValue({
			finalized: true,
			isFullyRefunded: false,
			restockedSkuIds: [],
			tags: ["refunds-list"],
		});
	});

	it("skips updateRefundStatus when SAGA admin in-flight (APPROVED + processedAt=null + updatedAt<30s)", async () => {
		const justUpdated = new Date(Date.now() - 5_000); // 5s ago, well within grace window
		mockResolveRefundByStripeId.mockResolvedValue({
			id: "refund-1",
			status: "APPROVED",
			amount: 5000,
			reason: "OTHER",
			orderId: "order-1",
			processedAt: null,
			updatedAt: justUpdated,
			order: {
				id: "order-1",
				orderNumber: "SYN-001",
				customerEmail: "c@x.com",
				stripePaymentIntentId: "pi_x",
			},
		});

		const result = await handleRefundUpdated(makeStripeRefund({ status: "succeeded" }));

		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("SAGA admin in-flight");
		expect(mockUpdateRefundStatus).not.toHaveBeenCalled();
		expect(mockFinalizeRefundCompletion).not.toHaveBeenCalled();
	});

	it("does NOT skip when refund.status is COMPLETED (already finalized, no SAGA risk)", async () => {
		mockResolveRefundByStripeId.mockResolvedValue({
			id: "refund-2",
			status: "COMPLETED",
			amount: 5000,
			reason: "OTHER",
			orderId: "order-1",
			processedAt: new Date(),
			updatedAt: new Date(),
			order: {
				id: "order-1",
				orderNumber: "SYN-001",
				customerEmail: null,
				stripePaymentIntentId: null,
			},
		});
		mockMapStripeRefundStatus.mockReturnValue("COMPLETED");

		const result = await handleRefundUpdated(makeStripeRefund({ status: "succeeded" }));

		expect(result.success).toBe(true);
		expect(result.skipped).toBeUndefined();
		expect(mockUpdateRefundStatus).not.toHaveBeenCalled(); // status already COMPLETED → no transition
	});

	it("does NOT skip when SAGA window expired (updatedAt > 30s ago, cron territory)", async () => {
		const stale = new Date(Date.now() - 60_000); // 60s ago, past grace window
		mockResolveRefundByStripeId.mockResolvedValue({
			id: "refund-3",
			status: "APPROVED",
			amount: 5000,
			reason: "OTHER",
			orderId: "order-1",
			processedAt: null,
			updatedAt: stale,
			order: {
				id: "order-1",
				orderNumber: "SYN-001",
				customerEmail: null,
				stripePaymentIntentId: null,
			},
		});

		const result = await handleRefundUpdated(makeStripeRefund({ status: "succeeded" }));

		expect(result.skipped).toBeUndefined();
		// P1-C : hors fenêtre SAGA, la transition → COMPLETED déroule la
		// finalisation COMPLÈTE (restock + avoir + email), pas le update maigre.
		expect(mockFinalizeRefundCompletion).toHaveBeenCalledWith(
			expect.objectContaining({ refundId: "refund-3", source: "WEBHOOK" }),
		);
		expect(mockUpdateRefundStatus).not.toHaveBeenCalled();
	});

	it("does NOT skip when processedAt is set (SAGA already past Step 3)", async () => {
		mockResolveRefundByStripeId.mockResolvedValue({
			id: "refund-4",
			status: "APPROVED",
			amount: 5000,
			reason: "OTHER",
			orderId: "order-1",
			processedAt: new Date(),
			updatedAt: new Date(),
			order: {
				id: "order-1",
				orderNumber: "SYN-001",
				customerEmail: null,
				stripePaymentIntentId: null,
			},
		});

		const result = await handleRefundUpdated(makeStripeRefund({ status: "succeeded" }));

		expect(result.skipped).toBeUndefined();
		expect(mockFinalizeRefundCompletion).toHaveBeenCalledWith(
			expect.objectContaining({ refundId: "refund-4" }),
		);
	});
});
