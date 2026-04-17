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
} = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: { findUnique: vi.fn(), update: vi.fn() },
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
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
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
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_NEWSLETTER_LIMITS: { RESTORE: "admin-newsletter-restore" },
}));
vi.mock("../../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: {
		LIST: "newsletter-subscribers-list",
		USER_STATUS: (uid: string) => `newsletter-user-${uid}`,
	},
}));
vi.mock("../../schemas/newsletter.schemas", () => ({ adminRestoreSubscriberSchema: {} }));

import { adminRestoreSubscriber } from "../admin-restore-subscriber";

const ADMIN = { user: { id: "admin_1", name: "Admin", email: "admin@test.fr" } };

function fd(id: string) {
	const f = new FormData();
	f.set("subscriberId", id);
	return f;
}

describe("adminRestoreSubscriber", () => {
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
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await adminRestoreSubscriber(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns notFound when subscriber missing", async () => {
		mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue(null);
		const result = await adminRestoreSubscriber(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("returns error when subscriber is not soft-deleted (idempotent guard)", async () => {
		mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue({
			id: "sub_1",
			email: "a@b.fr",
			userId: null,
			deletedAt: null,
		});
		const result = await adminRestoreSubscriber(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("clears deletedAt and invalidates cache on success", async () => {
		mockPrisma.newsletterSubscriber.findUnique.mockResolvedValue({
			id: "sub_1",
			email: "a@b.fr",
			userId: "user_x",
			deletedAt: new Date("2025-01-01"),
		});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
		const result = await adminRestoreSubscriber(undefined, fd("sub_1"));
		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith({
			where: { id: "sub_1" },
			data: { deletedAt: null },
		});
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-user-user_x");
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({ action: "newsletter.adminRestore" }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on DB exception", async () => {
		mockPrisma.newsletterSubscriber.findUnique.mockRejectedValue(new Error("DB"));
		const result = await adminRestoreSubscriber(undefined, fd("sub_1"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});
