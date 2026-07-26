import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import {
	createMockFormData,
	createMockOrder,
	VALID_CUID,
	VALID_USER_ID,
	VALID_SKU_ID,
} from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockSendCancelEmail,
	mockCreateOrderAuditTx,
	mockGetOrderInvalidationTags,
	mockBuildUrl,
} = vi.hoisted(() => ({
	mockPrisma: {
		// IDEM-CANCEL-001 : claim atomique order.updateMany (précondition
		// status=PENDING dans le where, retour { count }) remplace order.update.
		order: { findUnique: vi.fn(), updateMany: vi.fn() },
		productSku: { update: vi.fn() },
		orderHistory: { create: vi.fn() },
		discountUsage: { findMany: vi.fn(), deleteMany: vi.fn() },
		discount: { update: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSendCancelEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockBuildUrl: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ORDER_CANCEL_LIMIT: "order-cancel",
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	handleActionError: mockHandleActionError,
}));

vi.mock("@/modules/emails/services/status-emails", () => ({
	sendCancelOrderConfirmationEmail: mockSendCancelEmail,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));

vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_CANCELLED: "Cette commande est deja annulee.",
		CANCEL_FAILED: "Erreur lors de l'annulation de la commande.",
	},
}));

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));

import { cancelOrderCustomer } from "../cancel-order-customer";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

function createPendingOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		userId: VALID_USER_ID,
		status: "PENDING",
		paymentStatus: "PENDING",
		items: [{ skuId: VALID_SKU_ID, quantity: 2 }],
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("cancelOrderCustomer", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: VALID_USER_ID, name: "Marie Dupont" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID } });
		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendCancelEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/compte/commandes/SYN-2026-0001");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", `orders-user-${VALID_USER_ID}`]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder());
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);
		mockPrisma.discountUsage.deleteMany.mockResolvedValue({});
		mockPrisma.discount.update.mockResolvedValue({});
		mockPrisma.discount.updateMany.mockResolvedValue({ count: 0 });
	});

	// Auth
	it("should return auth error when not authenticated", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non connecte" };
		mockRequireAuth.mockResolvedValue({ error: authError });

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Rate limit
	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Validation
	it("should return validation error for invalid ID", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Order not found (null returned from transaction)
	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		mockError.mockReturnValueOnce({
			status: ActionStatus.NOT_FOUND,
			message: "La commande n'existe pas.",
		});

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// IDOR protection
	it("should return NOT_FOUND when order belongs to another user", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder({ userId: "other-user-id" }));
		mockError.mockReturnValueOnce({
			status: ActionStatus.NOT_FOUND,
			message: "La commande n'existe pas.",
		});

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	// Already cancelled
	it("should return error when order is already cancelled", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder({ status: "CANCELLED" }));

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("annulee"));
	});

	// Non-PENDING order
	it("should return error when order is not PENDING (e.g. SHIPPED)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder({ status: "SHIPPED" }));

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("attente"));
	});

	// STOCK-01 : cette action n'accepte QUE des commandes PENDING, dont le stock
	// n'a JAMAIS été décrémenté (réservation optimiste). L'annulation met bien le
	// statut à CANCELLED mais NE doit PAS restocker — sinon l'inventaire gonfle.
	it("should cancel the order WITHOUT restoring stock (PENDING never decremented)", async () => {
		const order = createPendingOrder({
			items: [
				{ skuId: "sku-1", quantity: 3 },
				{ skuId: "sku-2", quantity: 1 },
			],
		});
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		// IDEM-CANCEL-001 : le where porte la précondition status=PENDING.
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: VALID_CUID, status: "PENDING" }),
				data: expect.objectContaining({ status: "CANCELLED" }),
			}),
		);
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
	});

	// AUDIT-BIZ-001 — contrat INVERSÉ (ce test verrouillait auparavant
	// « PAID → REFUNDED »).
	//
	// Cette action posait `paymentStatus: REFUNDED` sur une commande PENDING+PAID
	// sans créer aucun refund Stripe ni aucune ligne `Refund`, et sans restocker
	// (sa justification STOCK-01 — « une PENDING n'a jamais décrémenté son
	// stock » — est fausse dès que le paiement est encaissé). Le résultat aurait
	// été un client débité, une commande affichée « remboursée », et un stock
	// fantôme. L'état est inatteignable par les chemins nominaux (toute
	// transition PAID pose aussi `status = PROCESSING` : webhook
	// `processOrderAtomically` + action admin `markAsPaid`) — on refuse donc au
	// lieu de « réparer » l'incohérence par un flip d'enum mensonger.
	it("refuses to cancel a PENDING order that is already PAID (no silent REFUNDED flip)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder({ paymentStatus: "PAID" }));

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		// Aucune mutation : ni annulation, ni statut de paiement, ni restock.
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		// Et surtout : jamais d'email « votre commande a été remboursée ».
		expect(mockSendCancelEmail).not.toHaveBeenCalled();
	});

	// IDEM-CANCEL-001 : count===0 ⇒ un concurrent (double-clic) a déjà muté la
	// commande entre le findUnique et le claim → abort avant libération des
	// codes promo et avant l'audit.
	it("should abort with not_pending error when the atomic claim matches no row", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPendingOrder());
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("attente"));
		expect(mockPrisma.discountUsage.findMany).not.toHaveBeenCalled();
		expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
		expect(mockSendCancelEmail).not.toHaveBeenCalled();
	});

	// Audit trail
	it("should create audit trail with CUSTOMER source", async () => {
		await cancelOrderCustomer(undefined, validFormData);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "CANCELLED",
				authorId: VALID_USER_ID,
				source: "CUSTOMER",
			}),
		);
	});

	// Cache invalidation
	it("should invalidate order cache tags on success", async () => {
		await cancelOrderCustomer(undefined, validFormData);

		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith(VALID_USER_ID, expect.any(String));
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith(`orders-user-${VALID_USER_ID}`);
	});

	// Email sent on success
	it("should send cancellation email when customerEmail is present", async () => {
		const order = createPendingOrder({ customerEmail: "client@example.com" });
		mockPrisma.order.findUnique.mockResolvedValue(order);

		await cancelOrderCustomer(undefined, validFormData);

		expect(mockSendCancelEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				orderNumber: "SYN-2026-0001",
			}),
		);
	});

	// Email failure is silently caught
	it("should succeed silently when email send fails", async () => {
		const order = createPendingOrder({ customerEmail: "client@example.com" });
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockSendCancelEmail.mockRejectedValue(new Error("SMTP error"));

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// Transaction error → handleActionError
	it("should call handleActionError on unexpected transaction failure", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await cancelOrderCustomer(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
