import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";

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
	mockCanMarkAsProcessing,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		orderHistory: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockCanMarkAsProcessing: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { SINGLE_OPERATIONS: "admin-order-single" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({ handleActionError: mockHandleActionError }));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("../../services/order-status-validation.service", () => ({
	canMarkAsProcessing: mockCanMarkAsProcessing,
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_PROCESSING: "Cette commande est deja en cours de preparation.",
		CANNOT_PROCESS_NOT_PENDING: "Seule une commande en attente peut etre passee en preparation.",
		CANNOT_PROCESS_CANCELLED: "Une commande annulee ne peut pas etre mise en preparation.",
		CANNOT_PROCESS_UNPAID: "Une commande non payee ne peut pas etre mise en preparation.",
		MARK_AS_PROCESSING_FAILED: "Erreur lors du passage en preparation.",
	},
}));
vi.mock("../../schemas/order.schemas", () => ({
	markAsProcessingSchema: {
		safeParse: vi.fn().mockReturnValue({ success: true, data: { id: VALID_CUID } }),
	},
}));

import { markAsProcessing } from "../mark-as-processing";
import { markAsProcessingSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

function createPendingPaidOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "PENDING",
		paymentStatus: "PAID",
		fulfillmentStatus: "UNFULFILLED",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("markAsProcessing", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin Test" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);
		mockCanMarkAsProcessing.mockReturnValue({ canProcess: true });

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createPendingPaidOrder());
		mockPrisma.order.update.mockResolvedValue({});

		vi.mocked(markAsProcessingSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID },
		} as never);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" },
		});
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requetes" },
		});
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid ID", async () => {
		vi.mocked(markAsProcessingSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		} as never);
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toBe("ID invalide");
	});

	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(result.message).toBe("La commande n'existe pas.");
	});

	it("should return error already_processing when order is already in PROCESSING", async () => {
		mockCanMarkAsProcessing.mockReturnValue({ canProcess: false, reason: "already_processing" });
		mockPrisma.order.findUnique.mockResolvedValue(createPendingPaidOrder({ status: "PROCESSING" }));
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("preparation");
	});

	it("should return error not_pending when order is SHIPPED", async () => {
		mockCanMarkAsProcessing.mockReturnValue({ canProcess: false, reason: "not_pending" });
		mockPrisma.order.findUnique.mockResolvedValue(createPendingPaidOrder({ status: "SHIPPED" }));
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("attente");
	});

	it("should return error not_pending when order is DELIVERED", async () => {
		mockCanMarkAsProcessing.mockReturnValue({ canProcess: false, reason: "not_pending" });
		mockPrisma.order.findUnique.mockResolvedValue(createPendingPaidOrder({ status: "DELIVERED" }));
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("attente");
	});

	it("should return error cancelled when order is CANCELLED", async () => {
		mockCanMarkAsProcessing.mockReturnValue({ canProcess: false, reason: "cancelled" });
		mockPrisma.order.findUnique.mockResolvedValue(createPendingPaidOrder({ status: "CANCELLED" }));
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("annulee");
	});

	it("should return error unpaid when payment is not PAID", async () => {
		mockCanMarkAsProcessing.mockReturnValue({ canProcess: false, reason: "unpaid" });
		mockPrisma.order.findUnique.mockResolvedValue(
			createPendingPaidOrder({ paymentStatus: "PENDING" }),
		);
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("payee");
	});

	it("should successfully mark a PENDING+PAID order as PROCESSING", async () => {
		const result = await markAsProcessing(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("SYN-2026-0001");
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: "PROCESSING",
					fulfillmentStatus: "PROCESSING",
				}),
			}),
		);
	});

	it("should create audit trail on success", async () => {
		await markAsProcessing(undefined, validFormData);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				action: "PROCESSING",
				newStatus: "PROCESSING",
				newFulfillmentStatus: "PROCESSING",
			}),
		);
	});

	it("should invalidate cache tags with orderId on success", async () => {
		const order = createPendingPaidOrder();
		mockPrisma.order.findUnique.mockResolvedValue(order);
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", `order-${order.id}`]);

		await markAsProcessing(undefined, validFormData);

		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith(order.userId, order.id);
		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-${order.id}`);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await markAsProcessing(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
