import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOrderCount } = vi.hoisted(() => ({
	mockOrderCount: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: { count: mockOrderCount },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
}));

vi.mock("@/app/generated/prisma/client", () => ({
	OrderStatus: { PROCESSING: "PROCESSING", SHIPPED: "SHIPPED" },
	PaymentStatus: { PAID: "PAID", PENDING: "PENDING" },
}));

import { fetchDashboardActionItems } from "../get-action-items";

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardActionItems", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockOrderCount.mockResolvedValue(0);
	});

	it("returns zero counts when nothing is pending", async () => {
		const result = await fetchDashboardActionItems();

		expect(result).toEqual({
			stuckProcessing: 0,
			stuckShipped: 0,
			stuckInvoices: 0,
			orphanPending: 0,
		});
	});

	it("maps each count to the right field (Promise.all order)", async () => {
		// order.count call order: stuckProcessing, stuckShipped, stuckInvoices, orphanPending
		// (le compteur `overbilledOrders` a été retiré — audit du module orders
		// 2026-08-05 : il ne s'éteignait qu'au clic d'un bouton de maintenance.)
		mockOrderCount
			.mockResolvedValueOnce(2)
			.mockResolvedValueOnce(3)
			.mockResolvedValueOnce(4)
			.mockResolvedValueOnce(5);

		const result = await fetchDashboardActionItems();

		expect(result).toEqual({
			stuckProcessing: 2,
			stuckShipped: 3,
			stuckInvoices: 4,
			orphanPending: 5,
		});
		expect(mockOrderCount).toHaveBeenCalledTimes(4);
	});

	it("scope chaque compteur aux commandes non supprimées", async () => {
		await fetchDashboardActionItems();

		// `notDeleted` sur CHAQUE compteur, pas seulement le premier : un compteur
		// qui l'oublierait ferait remonter des commandes soft-deleted dans
		// « À traiter », sans aucun moyen de les en sortir.
		for (const call of mockOrderCount.mock.calls) {
			expect(call[0].where.deletedAt).toBeNull();
		}
	});
});
