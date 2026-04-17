import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockLogAudit: vi.fn(),
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
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_NEWSLETTER_LIMITS: { UNSUBSCRIBE: "admin-newsletter-unsubscribe" },
}));
vi.mock("../../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: {
		LIST: "newsletter-subscribers-list",
		USER_STATUS: (uid: string) => `newsletter-user-${uid}`,
	},
}));
vi.mock("../../schemas/newsletter.schemas", () => ({ adminBulkUnsubscribeSchema: {} }));
vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: { CONFIRMED: "CONFIRMED", PENDING: "PENDING", UNSUBSCRIBED: "UNSUBSCRIBED" },
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { adminBulkUnsubscribeNewsletter } from "../admin-bulk-unsubscribe-newsletter";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN = { user: { id: "admin_1", name: "Admin", email: "admin@test.fr" } };
const IDS = ["sub_1", "sub_2", "sub_3"];

function makeFormData(ids: string[]): FormData {
	const fd = new FormData();
	for (const id of ids) fd.append("subscriberIds", id);
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("adminBulkUnsubscribeNewsletter", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdminWithUser.mockResolvedValue(ADMIN);
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { subscriberIds: IDS } });
		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.newsletterSubscriber.updateMany).not.toHaveBeenCalled();
	});

	it("returns rate limit error when limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(result.message).toBe("Trop de requêtes");
	});

	it("returns validation error when Zod schema rejects IDs", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.ERROR, message: "ID invalide" },
		});
		const result = await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(result.message).toBe("ID invalide");
		expect(mockPrisma.newsletterSubscriber.updateMany).not.toHaveBeenCalled();
	});

	it("returns error when no eligible subscribers found", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		const result = await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.newsletterSubscriber.updateMany).not.toHaveBeenCalled();
	});

	it("filters non-UNSUBSCRIBED subscribers in findMany WHERE clause", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([{ id: "sub_1", userId: "user_a" }]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 1 });
		await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(mockPrisma.newsletterSubscriber.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: { not: "UNSUBSCRIBED" },
					deletedAt: null,
				}),
			}),
		);
	});

	it("invalidates LIST cache tag and per-user cache tags", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", userId: "user_a" },
			{ id: "sub_2", userId: "user_b" },
			{ id: "sub_3", userId: null },
		]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 3 });
		await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user_a");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user_b");
	});

	it("does not invalidate per-user tags when subscribers have no userId", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", userId: null },
			{ id: "sub_2", userId: null },
		]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 2 });
		await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		const userTagCalls = mockUpdateTag.mock.calls.filter((c: unknown[]) =>
			String(c[0]).startsWith("newsletter-user-"),
		);
		expect(userTagCalls).toHaveLength(0);
	});

	it("logs audit with correct metadata", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", userId: "user_a" },
			{ id: "sub_2", userId: "user_b" },
		]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 2 });
		await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "newsletter.adminBulkUnsubscribe",
				targetType: "newsletter_subscriber",
				metadata: { count: 2, requestedCount: 3 },
			}),
		);
	});

	it("returns success with count and pluralization", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([{ id: "sub_1", userId: "user_a" }]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 1 });
		const result = await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("1 abonné désabonné"), {
			count: 1,
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on DB failure", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await adminBulkUnsubscribeNewsletter(undefined, makeFormData(IDS));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
