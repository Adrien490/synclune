import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockNotFound,
	mockHandleActionError,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: { findUnique: vi.fn() },
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (fd: FormData, key: string) => {
		const v = fd.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_NEWSLETTER_LIMITS: { GDPR_EXPORT: "admin-newsletter-gdpr" },
}));
vi.mock("../../schemas/newsletter.schemas", () => ({ gdprExportSubscriberSchema: {} }));

import { gdprExportSubscriberData } from "../gdpr-export-subscriber-data";

const ADMIN = { user: { id: "admin_1", name: "Admin", email: "admin@test.fr" } };

function fd(email: string) {
	const f = new FormData();
	f.set("email", email);
	return f;
}

describe("gdprExportSubscriberData", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdminWithUser.mockResolvedValue(ADMIN);
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { email: "buyer@test.fr" } });
		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
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
		const result = await gdprExportSubscriberData(undefined, fd("a@b.fr"));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "RL" },
		});
		const result = await gdprExportSubscriberData(undefined, fd("a@b.fr"));
		expect(result.message).toBe("RL");
	});

	it("returns notFound when no subscriber matches email", async () => {
		mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue(null);
		const result = await gdprExportSubscriberData(undefined, fd("a@b.fr"));
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("includes soft-deleted subscribers (RGPD article 15)", async () => {
		mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue({
			id: "sub_1",
			email: "buyer@test.fr",
			status: "UNSUBSCRIBED",
			userId: null,
			ipAddress: "1.2.3.4",
			confirmationIpAddress: null,
			userAgent: "test",
			consentSource: "newsletter_form",
			consentTimestamp: new Date("2025-01-01"),
			subscribedAt: new Date("2025-01-01"),
			confirmedAt: null,
			unsubscribedAt: new Date("2025-06-01"),
			createdAt: new Date("2025-01-01"),
			updatedAt: new Date("2025-06-01"),
			deletedAt: new Date("2025-07-01"),
		});
		await gdprExportSubscriberData(undefined, fd("buyer@test.fr"));
		expect(mockPrisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
			where: { email: "buyer@test.fr" },
		});
	});

	it("returns full subscriber payload in success data", async () => {
		mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue({
			id: "sub_1",
			email: "buyer@test.fr",
			status: "CONFIRMED",
			userId: null,
			ipAddress: "1.2.3.4",
			confirmationIpAddress: "1.2.3.4",
			userAgent: "test",
			consentSource: "newsletter_form",
			consentTimestamp: new Date("2025-01-01"),
			subscribedAt: new Date("2025-01-01"),
			confirmedAt: new Date("2025-01-02"),
			unsubscribedAt: null,
			createdAt: new Date("2025-01-01"),
			updatedAt: new Date("2025-01-02"),
			deletedAt: null,
		});
		const result = await gdprExportSubscriberData(undefined, fd("buyer@test.fr"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toMatchObject({
			gdprArticle: expect.stringContaining("Article 15"),
			subscriber: { email: "buyer@test.fr", status: "CONFIRMED" },
		});
	});

	it("logs audit on export", async () => {
		mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue({
			id: "sub_1",
			email: "buyer@test.fr",
			status: "CONFIRMED",
			userId: null,
			ipAddress: null,
			confirmationIpAddress: null,
			userAgent: null,
			consentSource: null,
			consentTimestamp: new Date(),
			subscribedAt: new Date(),
			confirmedAt: new Date(),
			unsubscribedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null,
		});
		await gdprExportSubscriberData(undefined, fd("buyer@test.fr"));
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "newsletter.gdprExport",
				metadata: { email: "buyer@test.fr" },
			}),
		);
	});
});
