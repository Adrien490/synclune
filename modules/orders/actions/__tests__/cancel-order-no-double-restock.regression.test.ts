/**
 * @regression STOCK-DOUBLE-CREDIT-001
 *
 * Garantit que `cancelOrder` crée son Refund automatique avec `restock: false`.
 *
 * `cancelOrder` restaure le stock LUI-MÊME, dans sa transaction, quand la commande
 * a réellement décrémenté (`paymentStatus` PAID/PARTIALLY_REFUNDED) et n'est pas
 * encore expédiée (`fulfillmentStatus` UNFULFILLED/PROCESSING). Il crée ensuite un
 * `Refund` APPROVED que l'admin traite via `processRefund` — chemin que le message
 * de succès lui indique explicitement (« à traiter via la fiche remboursement »).
 *
 * Or `processRefund` ré-incrémente tout `RefundItem` à `restock: true`
 * (process-refund.ts:396-455) et sa SEULE garde est `status: APPROVED`, l'état exact
 * dans lequel `cancelOrder` le crée. Le code posait `restock: shouldRestoreStock`,
 * soit le MÊME booléen que le restock inline : le stock était donc crédité DEUX fois
 * (une à l'annulation, une au traitement du remboursement). L'inventaire dépassait
 * alors le physique, et le CHECK `ProductSku_inventory_non_negative` ne borne que le
 * plancher — d'où une survente garantie sur les ventes suivantes, invisible faute de
 * journal `StockMovement` sur les chemins commerce.
 *
 * Contrat du repo : `RefundItem.restock` est la SSOT du crédit côté `processRefund`.
 * Un writer qui restocke lui-même DOIT poser `false` — comme le font déjà
 * `mark-as-fully-refunded.ts`, `refund.service.ts` et `payment-intent.service.ts`.
 * Neutralise aussi le 3e créditeur possible, `reconcile-refunds.service.ts:749`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";

const {
	mockPrisma,
	mockTx,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockCanCancelOrder,
	mockCreateOrderAuditTx,
	mockGetOrderInvalidationTags,
	mockBuildUrl,
	mockSanitizeText,
	mockSendCancelEmail,
	mockVoidInvoice,
} = vi.hoisted(() => {
	const mockTx = {
		order: { findUnique: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
		// P1-1 : le restock lit l'état AVANT crédit (discriminant de réactivation).
		productSku: { update: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
		discountUsage: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
		discount: { update: vi.fn() },
		refund: { create: vi.fn(), aggregate: vi.fn() },
		// ORD-STRIPE-007 : hasOpenDisputeTx compte les entrees d'audit DISPUTE_OPENED
		// vs DISPUTE_RESOLVED (le modele Dispute a ete retire en V1). 0/0 = aucun litige.
		orderHistory: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) },
		// STOCK-LEDGER-001 : `stockMovement.create` est appelé par
		// `recordStockMovementTx` à chaque restock — sans lui, la tx throw.
		stockMovement: { create: vi.fn() },
		// `$queryRaw` sert DEUX usages ici : l'advisory lock (retour ignoré) et le
		// `UPDATE … RETURNING` du restock (retour lu). Un `mockResolvedValue` unique
		// couvre les deux — le lock se moque de ce qu'on lui rend.
		$queryRaw: vi.fn().mockResolvedValue([{ inventory: 7, productId: "prod-1" }]),
	};
	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
		},
		mockRequireAdminWithUser: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockCanCancelOrder: vi.fn().mockReturnValue(true),
		mockCreateOrderAuditTx: vi.fn(),
		mockGetOrderInvalidationTags: vi.fn().mockReturnValue([]),
		mockBuildUrl: vi.fn().mockReturnValue("https://synclune.fr/orders/1"),
		mockSanitizeText: vi.fn((s: string) => s),
		mockSendCancelEmail: vi.fn(),
		mockVoidInvoice: vi.fn(),
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));

vi.mock("next/cache", () => ({
	updateTag: vi.fn(),
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("next/server", () => ({
	after: vi.fn((fn: () => Promise<void>) => fn()),
}));

vi.mock("@sentry/nextjs", () => ({
	withScope: vi.fn(),
	captureMessage: vi.fn(),
}));

vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const original = await importOriginal<typeof SharedActions>();
	return { ...original };
});

vi.mock("@/modules/orders/services/order-status-validation.service", () => ({
	canCancelOrder: mockCanCancelOrder,
}));

vi.mock("@/modules/orders/utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("@/modules/orders/services/void-invoice.service", () => ({
	voidInvoice: mockVoidInvoice,
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
	ORDERS_CACHE_TAGS: { REFUNDS: (orderId: string) => `order-refunds-${orderId}` },
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: mockSendCancelEmail,
}));

vi.mock("@/modules/orders/utils/customer-name", () => ({
	extractCustomerFirstName: vi.fn().mockReturnValue("Client"),
}));

import { cancelOrder } from "../cancel-order";

/** Extrait les `RefundItem` du payload passé à `refund.create`. */
function refundItemsFromCreateCall() {
	const call = mockTx.refund.create.mock.calls[0]?.[0] as
		{ data?: { items?: { create?: Array<{ restock?: boolean }> } } } | undefined;
	return call?.data?.items?.create ?? [];
}

describe("STOCK-DOUBLE-CREDIT-001 — cancelOrder ne délègue jamais le restock à processRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin Test" } });
		mockEnforceRateLimit.mockResolvedValue({ rateLimited: false });
		mockCanCancelOrder.mockReturnValue(true);
		mockTx.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockTx.refund.create.mockResolvedValue({ id: "ref-auto-1" });
		mockTx.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
			cb(mockTx),
		);
	});

	// Le cas du bug : commande PAID non expédiée → cancelOrder restocke inline,
	// donc le Refund qu'il crée ne doit SURTOUT pas redemander un restock.
	it("pose restock:false sur une commande PAID non expédiée, DÉJÀ restockée inline", async () => {
		mockTx.order.findUnique.mockResolvedValue(
			createMockOrder({
				id: VALID_CUID,
				status: "PROCESSING",
				paymentStatus: "PAID",
				fulfillmentStatus: "UNFULFILLED",
				total: 9998,
				items: [
					{ id: "oi-1", skuId: "sku-1", quantity: 2, price: 4999 },
					{ id: "oi-2", skuId: "sku-2", quantity: 1, price: 0 },
				],
			}),
		);

		const result = await cancelOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, autoRefund: "true", reason: "test" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);

		// Le restock inline a bien eu lieu : exactement un mouvement de stock par
		// ligne (STOCK-LEDGER-001), donc un crédit par ligne — pas deux.
		expect(mockTx.stockMovement.create).toHaveBeenCalledTimes(2);
		expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				skuId: "sku-1",
				delta: 2,
				source: "ORDER",
			}),
		});

		// …et AUCUN RefundItem ne redemande ce même crédit à processRefund.
		const items = refundItemsFromCreateCall();
		expect(items).toHaveLength(2);
		expect(items.every((item) => item.restock === false)).toBe(true);
	});

	// L'invariant est inconditionnel : même quand aucun restock inline n'a lieu
	// (articles physiquement sortis), processRefund ne doit pas en fabriquer un.
	it("pose restock:false sur une commande PAID déjà expédiée, NON restockée inline", async () => {
		mockTx.order.findUnique.mockResolvedValue(
			createMockOrder({
				id: VALID_CUID,
				status: "PROCESSING",
				paymentStatus: "PAID",
				fulfillmentStatus: "SHIPPED",
				total: 4999,
				items: [{ id: "oi-1", skuId: "sku-1", quantity: 1, price: 4999 }],
			}),
		);

		const result = await cancelOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, autoRefund: "true", reason: "test" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		// Aucun crédit du tout : ni écriture d'inventaire, ni ligne au journal.
		expect(mockTx.stockMovement.create).not.toHaveBeenCalled();

		const items = refundItemsFromCreateCall();
		expect(items).toHaveLength(1);
		expect(items[0]?.restock).toBe(false);
	});

	// Garde-fou du garde-fou : les deux tests ci-dessus s'appuient sur un mock du
	// payload. Si un refactor déplaçait la construction des RefundItem hors du
	// `refund.create` inspecté, ils passeraient au vert sans rien vérifier. Cette
	// assertion lit la source et interdit littéralement la réintroduction du lien
	// entre le flag de restock et le drapeau du RefundItem.
	it("la source de cancel-order n'associe jamais restock à shouldRestoreStock", () => {
		const source = readFileSync(
			join(process.cwd(), "modules/orders/actions/cancel-order.ts"),
			"utf-8",
		);

		// Le restock inline existe toujours (sinon le stock ne reviendrait jamais).
		expect(source).toMatch(/if \(shouldRestoreStock\)/);
		// Mais le RefundItem est figé à false.
		expect(source).toMatch(/restock:\s*false/);
		expect(source).not.toMatch(/restock:\s*shouldRestoreStock/);
		expect(source).not.toMatch(/restock:\s*stockWasDecremented/);
	});
});
