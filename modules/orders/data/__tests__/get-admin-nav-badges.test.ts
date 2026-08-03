import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		order: { count: vi.fn() },
		refund: { count: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}));

// Enums complets sur les membres consommés par le prédicat SSOT `buildToShipWhereClause`
// (via SHIPPABLE_PAYMENT_STATUSES) : un membre manquant se propageait en `undefined`
// dans le `in: [...]` au lieu d'échouer franchement.
vi.mock("@/app/generated/prisma/client", () => ({
	FulfillmentStatus: { UNFULFILLED: "UNFULFILLED", PROCESSING: "PROCESSING" },
	OrderStatus: { CANCELLED: "CANCELLED" },
	PaymentStatus: {
		PAID: "PAID",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	},
	RefundStatus: { FAILED: "FAILED", COMPLETED: "COMPLETED" },
}));

import { getAdminNavBadges } from "../get-admin-nav-badges";

// ============================================================================
// Tests
// ============================================================================

describe("getAdminNavBadges", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns counts keyed by NavItem.id (orders + refunds)", async () => {
		mockPrisma.order.count.mockResolvedValue(3);
		mockPrisma.refund.count.mockResolvedValue(2);

		const result = await getAdminNavBadges();

		expect(result).toEqual({ orders: 3, refunds: 2 });
	});

	/**
	 * Le prédicat vient du SSOT `buildToShipWhereClause()` — partagé avec le KPI
	 * « À expédier » du tableau de bord. Les deux divergeaient (PAID+UNFULFILLED ici,
	 * SHIPPABLE+{UNFULFILLED,PROCESSING} là-bas) et affichaient donc deux nombres
	 * différents sur le même écran.
	 */
	it("compte la file « à expédier » via le prédicat SSOT partagé avec le KPI", async () => {
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(0);

		await getAdminNavBadges();

		expect(mockPrisma.order.count).toHaveBeenCalledWith({
			where: {
				deletedAt: null,
				// Une commande partiellement remboursée reste à expédier.
				paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
				// « En préparation » n'est pas « expédié ».
				fulfillmentStatus: { in: ["UNFULFILLED", "PROCESSING"] },
				status: { not: "CANCELLED" },
			},
		});
	});

	// Lot 2 S3.3 : PENDING n'a plus aucun producteur (workflow d'approbation
	// supprimé). L'actionnable est « à rattraper » : échec Stripe, ou avoir
	// manquant sur commande facturée — le périmètre du bouton reconcile-refunds.
	it("counts refunds needing attention (FAILED or missing credit note)", async () => {
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(0);

		await getAdminNavBadges();

		expect(mockPrisma.refund.count).toHaveBeenCalledWith({
			where: {
				OR: [
					{ status: "FAILED" },
					{
						status: "COMPLETED",
						creditNoteNumber: null,
						order: { invoiceNumber: { not: null } },
					},
				],
			},
		});
	});

	it("tags the cache with ADMIN_BADGES for invalidation", async () => {
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(0);

		await getAdminNavBadges();

		expect(mockCacheTag).toHaveBeenCalledWith("admin-badges");
	});
});
