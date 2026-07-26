import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";

/**
 * @regression idem-cancel-001-concurrent-cancel
 *
 * Audit idempotence 2026-07-02 (P0-1) — double restock + Refund APPROVED en
 * double sur annulations concurrentes.
 *
 * Bug verrouillé : `cancelOrder` lisait la commande par `findUnique` (sans
 * FOR UPDATE), testait `canCancelOrder` sur la valeur lue, puis appliquait un
 * `update` SANS précondition de statut. Deux invocations concurrentes
 * (double-clic, 2 onglets) lisaient toutes deux l'état pré-annulation en
 * read-committed : la 2ᵉ ré-appliquait l'annulation → inventaire ré-incrémenté
 * 2× (phantom stock) + 2ᵉ Refund APPROVED du solde total (commande remboursée
 * à 200 % en compta si les deux étaient traités, `charge_already_refunded`
 * étant mappé succès).
 *
 * Fix : advisory lock `acquireOrderPaidLockTx` AVANT le findUnique (sérialise
 * aussi contre le webhook PAID) + claim `updateMany` conditionnel sur
 * (status, paymentStatus) lus — count===0 ⇒ abort AVANT restock/Refund/audit.
 */

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockCanCancelOrder,
	mockCreateOrderAuditTx,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), updateMany: vi.fn() },
		productSku: { update: vi.fn() },
		orderHistory: { create: vi.fn() },
		discountUsage: { findMany: vi.fn(), deleteMany: vi.fn() },
		discount: { update: vi.fn() },
		refund: { create: vi.fn(), aggregate: vi.fn() },
		dispute: { findFirst: vi.fn() },
		$queryRaw: vi.fn(),
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockCanCancelOrder: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: vi.fn(),
}));

vi.mock("../../services/order-status-validation.service", () => ({
	canCancelOrder: mockCanCancelOrder,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../services/void-invoice.service", () => ({
	voidInvoice: vi.fn().mockResolvedValue({ kind: "noop", reason: "no-active-invoice" }),
}));

vi.mock("../../schemas/order.schemas", () => ({
	cancelOrderSchema: {
		safeParse: vi.fn().mockReturnValue({
			success: true,
			data: { id: VALID_CUID, reason: undefined, autoRefund: true },
		}),
	},
}));

import { cancelOrder } from "../cancel-order";

describe("@regression IDEM-CANCEL-001 — annulations admin concurrentes", () => {
	beforeEach(() => {
		// clearAllMocks (pas reset) : préserve le mockReturnValue du safeParse
		// configuré dans la factory du vi.mock.
		vi.clearAllMocks();
		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCanCancelOrder.mockReturnValue(true);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.$queryRaw.mockResolvedValue([]);
		mockPrisma.dispute.findFirst.mockResolvedValue(null);
		mockPrisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({
				status: "PENDING",
				paymentStatus: "PAID",
				fulfillmentStatus: "UNFULFILLED",
				items: [{ id: "item-1", skuId: "sku-1", quantity: 2, price: 1000 }],
			}),
		);
	});

	it("prend l'advisory lock AVANT le findUnique (sérialisation vs webhook PAID + double-clic)", async () => {
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.create.mockResolvedValue({ id: "refund-1" });

		await cancelOrder(undefined, createMockFormData({ id: VALID_CUID, autoRefund: "true" }));

		const lockOrder = mockPrisma.$queryRaw.mock.invocationCallOrder[0];
		const readOrder = mockPrisma.order.findUnique.mock.invocationCallOrder[0];
		expect(lockOrder).toBeDefined();
		expect(lockOrder!).toBeLessThan(readOrder!);
	});

	it("claim PERDU (count 0) ⇒ AUCUN restock, AUCUN Refund créé, AUCUN audit, erreur explicite", async () => {
		// Un concurrent a muté la commande entre notre lecture et notre écriture
		// (writer sans advisory lock) : le prédicat (status, paymentStatus) du
		// claim, ré-évalué au lock de ligne, ne matche plus.
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await cancelOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, autoRefund: "true" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("modifiée par une autre opération");
		// Les effets financiers du bug d'origine ne se produisent plus :
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled(); // pas de 2ᵉ restock
		expect(mockPrisma.refund.create).not.toHaveBeenCalled(); // pas de Refund doublon
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled(); // pas de 2ᵉ audit CANCELLED
	});

	it("le claim porte les préconditions (status + paymentStatus lus) dans le WHERE", async () => {
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.refund.create.mockResolvedValue({ id: "refund-1" });

		await cancelOrder(undefined, createMockFormData({ id: VALID_CUID, autoRefund: "true" }));

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: "PENDING", paymentStatus: "PAID" }),
				data: expect.objectContaining({ status: "CANCELLED" }),
			}),
		);
	});
});
