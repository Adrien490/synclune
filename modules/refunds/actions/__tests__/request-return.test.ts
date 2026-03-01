import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockSanitizeText,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
		refund: { create: vi.fn() },
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSanitizeText: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ RETURN_REQUEST_LIMIT: "return-request" }));
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
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../constants/refund.constants", () => ({
	REFUND_ERROR_MESSAGES: {
		ORDER_NOT_FOUND: "Commande introuvable.",
		RETURN_NOT_ELIGIBLE: "Retour non eligible.",
		RETURN_DEADLINE_EXCEEDED: "Delai de retractation depasse.",
		RETURN_ALREADY_REQUESTED: "Un retour a deja ete demande.",
		RETURN_REQUEST_FAILED: "Erreur lors de la demande de retour.",
	},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		USER_ORDERS: (id: string) => `orders-user-${id}`,
		REFUNDS: (id: string) => `order-refunds-${id}`,
	},
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}));
vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue",
		RECENT_ORDERS: "dashboard-recent",
	},
}));
vi.mock("../../schemas/refund.schemas", () => ({ requestReturnSchema: {} }));
vi.mock("@/app/generated/prisma/client", () => ({
	RefundStatus: { PENDING: "PENDING", APPROVED: "APPROVED", COMPLETED: "COMPLETED" },
}));

import { requestReturn } from "../request-return";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	orderId: VALID_CUID,
	reason: "Produit ne correspond pas",
});

function createDeliveredOrder(overrides: Record<string, unknown> = {}) {
	return {
		...createMockOrder({
			userId: VALID_USER_ID,
			paymentStatus: "PAID",
			fulfillmentStatus: "DELIVERED",
			actualDelivery: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
		}),
		items: [
			{
				id: "item-1",
				quantity: 1,
				price: 4999,
				refundItems: [],
			},
		],
		refunds: [],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("requestReturn", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { orderId: VALID_CUID, reason: "Produit ne correspond pas", message: undefined },
		});
		mockSanitizeText.mockImplementation((t: string) => t);
		mockPrisma.order.findUnique.mockResolvedValue(createDeliveredOrder());
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

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await requestReturn(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await requestReturn(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await requestReturn(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return not found when order not found", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await requestReturn(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return not found when order belongs to different user (IDOR)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createDeliveredOrder({ userId: "other-user" }));
		const result = await requestReturn(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when order not delivered", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createDeliveredOrder({ fulfillmentStatus: "SHIPPED" }),
		);
		const result = await requestReturn(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when 14-day return window expired", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createDeliveredOrder({
				actualDelivery: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
			}),
		);
		const result = await requestReturn(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should succeed within 14-day window", async () => {
		const result = await requestReturn(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.refund.create).toHaveBeenCalled();
	});

	it("should invalidate cache after creation", async () => {
		await requestReturn(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.order.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await requestReturn(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
