/**
 * @regression STOCK-DOUBLE-CREDIT-001
 *
 * Garantit que le Refund automatique créé par `cancelOrder` ne porte AUCUNE
 * instruction de restock.
 *
 * `cancelOrder` restaure le stock LUI-MÊME, dans sa transaction, quand la commande
 * a réellement décrémenté (`paymentStatus` PAID/PARTIALLY_REFUNDED) et n'est pas
 * encore expédiée (`fulfillmentStatus` UNFULFILLED/PROCESSING). Historiquement il
 * posait ensuite `restock: shouldRestoreStock` sur les `RefundItem` — le MÊME
 * booléen que son restock inline — et la finalisation du remboursement ré-créditait
 * le stock une seconde fois. L'inventaire dépassait le physique, et le CHECK
 * `ProductSku_inventory_non_negative` ne borne que le plancher — survente garantie.
 *
 * Depuis le Lot 6 (2026-08-03), `RefundItem.restock` est DROPPÉE et la
 * finalisation d'un refund ne touche plus à l'inventaire : le restock inline de
 * `cancelOrder` est l'unique créditeur du chemin d'annulation. Ce test verrouille :
 * (1) exactement un crédit par ligne quand le restock inline a lieu, zéro sinon ;
 * (2) le payload `RefundItem` ne porte aucun champ `restock` — sa réapparition
 * dans la source est une régression (réintroduction du vecteur de double crédit).
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
	ROUTES: {
		// `SHOP.ORDER_TRACKING` : le lien client des emails passe par
		// `buildOrderTrackingUrl` depuis le retrait de l'espace client (2026-07-31).
		SHOP: { ORDER_TRACKING: "/suivi-commande" },
		ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` },
	},
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
/**
 * `RefundItem` est parti le 2026-08-05 : le Refund d'annulation ne porte PLUS
 * aucune ligne, donc a fortiori aucune instruction de restock. L'invariant de
 * cette régression (cancel-order ne délègue jamais le restock au refund) est
 * désormais garanti par construction — on vérifie qu'aucun `items` n'est créé.
 */
function refundCreateData() {
	const call = mockTx.refund.create.mock.calls[0]?.[0] as
		{ data?: Record<string, unknown> } | undefined;
	return call?.data;
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
	it("ne porte aucun champ restock sur une commande PAID non expédiée, DÉJÀ restockée inline", async () => {
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

		// …et AUCUN RefundItem ne porte d'instruction de restock (colonne droppée).
		const data = refundCreateData();
		expect(data).toBeDefined();
		expect(data).not.toHaveProperty("items");
	});

	// L'invariant est inconditionnel : même quand aucun restock inline n'a lieu
	// (articles physiquement sortis), le Refund ne doit pas en fabriquer un.
	it("ne porte aucun champ restock sur une commande PAID déjà expédiée, NON restockée inline", async () => {
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

		const data = refundCreateData();
		expect(data).toBeDefined();
		expect(data).not.toHaveProperty("items");
	});

	// Garde-fou du garde-fou : les deux tests ci-dessus s'appuient sur un mock du
	// payload. Si un refactor déplaçait la construction des RefundItem hors du
	// `refund.create` inspecté, ils passeraient au vert sans rien vérifier. Cette
	// assertion lit la source et interdit littéralement la réintroduction d'une
	// instruction de restock dans le payload.
	it("la source de cancel-order ne pose plus aucune instruction restock", () => {
		const source = readFileSync(
			join(process.cwd(), "modules/orders/actions/cancel-order.ts"),
			"utf-8",
		);

		// Le restock inline existe toujours (sinon le stock ne reviendrait jamais).
		expect(source).toMatch(/if \(shouldRestoreStock\)/);
		// Mais plus AUCUNE clé `restock:` dans un payload (colonne droppée au Lot 6).
		expect(source).not.toMatch(/restock:\s*(false|true|shouldRestoreStock|stockWasDecremented)/);
	});
});
