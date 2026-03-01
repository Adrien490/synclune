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
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockGetOrderInvalidationTags,
	mockOrdersCacheTags: _mockOrdersCacheTags,
	mockCreateOrderAuditTx,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: {
			findMany: vi.fn(),
			update: vi.fn(),
		},
		productSku: {
			update: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockOrdersCacheTags: {
		HISTORY: (orderId: string) => `order-history-${orderId}`,
	},
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

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_ORDER_LIMITS: { BULK_OPERATIONS: "admin-order-bulk" },
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

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../schemas/order.schemas", () => ({
	bulkCancelOrdersSchema: {},
}));

import { bulkCancelOrders } from "../bulk-cancel-orders";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_ORDER_ID, "order_cm9876543210zyxwv"];

function makeFormData(ids: string[] = VALID_IDS, reason?: string) {
	return createMockFormData({
		ids: JSON.stringify(ids),
		...(reason ? { reason } : {}),
	});
}

function createEligibleOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		id: VALID_ORDER_ID,
		userId: VALID_USER_ID,
		status: "PENDING",
		paymentStatus: "PENDING",
		items: [{ skuId: "sku-1", quantity: 2 }],
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkCancelOrders", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin Test" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "admin-badges"]);
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[]; reason?: string },
		}));

		// Default transaction: returns eligible orders result
		const order = createEligibleOrder();
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order]);
				mockPrisma.order.update.mockResolvedValue({});
				mockPrisma.productSku.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// IDs parsing
	// --------------------------------------------------------------------------

	it("should return error for malformed JSON ids", async () => {
		const formData = createMockFormData({ ids: "not-valid-json" });

		const result = await bulkCancelOrders(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("invalide");
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// No eligible orders
	// --------------------------------------------------------------------------

	it("should return error when no eligible orders found in transaction", async () => {
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([]);
				return fn(mockPrisma);
			},
		);

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("eligible");
	});

	// --------------------------------------------------------------------------
	// Skips already cancelled / shipped / delivered orders
	// --------------------------------------------------------------------------

	it("should only process orders not in CANCELLED, SHIPPED, or DELIVERED status", async () => {
		const eligibleOrder = createEligibleOrder({ status: "PENDING" });
		// Transaction only returns the eligible order (the action filters DB-side)
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([eligibleOrder]);
				mockPrisma.order.update.mockResolvedValue({});
				mockPrisma.productSku.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: eligibleOrder.id },
				data: expect.objectContaining({ status: "CANCELLED" }),
			}),
		);
	});

	// --------------------------------------------------------------------------
	// Stock restoration for PENDING payment orders
	// --------------------------------------------------------------------------

	it("should restore stock for orders with PENDING payment status", async () => {
		const order = createEligibleOrder({
			paymentStatus: "PENDING",
			items: [
				{ skuId: "sku-1", quantity: 2 },
				{ skuId: "sku-2", quantity: 1 },
			],
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order]);
				mockPrisma.order.update.mockResolvedValue({});
				mockPrisma.productSku.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sku-1" },
				data: { inventory: { increment: 2 } },
			}),
		);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sku-2" },
				data: { inventory: { increment: 1 } },
			}),
		);
		expect(result.message).toContain("Stock restaure");
	});

	it("should not restore stock for orders with non-PENDING payment status", async () => {
		const order = createEligibleOrder({
			paymentStatus: "PAID",
			items: [{ skuId: "sku-1", quantity: 2 }],
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order]);
				mockPrisma.order.update.mockResolvedValue({});
				mockPrisma.productSku.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		await bulkCancelOrders(undefined, makeFormData());

		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// REFUNDED payment status for PAID orders
	// --------------------------------------------------------------------------

	it("should set paymentStatus to REFUNDED for orders with PAID payment status", async () => {
		const order = createEligibleOrder({ paymentStatus: "PAID" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order]);
				mockPrisma.order.update.mockResolvedValue({});
				mockPrisma.productSku.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: order.id },
				data: expect.objectContaining({ paymentStatus: "REFUNDED" }),
			}),
		);
		expect(result.message).toContain("REFUNDED");
	});

	it("should keep existing paymentStatus for non-PAID orders", async () => {
		const order = createEligibleOrder({ paymentStatus: "PENDING" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order]);
				mockPrisma.order.update.mockResolvedValue({});
				mockPrisma.productSku.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		await bulkCancelOrders(undefined, makeFormData());

		expect(mockPrisma.order.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ paymentStatus: "PENDING" }),
			}),
		);
	});

	// --------------------------------------------------------------------------
	// Audit trail
	// --------------------------------------------------------------------------

	it("should create an audit trail entry for each cancelled order", async () => {
		const order1 = createEligibleOrder({ id: "order-1" });
		const order2 = createEligibleOrder({ id: "order-2", orderNumber: "SYN-2026-0002" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order1, order2]);
				mockPrisma.order.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		await bulkCancelOrders(undefined, makeFormData());

		expect(mockCreateOrderAuditTx).toHaveBeenCalledTimes(2);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: "order-1",
				action: "CANCELLED",
				newStatus: "CANCELLED",
				authorId: "admin-1",
				authorName: "Admin Test",
				metadata: expect.objectContaining({ bulk: true }),
			}),
		);
		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: "order-2",
				action: "CANCELLED",
			}),
		);
	});

	it("should include the reason in the audit trail when provided", async () => {
		const order = createEligibleOrder();
		const reason = "Stock épuisé";
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS, reason } });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order]);
				mockPrisma.order.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		await bulkCancelOrders(undefined, makeFormData(VALID_IDS, reason));

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({ note: reason }),
		);
	});

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate cache tags for each unique userId", async () => {
		const order1 = createEligibleOrder({ id: "order-1", userId: "user-1" });
		const order2 = createEligibleOrder({
			id: "order-2",
			userId: "user-2",
			orderNumber: "SYN-2026-0002",
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order1, order2]);
				mockPrisma.order.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		await bulkCancelOrders(undefined, makeFormData());

		// Called once per unique userId + once for the admin list (no userId)
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith("user-1");
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith("user-2");
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith();
	});

	it("should not call per-user invalidation for orders with no userId", async () => {
		const order = createEligibleOrder({ userId: null });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order]);
				mockPrisma.order.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		await bulkCancelOrders(undefined, makeFormData());

		// Only the admin list invalidation (no userId argument)
		expect(mockGetOrderInvalidationTags).toHaveBeenCalledWith();
		expect(mockGetOrderInvalidationTags).not.toHaveBeenCalledWith(null);
	});

	it("should invalidate order history tag for each cancelled order", async () => {
		const order = createEligibleOrder({ id: "order-hist-1" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order]);
				mockPrisma.order.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		await bulkCancelOrders(undefined, makeFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("order-history-order-hist-1");
	});

	// --------------------------------------------------------------------------
	// Success message
	// --------------------------------------------------------------------------

	it("should return success message with count of cancelled orders", async () => {
		const order1 = createEligibleOrder({ id: "order-1" });
		const order2 = createEligibleOrder({ id: "order-2", orderNumber: "SYN-2026-0002" });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.order.findMany.mockResolvedValue([order1, order2]);
				mockPrisma.order.update.mockResolvedValue({});
				return fn(mockPrisma);
			},
		);

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2");
		expect(result.message).toContain("annulee");
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await bulkCancelOrders(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
