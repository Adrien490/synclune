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
	mockNotFound,
	mockHandleActionError,
	mockLogAudit,
	mockSendEmail,
} = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: { findFirst: vi.fn(), update: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
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
	safeFormGet: (fd: FormData, key: string) => {
		const v = fd.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_NEWSLETTER_LIMITS: { RESEND_CONFIRMATION: "admin-newsletter-resend" },
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
vi.mock("../../schemas/newsletter.schemas", () => ({ adminResendConfirmationSchema: {} }));
vi.mock("@/shared/constants/urls", () => ({
	ROUTES: { NEWSLETTER: { CONFIRM: "/newsletter/confirmer" } },
}));
vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: { CONFIRMED: "CONFIRMED", PENDING: "PENDING", UNSUBSCRIBED: "UNSUBSCRIBED" },
}));

import { adminResendConfirmationEmail } from "../admin-resend-confirmation-email";

const ADMIN = { user: { id: "admin_1", name: "Admin", email: "admin@test.fr" } };

function fd(id: string) {
	const f = new FormData();
	f.set("subscriberId", id);
	return f;
}

describe("adminResendConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdminWithUser.mockResolvedValue(ADMIN);
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { subscriberId: "sub_1" } });
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((msg: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockSendEmail.mockResolvedValue({ success: true, data: { id: "email_1" } });
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await adminResendConfirmationEmail(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "RL" },
		});
		const result = await adminResendConfirmationEmail(undefined, fd("sub_1"));
		expect(result.message).toBe("RL");
	});

	it("returns notFound when subscriber missing", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);
		const result = await adminResendConfirmationEmail(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("rejects subscriber that is already CONFIRMED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: "sub_1",
			email: "a@b.fr",
			status: "CONFIRMED",
			userId: null,
			confirmationSentAt: null,
		});
		const result = await adminResendConfirmationEmail(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("rejects subscriber that is UNSUBSCRIBED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: "sub_1",
			email: "a@b.fr",
			status: "UNSUBSCRIBED",
			userId: null,
			confirmationSentAt: null,
		});
		const result = await adminResendConfirmationEmail(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("respects 1h cooldown when confirmationSentAt is recent", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: "sub_1",
			email: "a@b.fr",
			status: "PENDING",
			userId: null,
			confirmationSentAt: new Date(Date.now() - 30 * 60 * 1000),
		});
		const result = await adminResendConfirmationEmail(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockSendEmail).not.toHaveBeenCalled();
	});

	it("regenerates token, sends email, and invalidates per-user cache on success", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue({
			id: "sub_1",
			email: "a@b.fr",
			status: "PENDING",
			userId: "user_x",
			confirmationSentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		const result = await adminResendConfirmationEmail(undefined, fd("sub_1"));
		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalled();
		expect(mockSendEmail).toHaveBeenCalledWith(
			expect.objectContaining({ to: "a@b.fr", confirmationUrl: expect.stringContaining("token=") }),
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user_x");
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "newsletter.adminResendConfirmation" }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on DB exception", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB"));
		const result = await adminResendConfirmationEmail(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
