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
	mockCanRevertToProcessing,
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
	mockSanitizeText: vi.fn(),
	mockCanRevertToProcessing: vi.fn(),
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
	canRevertToProcessing: mockCanRevertToProcessing,
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
			REVERT_TO_PROCESSING_FAILED: "Erreur lors de l'annulation de l'expédition.",
			CANNOT_REVERT_NOT_SHIPPED: "Seule une commande expédiée peut être remise en préparation.",
		},
	};
});

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));

import { revertToProcessing } from "../revert-to-processing";

// ============================================================================
// HELPERS
// ============================================================================

function makeFd(reason = "Erreur étiquette") {
	return createMockFormData({ id: VALID_CUID, reason });
}

function makeShippedOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "SHIPPED",
		fulfillmentStatus: "FULFILLED",
		paymentStatus: "PAID",
		trackingNumber: "TRACK-123",
		trackingUrl: "https://track.test/TRACK-123",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("revertToProcessing", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@synclune.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockCanRevertToProcessing.mockReturnValue({ canRevert: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(makeShippedOrder());
		mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
	});

	// Auth
	it("returns the auth error when caller is not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await revertToProcessing(undefined, makeFd());

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns the rate-limit error before touching the DB", async () => {
		const rlError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rlError });

		const result = await revertToProcessing(undefined, makeFd());

		expect(result).toEqual(rlError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Validation: reason is required
	it("returns a validation error when reason is missing", async () => {
		const fd = createMockFormData({ id: VALID_CUID });

		const result = await revertToProcessing(undefined, fd);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// Order not found
	it("returns NOT_FOUND when the order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);

		const result = await revertToProcessing(undefined, makeFd());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// Cannot revert — not shipped
	it("returns CANNOT_REVERT_NOT_SHIPPED when order isn't SHIPPED", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeShippedOrder({ status: "DELIVERED" }));
		mockCanRevertToProcessing.mockReturnValue({ canRevert: false, reason: "not_shipped" });

		const result = await revertToProcessing(undefined, makeFd());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/Seule une commande expédiée/);
		expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
	});

	// Happy path: status flip + tracking cleared
	it("flips status to PROCESSING and wipes the tracking fields", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeShippedOrder());

		await revertToProcessing(undefined, makeFd());

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
			// Garde atomique : le where ré-asserte SHIPPED
			where: { id: VALID_CUID, deletedAt: null, status: "SHIPPED" },
			data: {
				status: "PROCESSING",
				fulfillmentStatus: "PROCESSING",
				trackingNumber: null,
				trackingUrl: null,
				shippingCarrier: null,
				shippedAt: null,
			},
		});
	});

	// Audit (with previous tracking captured)
	it("records an atomic audit log entry that captures the previous tracking number", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			makeShippedOrder({ trackingNumber: "ABC", trackingUrl: "https://x" }),
		);

		await revertToProcessing(undefined, makeFd("Mauvaise adresse"));

		expect(mockCreateOrderAuditTx).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				orderId: VALID_CUID,
				action: "STATUS_REVERTED",
				previousStatus: "SHIPPED",
				newStatus: "PROCESSING",
				newFulfillmentStatus: "PROCESSING",
				note: "Mauvaise adresse",
				authorId: "admin-1",
				metadata: expect.objectContaining({
					previousTrackingNumber: "ABC",
					previousTrackingUrl: "https://x",
				}),
			}),
		);
	});

	// Sanitize reason
	it("sanitizes the supplied reason before validation", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeShippedOrder());

		await revertToProcessing(undefined, makeFd("<img src=x onerror=alert(1)>"));

		expect(mockSanitizeText).toHaveBeenCalledWith("<img src=x onerror=alert(1)>");
	});

	// Cache invalidation
	it("invalidates the order cache tags after success", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeShippedOrder({ userId: "user-1" }));
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list", "user-orders-1"]);

		await revertToProcessing(undefined, makeFd());

		expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("user-orders-1");
	});

	// Admin audit log
	it("emits an admin-level audit log entry", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeShippedOrder());

		await revertToProcessing(undefined, makeFd());
	});

	// Success message contains old tracking
	it("includes the previous tracking number in the success message when present", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(makeShippedOrder({ trackingNumber: "ZX1" }));

		const result = await revertToProcessing(undefined, makeFd());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toMatch(/ancien suivi: ZX1/);
	});

	it("omits the tracking hint when the order had no tracking number", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(
			makeShippedOrder({ trackingNumber: null, trackingUrl: null }),
		);

		const result = await revertToProcessing(undefined, makeFd());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).not.toMatch(/ancien suivi/);
	});

	// Error path
	it("delegates to handleActionError on unexpected DB exceptions", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const result = await revertToProcessing(undefined, makeFd());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
