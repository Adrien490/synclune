/**
 * @regression returned-absorbing-state
 *
 * `RETURNED` était un état ABSORBANT (différé de l'audit « Livraison et
 * tracking » 2026-07-26, fermé le 2026-08-01) : `markAsReturned` laisse
 * `status = DELIVERED`, et toutes les sorties existantes exigeaient SHIPPED
 * ou bloquaient DELIVERED — un retour saisi par erreur était irréversible par
 * l'UI et verrouillait définitivement l'édition d'adresse.
 *
 * `canUndoReturn` n'est PAS mocké : la garde réelle est le maillon testé.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";
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
	mockCreateOrderAuditTx,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
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

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
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
		handleActionError: mockHandleActionError,
	};
});

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));

import { undoReturn } from "../undo-return";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

// Paire cohérente : l'état exact que `markAsReturned` produit.
function makeReturnedOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		// Ex-paire (DELIVERED, RETURNED) : axe unique depuis le Lot 4.
		status: "RETURNED",
		paymentStatus: "PAID",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("undoReturn", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@synclune.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(makeReturnedOrder());
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
	});

	// Auth
	it("returns the auth error when caller is not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await undoReturn(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns the rate-limit error before touching the DB", async () => {
		const rlError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await undoReturn(undefined, validFormData);

		expect(result).toEqual(rlError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Validation
	it("returns a validation error for an invalid id", async () => {
		const fd = createMockFormData({ id: "not-a-cuid" });

		const result = await undoReturn(undefined, fd);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Order not found
	it("returns NOT_FOUND when the order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await undoReturn(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// Real guard: not returned
	it("refuses when fulfillment is not RETURNED (real canUndoReturn)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeReturnedOrder({ status: "DELIVERED" }));

		const result = await undoReturn(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/retournée/);
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	it("refuses when order.status is not DELIVERED (real canUndoReturn)", async () => {
		// Paire incohérente en base (ne devrait pas exister) : la garde refuse
		// plutôt que d'écrire un état encore plus incohérent.
		mockPrisma.order.findUnique.mockResolvedValue(makeReturnedOrder({ status: "SHIPPED" }));

		const result = await undoReturn(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	// Happy path
	it("flips status back to DELIVERED with the atomic guard", async () => {
		await undoReturn(undefined, validFormData);

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			// Garde atomique : ré-asserte (DELIVERED, RETURNED) — miroir de canUndoReturn
			where: {
				id: VALID_CUID,
				deletedAt: null,
				// Garde atomique : ré-asserte RETURNED (axe unique, Lot 4).
				status: "RETURNED",
			},
			data: { status: "DELIVERED" },
		});
	});

	// Concurrent change
	it("aborts without audit when the atomic guard matches no row", async () => {
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await undoReturn(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/autre opération/);
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
	});

	// Audit — pas de nouvelle valeur d'enum OrderAction (type Postgres baseliné) :
	// on réutilise STATUS_REVERTED + note explicite.
	it("records a STATUS_REVERTED audit entry inside the transaction", async () => {
		await undoReturn(undefined, validFormData);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "STATUS_REVERTED",
				previousStatus: "RETURNED",
				newStatus: "DELIVERED",
			}),
		);
	});

	// Cache invalidation
	it("invalidates order cache tags after success", async () => {
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "order-detail-1"]);

		const result = await undoReturn(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("order-detail-1");
	});

	// Error path
	it("delegates to handleActionError on unexpected DB exceptions", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await undoReturn(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
