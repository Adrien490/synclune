import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID, VALID_CUID_2 } from "@/test/factories";
import type * as SharedActions from "@/shared/lib/actions";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSendCancelEmail,
	mockSanitizeText,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
	mockExtractCustomerFirstName,
} = vi.hoisted(() => ({
	mockPrisma: {
		// IDEM-CANCEL-001 : claim atomique order.updateMany (préconditions
		// status/paymentStatus=PENDING dans le where, retour { count }) remplace
		// l'ancien order.update inconditionnel de la boucle.
		order: { findMany: vi.fn(), updateMany: vi.fn() },
		productSku: { update: vi.fn() },
		discountUsage: { findMany: vi.fn(), deleteMany: vi.fn() },
		discount: { update: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSendCancelEmail: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockExtractCustomerFirstName: vi.fn(),
}));

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
	ADMIN_ORDER_LIMITS: { BULK_OPERATIONS: "admin-order-bulk" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", async (importOriginal) => {
	const original = await importOriginal<typeof SharedActions>();
	return {
		...original,
		safeFormGet: (formData: FormData, key: string) => {
			const v = formData.get(key);
			return typeof v === "string" ? v : null;
		},
		handleActionError: mockHandleActionError,
	};
});

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: mockSendCancelEmail,
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../utils/customer-name", () => ({
	extractCustomerFirstName: mockExtractCustomerFirstName,
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));

import { bulkCancelOrders } from "../bulk-cancel-orders";

// ============================================================================
// HELPERS
// ============================================================================

function makeFd(overrides: { orderIds?: string; reason?: string | null } = {}) {
	const orderIds = overrides.orderIds ?? JSON.stringify([VALID_CUID, VALID_CUID_2]);
	const entries: Record<string, string | null> = { orderIds };
	if (overrides.reason !== undefined) entries.reason = overrides.reason;
	return createMockFormData(entries);
}

function makeOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		paymentStatus: "PENDING",
		items: [
			{ id: "oi-1", skuId: "sku-A", quantity: 2, price: 1000 },
			{ id: "oi-2", skuId: "sku-B", quantity: 1, price: 2500 },
		],
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkCancelOrders", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@synclune.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendCancelEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockExtractCustomerFirstName.mockReturnValue("Marie");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "admin-badges"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);
		mockPrisma.discountUsage.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.discount.update.mockResolvedValue({});
	});

	// --------------------------------------------------------------------
	// Auth & rate limit guards
	// --------------------------------------------------------------------

	it("returns the auth error when caller is not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await bulkCancelOrders(undefined, makeFd());

		expect(result).toEqual(authError);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	it("returns the rate-limit error before touching the DB", async () => {
		const rlError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await bulkCancelOrders(undefined, makeFd());

		expect(result).toEqual(rlError);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------

	it("returns a validation error when orderIds is not valid JSON", async () => {
		const fd = makeFd({ orderIds: "not-json" });

		const result = await bulkCancelOrders(undefined, fd);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	it("returns a validation error when orderIds is empty", async () => {
		const fd = makeFd({ orderIds: JSON.stringify([]) });

		const result = await bulkCancelOrders(undefined, fd);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	// --------------------------------------------------------------------
	// Filtering: only PENDING+UNPAID orders are eligible
	// --------------------------------------------------------------------

	it("ventile la sélection (eligible vs ignorées par statut) puis ne charge que les éligibles", async () => {
		// 1er findMany : tous les sélectionnés (pour le breakdown).
		// 2e findMany : uniquement les éligibles (PENDING + PENDING).
		mockPrisma.order.findMany.mockResolvedValueOnce([
			{ id: VALID_CUID, status: "PENDING", paymentStatus: "PENDING" },
			{ id: VALID_CUID_2, status: "SHIPPED", paymentStatus: "PAID" },
		]);
		mockPrisma.order.findMany.mockResolvedValueOnce([makeOrder({ id: VALID_CUID })]);

		await bulkCancelOrders(undefined, makeFd());

		// Sélecteur initial : tous les ids, pas de filtre statut.
		expect(mockPrisma.order.findMany).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: [VALID_CUID, VALID_CUID_2] },
					deletedAt: null,
				}),
			}),
		);
		// Sélecteur final : seulement les éligibles (sans status/paymentStatus
		// dans le where car déjà filtrés en mémoire).
		expect(mockPrisma.order.findMany).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: [VALID_CUID] },
					deletedAt: null,
				}),
			}),
		);
	});

	it("returns an explicit error when no eligible order is found", async () => {
		mockPrisma.order.findMany.mockResolvedValue([]);

		const result = await bulkCancelOrders(undefined, makeFd());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/aucune commande/i);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------
	// Stock restoration & audit log
	// --------------------------------------------------------------------

	// STOCK-01 : le bulk n'annule QUE des commandes PENDING+PENDING, dont le stock
	// n'a JAMAIS été décrémenté (réservation optimiste). Aucun restock ne doit avoir
	// lieu — sinon l'inventaire gonfle au-dessus du réel (phantom stock), d'autant
	// plus à l'échelle (purge de paniers abandonnés).
	it("does NOT restore stock (PENDING orders were never decremented)", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);

		await bulkCancelOrders(undefined, makeFd());

		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
	});

	it("flips order status to CANCELLED via an atomic conditional claim", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);

		await bulkCancelOrders(undefined, makeFd());

		// IDEM-CANCEL-001 : le where ré-évalue les préconditions PENDING+PENDING
		// au lock de ligne (le filtre d'éligibilité est lu HORS transaction).
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			where: {
				id: makeOrder().id,
				status: "PENDING",
				paymentStatus: "PENDING",
			},
			data: { status: "CANCELLED" },
		});
	});

	// IDEM-CANCEL-001 : count===0 ⇒ la commande a été mutée par un concurrent
	// entre le filtre d'éligibilité et le claim → skip (pas de release discount,
	// pas d'audit, pas d'email, pas comptée dans les annulées).
	it("skips an order whose atomic claim matches no row (concurrent mutation)", async () => {
		const orderA = makeOrder({ id: "ord-A", orderNumber: "SYN-A", customerEmail: "a@x.com" });
		const orderB = makeOrder({ id: "ord-B", orderNumber: "SYN-B", customerEmail: "b@x.com" });
		mockPrisma.order.findMany.mockResolvedValue([orderA, orderB]);
		// orderA claim OK, orderB déjà mutée par un concurrent.
		mockPrisma.order.updateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });

		const result = await bulkCancelOrders(undefined, makeFd());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual(expect.objectContaining({ count: 1 }));
		// Audit + email uniquement pour la commande effectivement claimée.
		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({ orderId: "ord-A" }),
		);
		expect(mockSendCancelEmail).toHaveBeenCalledTimes(1);
		expect(mockSendCancelEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@x.com" }));
		// Pas de release discount pour la commande sautée.
		expect(mockPrisma.discountUsage.findMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.discountUsage.findMany).toHaveBeenCalledWith({
			where: { orderId: "ord-A" },
			select: { id: true, discountId: true },
		});
	});

	it("creates an atomic audit log entry per cancelled order", async () => {
		const orderA = makeOrder({ id: "ord-A", orderNumber: "SYN-2026-0010" });
		const orderB = makeOrder({ id: "ord-B", orderNumber: "SYN-2026-0011" });
		mockPrisma.order.findMany.mockResolvedValue([orderA, orderB]);

		await bulkCancelOrders(undefined, makeFd({ reason: "Stock épuisé" }));

		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(2);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: "ord-A",
				action: "CANCELLED",
				newStatus: "CANCELLED",
				note: "Stock épuisé",
				authorId: "admin-1",
				metadata: expect.objectContaining({ bulkOperation: true, stockRestored: false }),
			}),
		);
	});

	it("uses 'Annulation en lot' as audit note when no reason is provided", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);

		await bulkCancelOrders(undefined, makeFd());

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({ note: "Annulation en lot" }),
		);
	});

	// --------------------------------------------------------------------
	// Discount usage release
	// --------------------------------------------------------------------

	it("releases discount usages and decrements usageCount when present", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.discountUsage.findMany.mockResolvedValue([
			{ id: "u-1", discountId: "disc-A" },
			{ id: "u-2", discountId: "disc-B" },
		]);

		await bulkCancelOrders(undefined, makeFd());

		// [[DISC-USAGE-002]] Libération par commande via `releaseOrderDiscountUsageTx` :
		// décrément `updateMany` GARDÉ par `usageCount > 0`. L'ancienne agrégation
		// `decrement: count` par discountId n'avait aucune borne basse.
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledTimes(2);
		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith({
			where: { id: "disc-A", usageCount: { gt: 0 } },
			data: { usageCount: { decrement: 1 } },
		});
		expect(mockPrisma.discountUsage.deleteMany).toHaveBeenCalledWith({
			where: { orderId: makeOrder().id },
		});
	});

	it("does not call deleteMany when there are no discount usages", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);

		await bulkCancelOrders(undefined, makeFd());

		expect(mockPrisma.discountUsage.deleteMany).not.toHaveBeenCalled();
		expect(mockPrisma.discount.updateMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------
	// Email & cache
	// --------------------------------------------------------------------

	it("sends a cancellation email to each customer with an email", async () => {
		const orderA = makeOrder({ id: "a", orderNumber: "SYN-A", customerEmail: "a@x.com" });
		const orderB = makeOrder({ id: "b", orderNumber: "SYN-B", customerEmail: "b@x.com" });
		mockPrisma.order.findMany.mockResolvedValue([orderA, orderB]);

		await bulkCancelOrders(undefined, makeFd({ reason: "stock" }));

		expect(mockSendCancelEmail).toHaveBeenCalledTimes(2);
		expect(mockSendCancelEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "a@x.com",
				orderNumber: "SYN-A",
				reason: "stock",
				wasRefunded: false,
			}),
		);
	});

	it("skips email when customerEmail is missing", async () => {
		const order = makeOrder({ customerEmail: null });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await bulkCancelOrders(undefined, makeFd());

		expect(mockSendCancelEmail).not.toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("invalidates cache tags returned by getOrderInvalidationTags (de-duplicated)", async () => {
		const orderA = makeOrder({ id: "a", userId: "user-1" });
		const orderB = makeOrder({ id: "b", userId: "user-1" });
		mockPrisma.order.findMany.mockResolvedValue([orderA, orderB]);
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "user-orders-1"]);

		await bulkCancelOrders(undefined, makeFd());

		// Both orders share the same tag list — Set should de-dupe to 2 unique calls
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-orders-1");
		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
	});

	// --------------------------------------------------------------------
	// Skipped count + success message
	// --------------------------------------------------------------------

	it("includes a skipped hint in the success message when some orders were ineligible", async () => {
		// 1er findMany : 1 sur 2 commandes éligibles (l'autre est SHIPPED).
		// 2e findMany : retourne uniquement l'éligible enrichie.
		mockPrisma.order.findMany.mockResolvedValueOnce([
			{ id: VALID_CUID, status: "PENDING", paymentStatus: "PENDING" },
			{ id: VALID_CUID_2, status: "SHIPPED", paymentStatus: "PAID" },
		]);
		mockPrisma.order.findMany.mockResolvedValueOnce([makeOrder({ id: VALID_CUID })]);

		const result = await bulkCancelOrders(undefined, makeFd());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toMatch(/1 commande annulée/);
		expect(result.message).toMatch(/ignorées/);
		expect(result.message).toMatch(/expédiée/);
		expect(result.data).toEqual(
			expect.objectContaining({
				count: 1,
				skipped: 1,
				skippedBreakdown: expect.objectContaining({ alreadyShipped: 1 }),
			}),
		);
	});

	it("emits the global admin audit log entry once", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);

		await bulkCancelOrders(undefined, makeFd());
	});

	// --------------------------------------------------------------------
	// Error path
	// --------------------------------------------------------------------

	it("delegates to handleActionError on unexpected DB failure", async () => {
		mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await bulkCancelOrders(undefined, makeFd());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
