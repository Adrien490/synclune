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
	ADMIN_NEWSLETTER_LIMITS: { BULK_DELETE: "admin-newsletter-bulk-delete" },
}));
vi.mock("../../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: {
		LIST: "newsletter-subscribers-list",
		USER_STATUS: (uid: string) => `newsletter-user-${uid}`,
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { adminBulkDeleteNewsletterSubscribers } from "../admin-bulk-delete-newsletter-subscribers";

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

describe("adminBulkDeleteNewsletterSubscribers", () => {
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
		const result = await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.newsletterSubscriber.updateMany).not.toHaveBeenCalled();
	});

	it("returns rate limit error when limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(result.message).toBe("Trop de requêtes");
		expect(mockPrisma.newsletterSubscriber.findMany).not.toHaveBeenCalled();
	});

	it("returns validation error when Zod schema rejects IDs", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.ERROR, message: "ID invalide" },
		});
		const result = await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(result.message).toBe("ID invalide");
		expect(mockPrisma.newsletterSubscriber.findMany).not.toHaveBeenCalled();
	});

	it("returns error when no eligible subscribers found (already deleted)", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		const result = await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.newsletterSubscriber.updateMany).not.toHaveBeenCalled();
	});

	it("filters soft-deleted subscribers in findMany WHERE clause", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@test.fr", userId: "user_a" },
		]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 1 });
		await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(mockPrisma.newsletterSubscriber.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					deletedAt: null,
				}),
			}),
		);
	});

	it("soft-deletes (sets deletedAt) rather than hard-deleting (RGPD retention)", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@test.fr", userId: null },
		]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 1 });
		await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(mockPrisma.newsletterSubscriber.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			}),
		);
	});

	it("invalidates LIST cache tag and per-user tags for subscribers with userId", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@test.fr", userId: "user_a" },
			{ id: "sub_2", email: "b@test.fr", userId: "user_b" },
			{ id: "sub_3", email: "c@test.fr", userId: null },
		]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 3 });
		await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user_a");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user_b");
		const userTagCalls = mockUpdateTag.mock.calls.filter((c: unknown[]) =>
			String(c[0]).startsWith("newsletter-user-"),
		);
		expect(userTagCalls).toHaveLength(2);
	});

	it("logs audit with count metadata and joined targetId", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@test.fr", userId: "user_a" },
			{ id: "sub_2", email: "b@test.fr", userId: "user_b" },
		]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 2 });
		await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "newsletter.adminBulkDelete",
				targetType: "newsletter_subscriber",
				targetId: "sub_1,sub_2",
				metadata: { count: 2 },
			}),
		);
	});

	it("returns success with count and correct pluralization", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@test.fr", userId: null },
		]);
		mockPrisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 1 });
		const result = await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(mockSuccess).toHaveBeenCalledWith("1 abonné supprimé.", { count: 1 });
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on DB failure", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await adminBulkDeleteNewsletterSubscribers(undefined, makeFormData(IDS));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
