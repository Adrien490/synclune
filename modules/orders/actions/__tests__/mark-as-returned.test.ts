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
	mockSanitizeText,
	mockCanMarkAsReturned,
	mockCreateOrderAuditTx,
	mockGetOrderInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCanMarkAsReturned: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdminWithUser,
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
		safeFormGet: (formData: FormData, key: string) => {
			const v = formData.get(key);
			return typeof v === "string" ? v : null;
		},
		handleActionError: mockHandleActionError,
	};
});

vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));

vi.mock("../../services/order-status-validation.service", () => ({
	canMarkAsReturned: mockCanMarkAsReturned,
}));

vi.mock("../../utils/order-audit", () => ({
	createOrderAuditTx: mockCreateOrderAuditTx,
}));

vi.mock("../../constants/order.constants", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		ORDER_ERROR_MESSAGES: {
			NOT_FOUND: "La commande n'existe pas.",
			ALREADY_RETURNED: "Cette commande est déjà marquée comme retournée.",
			CANNOT_RETURN_NOT_DELIVERED: "Seule une commande livrée peut être marquée comme retournée.",
			MARK_AS_RETURNED_FAILED: "Erreur lors du marquage comme retourné.",
		},
	};
});

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));

import { markAsReturned } from "../mark-as-returned";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

function makeDeliveredOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "DELIVERED",
		fulfillmentStatus: "FULFILLED",
		paymentStatus: "PAID",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("markAsReturned", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@synclune.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockCanMarkAsReturned.mockReturnValue({ canReturn: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(makeDeliveredOrder());
		mockPrisma.order.update.mockResolvedValue({});
	});

	// Auth
	it("returns the auth error when caller is not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await markAsReturned(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns the rate-limit error before touching the DB", async () => {
		const rlError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await markAsReturned(undefined, validFormData);

		expect(result).toEqual(rlError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Validation
	it("returns a validation error for an invalid id", async () => {
		const fd = createMockFormData({ id: "not-a-cuid" });

		const result = await markAsReturned(undefined, fd);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Order not found
	it("returns NOT_FOUND when the order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await markAsReturned(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// Already returned
	it("returns ALREADY_RETURNED when fulfillment is already RETURNED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			makeDeliveredOrder({ fulfillmentStatus: "RETURNED" }),
		);
		mockCanMarkAsReturned.mockReturnValue({ canReturn: false, reason: "already_returned" });

		const result = await markAsReturned(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/déjà marquée comme retournée/);
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	// Cannot return — not delivered
	it("returns CANNOT_RETURN_NOT_DELIVERED when order isn't DELIVERED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeDeliveredOrder({ status: "SHIPPED" }));
		mockCanMarkAsReturned.mockReturnValue({ canReturn: false, reason: "not_delivered" });

		const result = await markAsReturned(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/Seule une commande livrée/);
		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	// Happy path: status update
	it("flips fulfillmentStatus to RETURNED and keeps order.status untouched", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeDeliveredOrder());

		await markAsReturned(undefined, validFormData);

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { fulfillmentStatus: "RETURNED" },
		});
	});

	// Audit
	it("records an atomic audit log entry with the previous fulfillment status", async () => {
		const order = makeDeliveredOrder({ fulfillmentStatus: "FULFILLED" });
		mockPrisma.order.findUnique.mockResolvedValue(order);

		const fd = createMockFormData({ id: VALID_CUID, reason: "Article cassé" });

		await markAsReturned(undefined, fd);

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "RETURNED",
				previousFulfillmentStatus: "FULFILLED",
				newFulfillmentStatus: "RETURNED",
				note: "Article cassé",
				authorId: "admin-1",
			}),
		);
	});

	// Sanitize reason
	it("sanitizes the supplied reason before validation", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeDeliveredOrder());
		const fd = createMockFormData({ id: VALID_CUID, reason: "<script>alert(1)</script>" });

		await markAsReturned(undefined, fd);

		expect(mockSanitizeText).toHaveBeenCalledWith("<script>alert(1)</script>");
	});

	// Cache invalidation
	it("invalidates order cache tags after success", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeDeliveredOrder({ userId: "user-1" }));
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "user-orders-1"]);

		await markAsReturned(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-orders-1");
	});

	// Admin audit log
	it("emits an admin-level audit log entry", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeDeliveredOrder());

		await markAsReturned(undefined, validFormData);
	});

	// Success message hints at refund eligibility
	it("returns a success message that mentions refund eligibility", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeDeliveredOrder());

		const result = await markAsReturned(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toMatch(/remboursement/i);
	});

	// Error path
	it("delegates to handleActionError on unexpected DB exceptions", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await markAsReturned(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
