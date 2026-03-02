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
	mockSendDeliveryEmail,
	mockScheduleReviewEmail,
	mockCreateOrderAuditTx,
	mockBuildUrl,
	mockGetOrderInvalidationTags,
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
	mockSendDeliveryEmail: vi.fn(),
	mockScheduleReviewEmail: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
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
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	handleActionError: mockHandleActionError,
}));
vi.mock("@/modules/emails/services/order-emails", () => ({
	sendDeliveryConfirmationEmail: mockSendDeliveryEmail,
}));
vi.mock("@/modules/reviews/services/review-request.service", () => ({
	scheduleReviewRequestEmail: mockScheduleReviewEmail,
}));
vi.mock("../../utils/order-audit", () => ({ createOrderAuditTx: mockCreateOrderAuditTx }));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: { ACCOUNT: { ORDER_DETAIL: (n: string) => `/compte/commandes/${n}` } },
}));
vi.mock("../../constants/order.constants", () => ({
	ORDER_ERROR_MESSAGES: {
		NOT_FOUND: "La commande n'existe pas.",
		ALREADY_DELIVERED: "Cette commande est deja livree.",
		CANNOT_DELIVER_NOT_SHIPPED: "Une commande non expediee ne peut pas etre marquee comme livree.",
		MARK_AS_DELIVERED_FAILED: "Erreur lors du marquage.",
	},
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
}));
vi.mock("@/modules/reviews/constants/cache", () => ({
	REVIEWS_CACHE_TAGS: { REVIEWABLE: (userId: string) => `reviewable-${userId}` },
}));
vi.mock("../../schemas/order.schemas", () => ({
	markAsDeliveredSchema: {
		safeParse: vi.fn().mockReturnValue({ success: true, data: { id: "test", sendEmail: true } }),
	},
}));

import { markAsDelivered } from "../mark-as-delivered";
import { markAsDeliveredSchema } from "../../schemas/order.schemas";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ id: VALID_CUID });

function createShippedOrder(overrides: Record<string, unknown> = {}) {
	return createMockOrder({
		status: "SHIPPED",
		paymentStatus: "PAID",
		fulfillmentStatus: "SHIPPED",
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

describe("markAsDelivered", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCreateOrderAuditTx.mockResolvedValue(undefined);
		mockSendDeliveryEmail.mockResolvedValue(undefined);
		mockScheduleReviewEmail.mockResolvedValue(undefined);
		mockBuildUrl.mockReturnValue("https://synclune.fr/order");
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder());
		mockPrisma.order.update.mockResolvedValue({});

		vi.mocked(markAsDeliveredSchema.safeParse).mockReturnValue({
			success: true,
			data: { id: VALID_CUID, sendEmail: true },
		} as never);

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await markAsDelivered(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await markAsDelivered(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		vi.mocked(markAsDeliveredSchema.safeParse).mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		} as never);
		const result = await markAsDelivered(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return NOT_FOUND when order does not exist", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		const result = await markAsDelivered(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when order is already delivered", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder({ status: "DELIVERED" }));
		const result = await markAsDelivered(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("livree");
	});

	it("should return error when order is not shipped", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(createShippedOrder({ status: "PROCESSING" }));
		const result = await markAsDelivered(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should succeed and send delivery email", async () => {
		const result = await markAsDelivered(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSendDeliveryEmail).toHaveBeenCalled();
		expect(result.message).toContain("Email");
	});

	it("should schedule review request email", async () => {
		await markAsDelivered(undefined, validFormData);
		expect(mockScheduleReviewEmail).toHaveBeenCalled();
	});

	it("should invalidate reviewable cache for user", async () => {
		await markAsDelivered(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith(expect.stringContaining("reviewable"));
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await markAsDelivered(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
