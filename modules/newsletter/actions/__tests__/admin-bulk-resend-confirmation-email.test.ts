import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

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
	mockSendEmail,
} = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: { findMany: vi.fn(), update: vi.fn() },
		$transaction: vi.fn((promises: unknown[]) => Promise.all(promises)),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockLogAudit: vi.fn(),
	mockSendEmail: vi.fn(),
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
vi.mock("@/shared/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_NEWSLETTER_LIMITS: { BULK_RESEND: "admin-newsletter-bulk-resend" },
}));
vi.mock("@/modules/emails/services/newsletter-emails", () => ({
	sendNewsletterConfirmationEmail: mockSendEmail,
}));
vi.mock("../../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: {
		LIST: "newsletter-subscribers-list",
		USER_STATUS: (uid: string) => `newsletter-user-${uid}`,
	},
}));
vi.mock("../../constants/urls.constants", () => ({ NEWSLETTER_BASE_URL: "https://test.fr" }));
vi.mock("../../schemas/newsletter.schemas", () => ({ adminBulkResendConfirmationSchema: {} }));
vi.mock("@/shared/constants/urls", () => ({
	ROUTES: { NEWSLETTER: { CONFIRM: "/newsletter/confirmer" } },
}));
vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: { CONFIRMED: "CONFIRMED", PENDING: "PENDING", UNSUBSCRIBED: "UNSUBSCRIBED" },
}));

import { adminBulkResendConfirmationEmail } from "../admin-bulk-resend-confirmation-email";

const ADMIN = { user: { id: "admin_1", name: "Admin", email: "admin@test.fr" } };
const IDS = ["sub_1", "sub_2", "sub_3"];

function makeFd(ids: string[]) {
	const fd = new FormData();
	for (const id of ids) fd.append("subscriberIds", id);
	return fd;
}

describe("adminBulkResendConfirmationEmail", () => {
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
		mockPrisma.$transaction.mockImplementation((promises: unknown[]) => Promise.all(promises));
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await adminBulkResendConfirmationEmail(undefined, makeFd(IDS));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns error when no eligible PENDING subscriber found", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
		const result = await adminBulkResendConfirmationEmail(undefined, makeFd(IDS));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockSendEmail).not.toHaveBeenCalled();
	});

	it("filters PENDING + cooldown 1h in WHERE clause", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@b.fr", userId: null },
		]);
		mockSendEmail.mockResolvedValue({ success: true, data: { id: "e1" } });
		await adminBulkResendConfirmationEmail(undefined, makeFd(IDS));
		expect(mockPrisma.newsletterSubscriber.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: "PENDING",
					deletedAt: null,
					OR: expect.arrayContaining([
						{ confirmationSentAt: null },
						expect.objectContaining({ confirmationSentAt: expect.any(Object) }),
					]),
				}),
			}),
		);
	});

	it("sends emails via Promise.allSettled and counts sent/failed", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@b.fr", userId: "u1" },
			{ id: "sub_2", email: "c@d.fr", userId: "u2" },
		]);
		mockSendEmail
			.mockResolvedValueOnce({ success: true, data: { id: "e1" } })
			.mockResolvedValueOnce({ success: false, error: new Error("Resend down") });
		const result = await adminBulkResendConfirmationEmail(undefined, makeFd(IDS));
		expect(mockSendEmail).toHaveBeenCalledTimes(2);
		expect(result.data).toMatchObject({ sent: 1, failed: 1, skipped: 1 });
	});

	it("invalidates LIST + per-user cache tags for eligible subscribers", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@b.fr", userId: "u1" },
			{ id: "sub_2", email: "c@d.fr", userId: null },
		]);
		mockSendEmail.mockResolvedValue({ success: true, data: { id: "e" } });
		await adminBulkResendConfirmationEmail(undefined, makeFd(IDS));
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-u1");
	});

	it("logs audit with sent/failed/skipped metadata", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
			{ id: "sub_1", email: "a@b.fr", userId: null },
		]);
		mockSendEmail.mockResolvedValue({ success: true, data: { id: "e" } });
		await adminBulkResendConfirmationEmail(undefined, makeFd(IDS));
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "newsletter.adminBulkResend",
				metadata: expect.objectContaining({
					requestedCount: 3,
					eligibleCount: 1,
					sent: 1,
					failed: 0,
					skipped: 2,
				}),
			}),
		);
	});

	it("calls handleActionError on DB exception", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockRejectedValue(new Error("DB"));
		const result = await adminBulkResendConfirmationEmail(undefined, makeFd(IDS));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
