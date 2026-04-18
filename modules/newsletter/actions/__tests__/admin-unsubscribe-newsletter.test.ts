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
	ADMIN_NEWSLETTER_LIMITS: { UNSUBSCRIBE: "admin-newsletter-unsubscribe" },
}));
vi.mock("../../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: {
		LIST: "newsletter-subscribers-list",
		USER_STATUS: (uid: string) => `newsletter-user-${uid}`,
	},
}));
vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: { CONFIRMED: "CONFIRMED", PENDING: "PENDING", UNSUBSCRIBED: "UNSUBSCRIBED" },
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { adminUnsubscribeNewsletter } from "../admin-unsubscribe-newsletter";

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

describe("adminUnsubscribeNewsletter", () => {
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
		const result = await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("returns rate limit error when limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});
		const result = await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(result.message).toBe("Trop de requêtes");
	});

	it("returns validation error when Zod schema rejects ID", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.ERROR, message: "ID invalide" },
		});
		const result = await adminUnsubscribeNewsletter(undefined, makeFormData("invalid"));
		expect(result.message).toBe("ID invalide");
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled();
	});

	it("returns NOT_FOUND when subscriber does not exist", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);
		const result = await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("early-returns when subscriber is already UNSUBSCRIBED (idempotent)", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "a@test.fr",
			status: "UNSUBSCRIBED",
			userId: "user_a",
		});
		const result = await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
		expect(mockLogAudit).not.toHaveBeenCalled();
	});

	it("updates status to UNSUBSCRIBED and sets unsubscribedAt", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "a@test.fr",
			status: "CONFIRMED",
			userId: "user_a",
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: SUBSCRIBER_ID },
				data: expect.objectContaining({
					status: "UNSUBSCRIBED",
					unsubscribedAt: expect.any(Date),
				}),
			}),
		);
	});

	it("accepts PENDING subscribers (not just CONFIRMED)", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "a@test.fr",
			status: "PENDING",
			userId: null,
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		const result = await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalled();
	});

	it("invalidates LIST and per-user cache tags", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "a@test.fr",
			status: "CONFIRMED",
			userId: "user_a",
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user_a");
	});

	it("logs audit with previous status metadata", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: SUBSCRIBER_ID,
			email: "bye@test.fr",
			status: "CONFIRMED",
			userId: "user_a",
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "newsletter.adminUnsubscribe",
				metadata: { email: "bye@test.fr", previousStatus: "CONFIRMED" },
			}),
		);
	});

	it("calls handleActionError on DB failure", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB crash"));
		const result = await adminUnsubscribeNewsletter(undefined, makeFormData(SUBSCRIBER_ID));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
