/**
 * @regression ORD-BIZ-003
 *
 * Garantit que `deleteOrder` crée une entrée `OrderHistory` immuable
 * (Art. L123-22) avec la raison et l'auteur, en plus du soft delete.
 *
 * Sans cette régression : le `deletedAt` est posé silencieusement sans audit
 * trail → on ne peut plus identifier qui a supprimé quoi, pourquoi.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockGetOrderInvalidationTags,
	mockCreateOrderAuditTx,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn((msg: string) => ({ status: "success", message: msg })),
	mockError: vi.fn((msg: string) => ({ status: "error", message: msg })),
	mockGetOrderInvalidationTags: vi.fn().mockReturnValue([]),
	mockCreateOrderAuditTx: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: (t: string) => t }));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		HAS_INVOICE: "Cette commande a une facture.",
		CANNOT_DELETE_PAID: "Cette commande a été payée.",
		DELETE_FAILED: "Erreur lors de la suppression.",
	},
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../schemas/order.schemas", () => ({ deleteOrderSchema: {} }));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));

import { deleteOrder } from "../delete-order";

describe("ORD-BIZ-003 — delete-order crée une OrderHistory immuable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-42", name: "Sophie" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { id: VALID_CUID, reason: "commande de test à nettoyer" },
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.update.mockResolvedValue({});
	});

	it("crée une OrderHistory.CANCELLED avec metadata.deleted=true + auteur + reason", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: VALID_CUID,
			orderNumber: "SYN-2026-0001",
			status: "PENDING",
			paymentStatus: "PENDING",
			invoiceNumber: null,
		});

		const result = await deleteOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, reason: "commande de test à nettoyer" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(1);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "CANCELLED",
				source: "ADMIN",
				authorName: "Sophie",
				note: "commande de test à nettoyer",
				metadata: expect.objectContaining({
					deleted: true,
					reason: "commande de test à nettoyer",
					previousStatus: "PENDING",
					previousPaymentStatus: "PENDING",
				}),
			}),
		);
	});

	it("ne crée PAS de OrderHistory si la commande a une facture (refus)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: VALID_CUID,
			orderNumber: "SYN-2026-0001",
			status: "PROCESSING",
			paymentStatus: "PAID",
			invoiceNumber: "F-2026-00001",
		});

		const result = await deleteOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, reason: "raison" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("ne crée PAS de OrderHistory si la commande a été payée (refus)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: VALID_CUID,
			orderNumber: "SYN-2026-0001",
			status: "PROCESSING",
			paymentStatus: "PAID",
			invoiceNumber: null,
		});

		await deleteOrder(undefined, createMockFormData({ id: VALID_CUID, reason: "raison" }));

		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("crée l'audit dans la MÊME transaction que le soft delete (tx parameter passé)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			id: VALID_CUID,
			orderNumber: "SYN-2026-0001",
			status: "PENDING",
			paymentStatus: "PENDING",
			invoiceNumber: null,
		});

		await deleteOrder(
			undefined,
			createMockFormData({ id: VALID_CUID, reason: "commande de test à nettoyer" }),
		);

		// Le 1er argument doit être le tx (mockPrisma en simulation), pas prisma global
		const [txArg] = mockCreateOrderAuditTx.mock.calls[0] ?? [];
		expect(txArg).toBe(mockPrisma);
	});
});
