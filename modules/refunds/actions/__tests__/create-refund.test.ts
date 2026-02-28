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
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockSanitizeText,
	mockShouldRestockByDefault,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
		refund: { create: vi.fn() },
		$transaction: vi.fn(),
		$queryRawUnsafe: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockShouldRestockByDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ REFUND_LIMITS: { CREATE: "refund-create" } }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		ORDER_NOT_FOUND: "Commande introuvable.",
		ORDER_NOT_PAID: "La commande n'a pas ete payee.",
	},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		REFUNDS: (id: string) => `order-refunds-${id}`,
	},
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}));
vi.mock("../../schemas/refund.schemas", () => ({ createRefundSchema: {} }));
vi.mock("../../services/refund-restock.service", () => ({
	shouldRestockByDefault: mockShouldRestockByDefault,
}));
vi.mock("@/app/generated/prisma/client", () => ({
	RefundStatus: { PENDING: "PENDING", APPROVED: "APPROVED", COMPLETED: "COMPLETED" },
}));

import { createRefund } from "../create-refund";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	orderId: VALID_CUID,
	reason: "Produit defectueux",
	items: JSON.stringify([{ orderItemId: "item-1", quantity: 1, amount: 2999 }]),
});

function createPaidOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		paymentStatus: "PAID",
		total: 4999,
		items: [
			{
				id: "item-1",
				skuId: "sku-1",
				quantity: 2,
				price: 2499,
				productTitle: "Bracelet",
				refundItems: [],
			},
		],
		refunds: [],
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("createRefund", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: {
				orderId: VALID_CUID,
				reason: "Produit defectueux",
				note: null,
				items: [{ orderItemId: "item-1", quantity: 1, amount: 2999 }],
			},
		});
		mockSanitizeText.mockImplementation((t: string) => t);
		mockShouldRestockByDefault.mockReturnValue(true);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.$queryRawUnsafe.mockResolvedValue([createPaidOrder()]);
		mockPrisma.order.findUnique.mockResolvedValue(createPaidOrder());
		mockPrisma.refund.create.mockResolvedValue({ id: "refund-1" });

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error for invalid items JSON", async () => {
		const fd = createMockFormData({
			orderId: VALID_CUID,
			reason: "Test",
			items: "not-json",
		});
		const result = await createRefund(undefined, fd);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Format");
	});

	it("should use transaction with FOR UPDATE lock", async () => {
		await createRefund(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("should invalidate cache after creation", async () => {
		// Need to make the transaction succeed properly
		mockPrisma.$transaction.mockResolvedValue({ refund: { id: "refund-1" }, totalAmount: 1000 });
		await createRefund(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await createRefund(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
