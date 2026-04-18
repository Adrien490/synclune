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
	mockLogger,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn() },
		refund: { create: vi.fn() },
		$transaction: vi.fn(),
		$queryRaw: vi.fn(),
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
	mockLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ REFUND_LIMITS: { CREATE: "refund-create" } }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: (formData: FormData, key: string) => {
		const v = formData.get(key);
		if (typeof v !== "string" || !v) return null;
		try {
			return JSON.parse(v);
		} catch {
			return null;
		}
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
		ORDER_NOT_PAID: "La commande n'a pas ete payee.",
		INVALID_ITEMS: "Les articles du remboursement sont invalides.",
		QUANTITY_EXCEEDS_AVAILABLE: "La quantite demandee depasse la quantite disponible.",
		AMOUNT_EXCEEDS_REMAINING: "Le montant depasse le montant restant remboursable.",
		CREATE_FAILED: "Erreur lors de la creation du remboursement.",
	},
}));
vi.mock("../../constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		LIST: "orders-list",
		REFUNDS: (id: string) => `order-refunds-${id}`,
	},
	REFUNDS_CACHE_TAGS: {
		LIST: "refunds-list",
		DETAIL: (id: string) => `refund-${id}`,
	},
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}));
vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
	},
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
	reason: "DEFECTIVE",
	items: JSON.stringify([{ orderItemId: "item-1", quantity: 1, amount: 2999, restock: true }]),
});

function createPaidOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		paymentStatus: "PAID",
		subtotal: 4998,
		discountAmount: 0,
		total: 4998,
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

function setValidatedData(
	items: Array<{ orderItemId: string; quantity: number; amount: number; restock?: boolean }> = [
		{ orderItemId: "item-1", quantity: 1, amount: 2499, restock: true },
	],
	extras: { reason?: string; note?: string | null; orderId?: string } = {},
) {
	mockValidateInput.mockReturnValue({
		data: {
			orderId: extras.orderId ?? VALID_CUID,
			reason: extras.reason ?? "DEFECTIVE",
			note: extras.note ?? null,
			items,
		},
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("createRefund", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		setValidatedData();
		mockSanitizeText.mockImplementation((t: string) => t);
		mockShouldRestockByDefault.mockReturnValue(true);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.$queryRaw.mockResolvedValue([{ id: VALID_CUID }]);
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

	// ------------------------------------------------------------------------
	// AUTH / RATE LIMIT / VALIDATION
	// ------------------------------------------------------------------------

	it("returns auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid payload", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns error for malformed items JSON", async () => {
		const fd = createMockFormData({ orderId: VALID_CUID, reason: "DEFECTIVE", items: "not-json" });
		const result = await createRefund(undefined, fd);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Format");
	});

	it("returns error when items JSON parses to null", async () => {
		const fd = createMockFormData({ orderId: VALID_CUID, reason: "DEFECTIVE" });
		const result = await createRefund(undefined, fd);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ------------------------------------------------------------------------
	// ORDER LOOKUP / LOCK
	// ------------------------------------------------------------------------

	it("uses FOR UPDATE lock via $queryRaw before reading order", async () => {
		await createRefund(undefined, validFormData);
		expect(mockPrisma.$queryRaw).toHaveBeenCalled();
	});

	it("returns ORDER_NOT_FOUND when row lock returns empty", async () => {
		mockPrisma.$queryRaw.mockResolvedValue([]);
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Commande introuvable.");
	});

	it("returns ORDER_NOT_FOUND when order.findUnique returns null", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Commande introuvable.");
	});

	// ------------------------------------------------------------------------
	// PAYMENT STATUS GUARDS
	// ------------------------------------------------------------------------

	it("rejects order with PENDING paymentStatus", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPaidOrder({ paymentStatus: "PENDING" }));
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("n'a pas été payée"));
	});

	it("rejects order with FAILED paymentStatus", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPaidOrder({ paymentStatus: "FAILED" }));
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("rejects order with REFUNDED paymentStatus (already fully refunded)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createPaidOrder({ paymentStatus: "REFUNDED" }));
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("déjà totalement remboursée"));
	});

	it("accepts order with PARTIALLY_REFUNDED paymentStatus", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createPaidOrder({
				paymentStatus: "PARTIALLY_REFUNDED",
				refunds: [{ amount: 1000, status: "COMPLETED" }],
			}),
		);
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ------------------------------------------------------------------------
	// ITEM VALIDATION
	// ------------------------------------------------------------------------

	it("returns INVALID_ITEMS when orderItemId not found in order", async () => {
		setValidatedData([{ orderItemId: "unknown-item", quantity: 1, amount: 1000 }]);
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Les articles du remboursement sont invalides.");
	});

	it("returns QUANTITY_EXCEEDS with remaining quantity when exceeding available", async () => {
		// order item has quantity=2, already refunded 1, user tries 2 more → exceeds
		mockPrisma.order.findUnique.mockResolvedValue(
			createPaidOrder({
				items: [
					{
						id: "item-1",
						skuId: "sku-1",
						quantity: 2,
						price: 2499,
						productTitle: "Bracelet",
						refundItems: [{ quantity: 1 }],
					},
				],
			}),
		);
		setValidatedData([{ orderItemId: "item-1", quantity: 2, amount: 2499 }]);
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("max 1"));
	});

	it("allows quantity exactly equal to available", async () => {
		setValidatedData([{ orderItemId: "item-1", quantity: 2, amount: 4998 }]);
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ------------------------------------------------------------------------
	// AMOUNT LOGIC & DISCOUNT PRORATION
	// ------------------------------------------------------------------------

	it("caps item amount when exceeding post-discount max and logs warning", async () => {
		// subtotal=1000, discount=200, ratio=0.2 → max = price * qty * 0.8
		mockPrisma.order.findUnique.mockResolvedValue(
			createPaidOrder({
				subtotal: 1000,
				discountAmount: 200,
				total: 800,
				items: [
					{
						id: "item-1",
						skuId: "sku-1",
						quantity: 1,
						price: 1000,
						productTitle: "Bague",
						refundItems: [],
					},
				],
			}),
		);
		// User asks for full price (1000) but max refundable after discount is 800
		setValidatedData([{ orderItemId: "item-1", quantity: 1, amount: 1000 }]);

		const result = await createRefund(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Amount capped for item"));
		// Refund amount should be capped at 800 (post-discount price)
		expect(mockPrisma.refund.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ amount: 800 }),
			}),
		);
	});

	it("applies proportional discount per-item (discountRatio capped at 1)", async () => {
		// degenerate case: discount > subtotal → ratio capped at 1 → max item amount = 0
		mockPrisma.order.findUnique.mockResolvedValue(
			createPaidOrder({
				subtotal: 1000,
				discountAmount: 1500,
				total: 0,
				items: [
					{
						id: "item-1",
						skuId: "sku-1",
						quantity: 1,
						price: 1000,
						productTitle: "Free",
						refundItems: [],
					},
				],
			}),
		);
		setValidatedData([{ orderItemId: "item-1", quantity: 1, amount: 500 }]);

		const result = await createRefund(undefined, validFormData);

		// max amount is 0 → total is 0 → AMOUNT_ZERO thrown
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("supérieur à 0"));
	});

	it("returns AMOUNT_EXCEEDS when total exceeds remaining refundable amount", async () => {
		// order total=100, already refunded 90 → maxRefundable = 10
		// But post-discount item max = 100, so only maxRefundable guard triggers
		mockPrisma.order.findUnique.mockResolvedValue(
			createPaidOrder({
				subtotal: 100,
				total: 100,
				discountAmount: 0,
				items: [
					{
						id: "item-1",
						skuId: "sku-1",
						quantity: 1,
						price: 100,
						productTitle: "X",
						refundItems: [],
					},
				],
				refunds: [{ amount: 90, status: "COMPLETED" }],
			}),
		);
		setValidatedData([{ orderItemId: "item-1", quantity: 1, amount: 50 }]);

		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Max:"));
	});

	it("sums amounts across multiple items", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			createPaidOrder({
				subtotal: 3000,
				total: 3000,
				items: [
					{
						id: "item-1",
						skuId: "sku-1",
						quantity: 1,
						price: 1000,
						productTitle: "A",
						refundItems: [],
					},
					{
						id: "item-2",
						skuId: "sku-2",
						quantity: 1,
						price: 2000,
						productTitle: "B",
						refundItems: [],
					},
				],
			}),
		);
		setValidatedData([
			{ orderItemId: "item-1", quantity: 1, amount: 1000 },
			{ orderItemId: "item-2", quantity: 1, amount: 2000 },
		]);

		const result = await createRefund(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.refund.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ amount: 3000 }),
			}),
		);
	});

	// ------------------------------------------------------------------------
	// CREATION / PERSISTENCE
	// ------------------------------------------------------------------------

	it("uses transaction with FOR UPDATE lock", async () => {
		await createRefund(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("creates refund with PENDING status and correct metadata", async () => {
		await createRefund(undefined, validFormData);
		expect(mockPrisma.refund.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					orderId: VALID_CUID,
					reason: "DEFECTIVE",
					createdBy: "admin-1",
				}),
			}),
		);
	});

	it("persists restock flag per item", async () => {
		setValidatedData([{ orderItemId: "item-1", quantity: 1, amount: 2499, restock: false }]);

		await createRefund(undefined, validFormData);

		const call = mockPrisma.refund.create.mock.calls[0]?.[0] as {
			data: { items: { create: Array<{ restock: boolean }> } };
		};
		expect(call.data.items.create[0]?.restock).toBe(false);
	});

	it("sanitizes note before persisting", async () => {
		setValidatedData(undefined, { note: "  raw note " });
		mockSanitizeText.mockReturnValue("sanitized");

		await createRefund(undefined, validFormData);

		expect(mockSanitizeText).toHaveBeenCalledWith("  raw note ");
		expect(mockPrisma.refund.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ note: "sanitized" }),
			}),
		);
	});

	it("passes null note when none provided", async () => {
		setValidatedData(undefined, { note: null });

		await createRefund(undefined, validFormData);

		expect(mockSanitizeText).not.toHaveBeenCalled();
		expect(mockPrisma.refund.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ note: null }) }),
		);
	});

	// ------------------------------------------------------------------------
	// CACHE & RESULT
	// ------------------------------------------------------------------------

	it("invalidates cache tags after creation", async () => {
		await createRefund(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
		expect(mockUpdateTag).toHaveBeenCalledWith(`order-refunds-${VALID_CUID}`);
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-kpis");
		expect(mockUpdateTag).toHaveBeenCalledWith("dashboard-revenue-chart");
	});

	it("returns success with formatted amount and refundId", async () => {
		const result = await createRefund(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("24.99");
		expect(result.data).toEqual({ refundId: "refund-1" });
	});

	// ------------------------------------------------------------------------
	// ERROR HANDLING
	// ------------------------------------------------------------------------

	it("delegates unexpected DB errors to handleActionError", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await createRefund(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("preserves business error codes over generic fallback", async () => {
		// ORDER_NOT_FOUND → specific message, not CREATE_FAILED fallback
		mockPrisma.$queryRaw.mockResolvedValue([]);
		const result = await createRefund(undefined, validFormData);
		expect(result.message).toBe("Commande introuvable.");
		expect(mockHandleActionError).not.toHaveBeenCalled();
	});
});
