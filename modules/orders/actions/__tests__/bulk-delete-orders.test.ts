import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import {
	createMockFormData,
	createMockOrder,
	VALID_ORDER_ID,
	VALID_USER_ID,
} from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
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

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string) => ({ status: ActionStatus.SUCCESS, message }),
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
	ORDERS_CACHE_TAGS: {
		HISTORY: (orderId: string) => `order-history-${orderId}`,
	},
}));

vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		BULK_DELETE_NONE_ELIGIBLE:
			"Aucune commande ne peut etre supprimee (toutes ont des factures ou sont payees).",
		DELETE_FAILED: "Erreur lors de la suppression de la commande.",
	},
}));

vi.mock("../../schemas/order.schemas", () => ({
	bulkDeleteOrdersSchema: {},
}));

import { bulkDeleteOrders } from "../bulk-delete-orders";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_ORDER_ID, "order_cm9876543210zyxwv"];

function makeFormData(ids: string[] = VALID_IDS) {
	return createMockFormData({ ids: JSON.stringify(ids) });
}

function createDeletableOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		id: VALID_ORDER_ID,
		userId: VALID_USER_ID,
		invoiceNumber: null,
		paymentStatus: "PENDING",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteOrders", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "admin-badges"]);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[] },
		}));

		mockPrisma.order.findMany.mockResolvedValue([createDeletableOrder()]);
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkDeleteOrders(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkDeleteOrders(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// IDs parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON ids", async () => {
		const formData = createMockFormData({ ids: "{broken" });

		const result = await bulkDeleteOrders(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	it("should treat missing ids field as empty array and pass to validateInput", async () => {
		const validationError = {
			status: ActionStatus.VALIDATION_ERROR,
			message: "Au moins une commande",
		};
		mockValidateInput.mockReturnValue({ error: validationError });
		const formData = createMockFormData({});

		const result = await bulkDeleteOrders(undefined, formData);

		expect(result).toEqual(validationError);
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkDeleteOrders(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// No eligible orders
	// --------------------------------------------------------------------------

	it("should return error when no deletable orders found", async () => {
		// All orders have invoices
		mockPrisma.order.findMany.mockResolvedValue([
			createDeletableOrder({ invoiceNumber: "INV-001" }),
			createDeletableOrder({
				id: "order-2",
				invoiceNumber: "INV-002",
				orderNumber: "SYN-2026-0002",
			}),
		]);

		const result = await bulkDeleteOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Eligibility filtering
	// --------------------------------------------------------------------------

	it("should delete orders without invoiceNumber and with non-paid status", async () => {
		const order = createDeletableOrder({ invoiceNumber: null, paymentStatus: "PENDING" });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await bulkDeleteOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: [order.id] } },
				data: { deletedAt: expect.any(Date) },
			}),
		);
	});

	it("should skip orders with an invoiceNumber", async () => {
		const deletable = createDeletableOrder({ id: "order-deletable", invoiceNumber: null });
		const skipped = createDeletableOrder({
			id: "order-skipped",
			invoiceNumber: "INV-001",
			orderNumber: "SYN-2026-0002",
		});
		mockPrisma.order.findMany.mockResolvedValue([deletable, skipped]);

		await bulkDeleteOrders(undefined, makeFormData());

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["order-deletable"] } },
			}),
		);
	});

	it("should skip orders with PAID payment status", async () => {
		const deletable = createDeletableOrder({ id: "order-deletable", paymentStatus: "PENDING" });
		const skipped = createDeletableOrder({
			id: "order-paid",
			paymentStatus: "PAID",
			orderNumber: "SYN-2026-0002",
		});
		mockPrisma.order.findMany.mockResolvedValue([deletable, skipped]);

		await bulkDeleteOrders(undefined, makeFormData());

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["order-deletable"] } },
			}),
		);
	});

	it("should skip orders with REFUNDED payment status", async () => {
		const deletable = createDeletableOrder({ id: "order-deletable", paymentStatus: "PENDING" });
		const skipped = createDeletableOrder({
			id: "order-refunded",
			paymentStatus: "REFUNDED",
			orderNumber: "SYN-2026-0002",
		});
		mockPrisma.order.findMany.mockResolvedValue([deletable, skipped]);

		await bulkDeleteOrders(undefined, makeFormData());

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["order-deletable"] } },
			}),
		);
	});

	// --------------------------------------------------------------------------
	// Success message with skipped count
	// --------------------------------------------------------------------------

	it("should include skipped count in success message when some orders were skipped", async () => {
		const deletable = createDeletableOrder({ id: "order-1", paymentStatus: "PENDING" });
		const skipped = createDeletableOrder({
			id: "order-2",
			invoiceNumber: "INV-001",
			orderNumber: "SYN-2026-0002",
		});
		mockPrisma.order.findMany.mockResolvedValue([deletable, skipped]);

		const result = await bulkDeleteOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("1");
		expect(result.message).toContain("ignoree");
	});

	it("should not mention skipped count when all orders were deleted", async () => {
		const order = createDeletableOrder();
		mockPrisma.order.findMany.mockResolvedValue([order]);

		const result = await bulkDeleteOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).not.toContain("ignoree");
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate cache tags for each unique userId", async () => {
		const order1 = createDeletableOrder({ id: "order-1", userId: "user-1" });
		const order2 = createDeletableOrder({
			id: "order-2",
			userId: "user-2",
			orderNumber: "SYN-2026-0002",
		});
		mockPrisma.order.findMany.mockResolvedValue([order1, order2]);

		await bulkDeleteOrders(undefined, makeFormData());

		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith("user-1");
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith("user-2");
		// Admin list invalidation (no userId)
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith();
	});

	it("should invalidate order history tag for each deleted order", async () => {
		const order = createDeletableOrder({ id: "order-hist-99" });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkDeleteOrders(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("order-history-order-hist-99");
	});

	it("should always invalidate the admin list even if orders have no userId", async () => {
		const order = createDeletableOrder({ userId: null });
		mockPrisma.order.findMany.mockResolvedValue([order]);

		await bulkDeleteOrders(undefined, makeFormData());

		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith();
		expect(mockGetOrderInvalidationTags).not.toHaveBeenCalledWith(null);
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.order.findMany.mockRejectedValue(new Error("DB crash"));

		const result = await bulkDeleteOrders(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
