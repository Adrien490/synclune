/**
 * @regression charge-refunded-partial-then-total
 *
 * Saga refund partiel → total : la séquence (partiel × N puis total) NE DOIT
 * générer qu'UN SEUL avoir (déclenché par le webhook total final). Si le
 * branchement est cassé, on émettrait un avoir par webhook → séquence
 * A-YYYY-NNNNN gap-free explose + double comptabilisation.
 *
 * EINV-TEST-009 — verrouille l'invariant "1 saga refund = 1 avoir max".
 *
 * Architecture rappel (refund-handlers.ts:94-125) :
 *   if (isFullyRefunded) {
 *     const invoiceState = await prisma.order.findUnique(...)
 *     if (invoiceState.invoiceStatus === GENERATED) {
 *       await voidInvoice(...)
 *     }
 *   }
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
	mockVoidInvoice,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
		},
		refund: {
			// EINV-CREDIT-001 : boucle issueCreditNoteForRefund sur Refunds COMPLETED
			// sans creditNoteNumber (refund-handlers.ts:128-153). Tableau vide par
			// défaut → ne déclenche pas la boucle dans cette suite focalisée voidInvoice.
			findMany: vi.fn().mockResolvedValue([]),
			// Path email (refund-handlers.ts:198-217) lit le dernier Refund COMPLETED
			// pour résoudre creditNoteNumber. Null par défaut suffit ici.
			findFirst: vi.fn().mockResolvedValue(null),
			// ORD-REFUND-AUDIT-007 : lookup Refund local par stripeRefundId pour
			// aligner l'idempotencyKey email. Null par défaut → fallback charge-based.
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
	mockVoidInvoice: vi.fn(),
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
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		USER_ORDERS: (userId: string) => `orders-user-${userId}`,
		REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges", ADMIN_ORDERS_LIST: "admin-orders-list" },
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: mockGetBaseUrl,
	ROUTES: {
		ACCOUNT: { ORDER_DETAIL: (n: string) => `/commandes/${n}` },
		ADMIN: { REFUNDS: "/admin/ventes/remboursements" },
	},
}));

vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));

vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));

import type Stripe from "stripe";
import { handleChargeRefunded } from "../refund-handlers";

const ORDER_TOTAL = 10000;
const ORDER_ID = "order-saga-1";
const PI_ID = "pi_saga_001";
const INVOICE_NUMBER = "F-2026-00777";

function makeCharge(amount_refunded: number, suffix: string) {
	return {
		id: `ch_saga_${suffix}`,
		payment_intent: PI_ID,
		amount_refunded,
		refunds: { data: [{ id: `re_saga_${suffix}`, reason: "requested_by_customer" }] },
	} as unknown as Stripe.Charge;
}

function makeOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: ORDER_ID,
		orderNumber: "SYN-2026-7777",
		total: ORDER_TOTAL,
		paymentStatus: "PAID",
		customerEmail: "client@example.com",
		customerName: "Client Saga",
		userId: "user-saga-1",
		refunds: [],
		...overrides,
	};
}

describe("@regression charge-refunded-partial-then-total — EINV-TEST-009", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetBaseUrl.mockReturnValue("https://synclune.fr");
		mockSyncStripeRefunds.mockResolvedValue(undefined);
		mockVoidInvoice.mockResolvedValue({
			kind: "voided",
			creditNoteNumber: "A-2026-00007",
			creditNoteGeneratedAt: new Date(),
			invoiceVoidedAt: new Date(),
		});
	});

	it("saga 3 partiels (2000+3000+1000) puis total final → voidInvoice appelé 1× au total", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());

		// 3 webhooks partiels
		mockUpdateOrderPaymentStatus
			.mockResolvedValueOnce({ isFullyRefunded: false })
			.mockResolvedValueOnce({ isFullyRefunded: false })
			.mockResolvedValueOnce({ isFullyRefunded: false })
			.mockResolvedValueOnce({ isFullyRefunded: true }); // total final

		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "GENERATED",
			invoiceNumber: INVOICE_NUMBER,
		});

		await handleChargeRefunded(makeCharge(2000, "p1"));
		await handleChargeRefunded(makeCharge(5000, "p2"));
		await handleChargeRefunded(makeCharge(6000, "p3"));
		await handleChargeRefunded(makeCharge(10000, "total"));

		expect(mockVoidInvoice).toHaveBeenCalledTimes(1);
		expect(mockVoidInvoice).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: ORDER_ID,
				source: "WEBHOOK",
				reason: "Avoir émis suite à remboursement total Stripe",
			}),
		);
	});

	it("2 webhooks total successifs même refundId → voidInvoice appelé 1× (idempotence via lookup invoiceStatus)", async () => {
		// On simule directement le replay total → total (sans partials qui parasitent
		// le path email + findUnique). Order avec refund déjà présent en local
		// → dashboardRefundDetected=false → pas de findUnique email path.
		mockPrisma.order.findFirst.mockResolvedValue(
			makeOrder({
				refunds: [
					{
						id: "refund-local-1",
						amount: 10000,
						status: "COMPLETED",
						stripeRefundId: "re_saga_total",
						reason: "CUSTOMER_REQUEST",
						processedAt: new Date(),
					},
				],
			}),
		);

		mockUpdateOrderPaymentStatus
			.mockResolvedValueOnce({ isFullyRefunded: true })
			.mockResolvedValueOnce({ isFullyRefunded: true }); // replay

		// 1er total : GENERATED → voidInvoice fire
		// Replay : VOIDED → court-circuité
		mockPrisma.order.findUnique
			.mockResolvedValueOnce({ invoiceStatus: "GENERATED", invoiceNumber: INVOICE_NUMBER })
			.mockResolvedValueOnce({ invoiceStatus: "VOIDED", invoiceNumber: INVOICE_NUMBER });

		await handleChargeRefunded(makeCharge(10000, "total"));
		await handleChargeRefunded(makeCharge(10000, "total"));

		expect(mockVoidInvoice).toHaveBeenCalledTimes(1);
	});

	it("webhook total direct (sans saga partielle préalable) → voidInvoice appelé 1×", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "GENERATED",
			invoiceNumber: INVOICE_NUMBER,
		});

		await handleChargeRefunded(makeCharge(10000, "direct"));

		expect(mockVoidInvoice).toHaveBeenCalledTimes(1);
	});

	it("saga partiels uniquement (jamais total) → voidInvoice JAMAIS appelé", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: false });

		await handleChargeRefunded(makeCharge(2500, "p1"));
		await handleChargeRefunded(makeCharge(5000, "p2"));
		await handleChargeRefunded(makeCharge(7500, "p3"));

		expect(mockVoidInvoice).not.toHaveBeenCalled();
	});

	it("total mais facture invoiceStatus=PENDING (race ensureInvoice pas encore tourné) → voidInvoice NOT called", async () => {
		mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
		mockUpdateOrderPaymentStatus.mockResolvedValue({ isFullyRefunded: true });
		mockPrisma.order.findUnique.mockResolvedValue({
			invoiceStatus: "PENDING",
			invoiceNumber: null,
		});

		await handleChargeRefunded(makeCharge(10000, "total-no-invoice"));

		expect(mockVoidInvoice).not.toHaveBeenCalled();
	});
});
