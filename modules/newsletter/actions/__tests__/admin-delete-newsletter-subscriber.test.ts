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
	mockNotFound,
	mockSafeFormGet,
	mockHandleActionError,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockSafeFormGet: vi.fn(),
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
	notFound: mockNotFound,
	safeFormGet: mockSafeFormGet,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_NEWSLETTER_LIMITS: { DELETE: "admin-newsletter-delete" },
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

import { adminDeleteNewsletterSubscriber } from "../admin-delete-newsletter-subscriber";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN = { user: { id: "admin_1", name: "Admin", email: "admin@test.fr" } };
const SUBSCRIBER_ID = "sub_1";

function makeFormData(id: string): FormData {
	const fd = new FormData();
	fd.set("subscriberId", id);
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("adminDeleteNewsletterSubscriber", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdminWithUser.mockResolvedValue(ADMIN);
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeFormGet.mockImplementation((fd: FormData, key: string) => fd.get(key));
		mockValidateInput.mockReturnValue({ data: { subscriberId: SUBSCRIBER_ID } });
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockNotFound.mockImplementation((msg: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("returns rate limit error when limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(result.message).toBe("Trop de requêtes");
	});

	it("returns validation error when Zod schema rejects ID", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.ERROR, message: "ID invalide" },
		});
		const result = await adminDeleteNewsletterSubscriber(undefined, makeFormData("invalid"));
		expect(result.message).toBe("ID invalide");
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled();
	});

	it("returns NOT_FOUND when subscriber does not exist", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);
		const result = await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("filters soft-deleted subscribers in findFirst WHERE clause", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "a@test.fr",
			userId: null,
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockPrisma.newsletterSubscriber.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("soft-deletes (sets deletedAt) instead of hard-delete (RGPD retention)", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "a@test.fr",
			userId: "user_a",
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			}),
		);
	});

	it("invalidates LIST cache tag and per-user tag when userId present", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "a@test.fr",
			userId: "user_a",
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user_a");
	});

	it("does not invalidate per-user tag when userId is null", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "a@test.fr",
			userId: null,
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		const userTagCalls = mockUpdateTag.mock.calls.filter((c: unknown[]) =>
			String(c[0]).startsWith("newsletter-user-"),
		);
		expect(userTagCalls).toHaveLength(0);
	});

	it("logs audit with email metadata", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "deleted@test.fr",
			userId: "user_a",
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "newsletter.adminDelete",
				targetType: "newsletter_subscriber",
				targetId: SUBSCRIBER_ID,
				metadata: { email: "deleted@test.fr" },
			}),
		);
	});

	it("returns success message including subscriber email", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "bye@test.fr",
			userId: null,
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		const result = await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockSuccess).toHaveBeenCalledWith("Abonné bye@test.fr supprimé.");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on DB failure", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB crash"));
		const result = await adminDeleteNewsletterSubscriber(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
