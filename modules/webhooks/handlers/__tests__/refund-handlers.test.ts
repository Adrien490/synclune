import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

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
			// EINV-CREDIT-001 : refund-handlers boucle sur les Refunds COMPLETED
			// sans creditNoteNumber pour émettre l'avoir (cf refund-handlers.ts:128-153).
			// Tableau vide par défaut → boucle no-op pour les tests qui ne ciblent pas
			// ce chemin. Tests dédiés (issue-credit-note) overrident cette valeur.
			findMany: vi.fn().mockResolvedValue([]),
			// Path email post-voidInvoice (refund-handlers.ts:198-217) lit le dernier
			// Refund COMPLETED pour résoudre creditNoteNumber. Null par défaut → email
			// envoyé sans creditNoteNumber (rétro-compat tests sans avoir).
			findFirst: vi.fn().mockResolvedValue(null),
			// ORD-REFUND-AUDIT-007 : lookup Refund local par stripeRefundId pour
			// aligner l'idempotencyKey email avec l'admin side. Null par défaut
			// → fallback charge-based idempotencyKey (legacy behaviour préservé).
			findUnique: vi.fn().mockResolvedValue(null),
		},
	},
	mockSyncStripeRefunds: vi.fn(),
	mockUpdateOrderPaymentStatus: vi.fn(),
	mockResolveRefundByStripeId: vi.fn(),
	mockMapStripeRefundStatus: vi.fn(),
	mockUpdateRefundStatus: vi.fn(),
	mockMarkRefundAsFailed: vi.fn(),
	mockGetBaseUrl: vi.fn(),
	mockFinalizeRefundCompletion: vi.fn().mockResolvedValue({
		finalized: true,
		isFullyRefunded: false,
		restockedSkuIds: [],
		tags: ["refunds-list", "order-refunds-order-1"],
	}),
}));

vi.mock("@/modules/refunds/services/ensure-credit-note-archived.service", () => ({
	// EINV-CREDIT-020 : archivage eager best-effort post-avoir — mocke pour ne
	// pas tirer la chaîne UploadThing (UTApi server-only) en test unitaire.
	ensureRefundCreditNoteArchived: vi.fn().mockResolvedValue("archived"),
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

// P1-C (audit 2026-08-01) : la transition → COMPLETED passe par le service de
// finalisation partagé (restock + avoir + email), plus par updateRefundStatus.
vi.mock("@/modules/refunds/services/finalize-refund.service", () => ({
	finalizeRefundCompletion: mockFinalizeRefundCompletion,
}));

vi.mock("@/modules/orders/constants/cache", async (importOriginal) => {
	// CACHE-AUDIT-003/006 : vrai helper getOrderInvalidationTags + tags DETAIL/HISTORY.
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("@/modules/orders/constants/cache")>();
	return actual;
});

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_BADGES: "admin-badges",
		ADMIN_ORDERS_LIST: "admin-orders-list",
	},
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
	},
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	// `buildUrl` + `SHOP.ORDER_TRACKING` : requis depuis que le lien client passe
	// par `buildOrderTrackingUrl` (retrait de l'espace client 2026-07-31) — un mock
	// sans eux fait échouer le module à l'import, pas à l'assertion.
	buildUrl: (path: string) => `https://synclune.fr${path}`,
	ROUTES: {
		SHOP: { ORDER_TRACKING: "/suivi-commande" },
		ADMIN: {
			REFUNDS: "/admin/ventes/remboursements",
		},
	},
}));

// Mock stripe to avoid API key requirement from transitive imports
vi.mock("@/shared/lib/stripe", () => ({
	stripe: {},
}));

// Audit F4 (2026-07-02) : capture de l'alerte over-refund (montant remboursé
// Stripe > total + trop-perçu). withScope exécute le callback avec un scope
// factice pour que setTag/setContext ne throw pas.
const mockSentryCaptureMessage = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({
	withScope: (cb: (scope: unknown) => void) =>
		cb({
			setLevel: vi.fn(),
			setTag: vi.fn(),
			setFingerprint: vi.fn(),
			setContext: vi.fn(),
		}),
	captureMessage: mockSentryCaptureMessage,
	captureException: vi.fn(),
	// shared/lib/logger.ts pousse un breadcrumb Sentry sur warn/error.
	addBreadcrumb: vi.fn(),
}));

// Mock voidInvoice (ORD-COMPLY-003 — cycle VOIDED post charge.refunded)
// EINV-CREDIT-008 (2026-05-28) : discriminated union remplace `Result | null`.
vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: vi.fn().mockResolvedValue({ kind: "noop", reason: "no-active-invoice" }),
}));

import type Stripe from "stripe";
import { handleChargeRefunded, handleRefundUpdated, handleRefundFailed } from "../refund-handlers";

// ============================================================================
// Fixtures
// ============================================================================

function makeCharge(overrides: Record<string, unknown> = {}) {
	return {
		id: "ch_123",
		payment_intent: "pi_456",
		amount_refunded: 5000,
		refunds: { data: [{ id: "re_1", reason: "requested_by_customer" }] },
		...overrides,
	} as unknown as Stripe.Charge;
}

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: "order-1",
		orderNumber: "SYN-001",
		total: 10000,
		paymentStatus: "PAID",
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		userId: "user-1",
		refunds: [],
		...overrides,
	};
}

function makeStripeRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "re_stripe_123",
		status: "succeeded",
		failure_reason: null,
		metadata: { refund_id: "refund-db-1" },
		...overrides,
	} as unknown as Stripe.Refund;
}

function makeRefundRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: "refund-db-1",
		status: "APPROVED",
		amount: 5000,
		orderId: "order-1",
		// ORD-REFUND-AUDIT-004 : guard SAGA in-flight skip si APPROVED+null+<30s.
		// Par défaut on fixe processedAt non-null pour que les anciens tests
		// (status change handling) ne soient pas accidentellement skippés.
		processedAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
		order: {
			id: "order-1",
			orderNumber: "SYN-001",
			customerEmail: "client@example.com",
			stripePaymentIntentId: "pi_456",
		},
		...overrides,
	};
}

// ============================================================================
// handleChargeRefunded
// ============================================================================

describe("handleChargeRefunded", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
	});

	it("should throw when no payment_intent on charge", async () => {
		const charge = makeCharge({ payment_intent: null });

		await expect(handleChargeRefunded(charge)).rejects.toThrow(
			"No payment intent found for refunded charge",
		);
	});

	it("should skip (success) when order not found", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(null);

		const result = await handleChargeRefunded(makeCharge());

		expect(result).toEqual({ success: true, skipped: true, reason: "Order not found" });
	});

	it("should handle payment_intent as string", async () => {
		const order = makeOrder();
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		await handleChargeRefunded(makeCharge({ payment_intent: "pi_456" }));

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stripePaymentIntentId: "pi_456", deletedAt: null },
			}),
		);
	});

	it("should handle payment_intent as object", async () => {
		const order = makeOrder();
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		await handleChargeRefunded(makeCharge({ payment_intent: { id: "pi_789" } }));

		expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stripePaymentIntentId: "pi_789", deletedAt: null },
			}),
		);
	});

	it("should call syncStripeRefunds with correct args", async () => {
		const charge = makeCharge();
		const order = makeOrder({ refunds: [{ id: "r1" }] });
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		await handleChargeRefunded(charge);

		expect(mockSyncStripeRefunds).toHaveBeenCalledWith(charge, order.refunds, order.id);
	});

	it("should call updateOrderPaymentStatus with correct amount", async () => {
		const order = makeOrder();
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });

		await handleChargeRefunded(makeCharge({ amount_refunded: 10000 }));

		expect(mockUpdateOrderPaymentStatus).toHaveBeenCalledWith("order-1", 10000, 10000);
	});

	// Audit F4 (montant Stripe vs commande, 2026-07-02) : sur-remboursement =
	// cumul remboursé Stripe > order.total + trop-perçu connu → alerte Sentry.
	it("[F4] alerts (Sentry) when total refunded exceeds order.total + overbilled amount", async () => {
		const order = makeOrder({ total: 10000, overbilledAmountCents: 500 });
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });

		await handleChargeRefunded(makeCharge({ amount_refunded: 11000 }));

		expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
			expect.stringContaining("Over-refund"),
			"error",
		);
	});

	it("[F4] does NOT alert when total refunded equals order.total + overbilled amount", async () => {
		const order = makeOrder({ total: 10000, overbilledAmountCents: 500 });
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });

		await handleChargeRefunded(makeCharge({ amount_refunded: 10500 }));

		expect(mockSentryCaptureMessage).not.toHaveBeenCalledWith(
			expect.stringContaining("Over-refund"),
			expect.anything(),
		);
	});

	it("[F4] does NOT alert on a full refund without overbilling", async () => {
		const order = makeOrder({ total: 10000, overbilledAmountCents: null });
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });

		await handleChargeRefunded(makeCharge({ amount_refunded: 10000 }));

		expect(mockSentryCaptureMessage).not.toHaveBeenCalledWith(
			expect.stringContaining("Over-refund"),
			expect.anything(),
		);
	});

	/**
	 * Les tags user-scopés ont disparu avec les data fns qu'ils invalidaient
	 * (`getUserOrders`, `getLastOrder`), retirées avec l'espace client (2026-07-31).
	 *
	 * Ce test remplace la paire « inclut le tag userId » / « ne l'inclut pas si
	 * userId est null ». La seconde était verte pour la mauvaise raison :
	 * `expect(tags).not.toContain(expect.stringContaining("orders-user-"))` compare
	 * le matcher asymétrique par identité aux éléments du tableau — il ne le trouve
	 * jamais, donc `not.toContain` passe quel que soit le contenu réel. Ici on
	 * itère explicitement.
	 */
	it("n'émet aucun tag user-scopé, même sur une commande qui porte encore un userId", async () => {
		const order = makeOrder({ userId: "user-1" });
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		const result = await handleChargeRefunded(makeCharge());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask?.type).toBe("INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags.some((t) => t.startsWith("orders-user-"))).toBe(false);
			expect(cacheTask.tags.some((t) => t.startsWith("last-order-user-"))).toBe(false);
			// CACHE-AUDIT-003 : le détail commande reflète paymentStatus=REFUNDED.
			expect(cacheTask.tags).toContain("order-detail-order-1");
			expect(cacheTask.tags).toContain("order-refunds-order-1");
		}
	});

	it("should build email task with correct data", async () => {
		const order = makeOrder();
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		const result = await handleChargeRefunded(makeCharge());

		const emailTask = result.tasks?.find((t) => t.type === "REFUND_CONFIRMATION_EMAIL");
		expect(emailTask).toBeDefined();
		if (emailTask?.type === "REFUND_CONFIRMATION_EMAIL") {
			expect(emailTask.data.to).toBe("client@example.com");
			expect(emailTask.data.orderNumber).toBe("SYN-001");
		}
	});

	it("should not build email task when customerEmail is absent", async () => {
		const order = makeOrder({ customerEmail: null });
		mockPrisma.order.findFirst.mockResolvedValue(order);
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		const result = await handleChargeRefunded(makeCharge());

		const emailTask = result.tasks?.find((t) => t.type === "REFUND_CONFIRMATION_EMAIL");
		expect(emailTask).toBeUndefined();
	});
});

// ============================================================================
// handleRefundUpdated
// ============================================================================

describe("handleRefundUpdated", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should skip when refund not found in DB", async () => {
		mockResolveRefundByStripeId.mockResolvedValue(null);

		const result = await handleRefundUpdated(makeStripeRefund());

		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Refund not found in database",
		});
	});

	it("should not update when status has not changed", async () => {
		const refund = makeRefundRecord({ status: "COMPLETED" });
		mockResolveRefundByStripeId.mockResolvedValue(refund);
		mockMapStripeRefundStatus.mockReturnValue("COMPLETED");

		const result = await handleRefundUpdated(makeStripeRefund({ status: "succeeded" }));

		expect(mockUpdateRefundStatus).not.toHaveBeenCalled();
		expect(result).toEqual({ success: true });
	});

	it("should run the full finalization when status transitions to COMPLETED (P1-C)", async () => {
		const refund = makeRefundRecord({ status: "APPROVED" });
		mockResolveRefundByStripeId.mockResolvedValue(refund);
		mockMapStripeRefundStatus.mockReturnValue("COMPLETED");

		const result = await handleRefundUpdated(makeStripeRefund({ status: "succeeded" }));

		// Finalisation COMPLÈTE (restock + avoir + email + paymentStatus) via le
		// service partagé — updateRefundStatus (status seul) recréerait le trou P1-C.
		expect(mockFinalizeRefundCompletion).toHaveBeenCalledWith(
			expect.objectContaining({ refundId: "refund-db-1", source: "WEBHOOK" }),
		);
		expect(mockUpdateRefundStatus).not.toHaveBeenCalled();
		expect(result.success).toBe(true);
		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("order-refunds-order-1");
		}
	});

	it("should use metadata.refund_id for lookup", async () => {
		mockResolveRefundByStripeId.mockResolvedValue(null);

		await handleRefundUpdated(makeStripeRefund({ metadata: { refund_id: "db-refund-99" } }));

		expect(mockResolveRefundByStripeId).toHaveBeenCalledWith("re_stripe_123", "db-refund-99");
	});
});

// ============================================================================
// handleRefundFailed
// ============================================================================

describe("handleRefundFailed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
	});

	it("should skip when refund not found in DB", async () => {
		mockResolveRefundByStripeId.mockResolvedValue(null);

		const result = await handleRefundFailed(makeStripeRefund());

		expect(result).toEqual({
			success: true,
			skipped: true,
			reason: "Refund not found in database",
		});
	});

	it("should call markRefundAsFailed with failure_reason", async () => {
		const refund = makeRefundRecord();
		mockResolveRefundByStripeId.mockResolvedValue(refund);
		mockMarkRefundAsFailed.mockResolvedValue(undefined);

		await handleRefundFailed(makeStripeRefund({ failure_reason: "expired_or_canceled_card" }));

		expect(mockMarkRefundAsFailed).toHaveBeenCalledWith("refund-db-1", "expired_or_canceled_card");
	});

	it("should use 'unknown' when no failure_reason", async () => {
		const refund = makeRefundRecord();
		mockResolveRefundByStripeId.mockResolvedValue(refund);
		mockMarkRefundAsFailed.mockResolvedValue(undefined);

		await handleRefundFailed(makeStripeRefund({ failure_reason: null }));

		expect(mockMarkRefundAsFailed).toHaveBeenCalledWith("refund-db-1", "unknown");
	});

	it("should build admin alert task with correct data", async () => {
		const refund = makeRefundRecord();
		mockResolveRefundByStripeId.mockResolvedValue(refund);
		mockMarkRefundAsFailed.mockResolvedValue(undefined);

		const result = await handleRefundFailed(
			makeStripeRefund({ failure_reason: "lost_or_stolen_card" }),
		);

		const alertTask = result.tasks?.find((t) => t.type === "ADMIN_REFUND_FAILED_ALERT");
		expect(alertTask).toBeDefined();
		if (alertTask?.type === "ADMIN_REFUND_FAILED_ALERT") {
			expect(alertTask.data.orderNumber).toBe("SYN-001");
			expect(alertTask.data.amount).toBe(5000);
			expect(alertTask.data.errorMessage).toContain("lost_or_stolen_card");
			expect(alertTask.data.dashboardUrl).toBe("https://synclune.fr/admin/ventes/remboursements");
		}
	});

	it("should return cache invalidation tags", async () => {
		const refund = makeRefundRecord();
		mockResolveRefundByStripeId.mockResolvedValue(refund);
		mockMarkRefundAsFailed.mockResolvedValue(undefined);

		const result = await handleRefundFailed(makeStripeRefund());

		const cacheTask = result.tasks?.find((t) => t.type === "INVALIDATE_CACHE");
		expect(cacheTask).toBeDefined();
		if (cacheTask?.type === "INVALIDATE_CACHE") {
			expect(cacheTask.tags).toContain("order-refunds-order-1");
		}
	});
});
