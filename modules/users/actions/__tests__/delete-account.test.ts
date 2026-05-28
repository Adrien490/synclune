import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockAuth,
	mockHeaders,
	mockCookies,
	mockCookieDelete,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockBusinessError,
} = vi.hoisted(() => {
	const mockPrisma = {
		user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
		order: { count: vi.fn() },
		refund: { count: vi.fn() },
		session: { deleteMany: vi.fn() },
		// $transaction proxies tx.user/tx.session calls to the same mocks so
		// existing `mockPrisma.user.update.toHaveBeenCalled()` assertions still work.
		$transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
			return callback({
				user: { update: mockPrisma.user.update, count: mockPrisma.user.count },
				session: { deleteMany: mockPrisma.session.deleteMany },
			});
		}),
	};
	class MockBusinessError extends Error {
		code: string;
		constructor(message: string, code: string) {
			super(message);
			this.code = code;
		}
	}
	return {
		mockPrisma,
		mockRequireAuth: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockAuth: { api: { signOut: vi.fn() } },
		mockHeaders: vi.fn(),
		mockCookies: vi.fn(),
		mockCookieDelete: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockValidateInput: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
		mockBusinessError: MockBusinessError,
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	USER_LIMITS: { DELETE_ACCOUNT: "user-delete-account" },
}));
vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders, cookies: mockCookies }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/modules/products/constants/recent-searches", () => ({
	RECENT_SEARCHES_COOKIE_NAME: "recent-searches",
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	BusinessError: mockBusinessError,
}));
vi.mock("../../schemas/user.schemas", () => ({ deleteAccountSchema: {} }));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_CUSTOMERS_LIST: "admin-customers-list", ADMIN_BADGES: "admin-badges" },
}));
vi.mock("../../constants/cache", () => ({
	USERS_CACHE_TAGS: { CURRENT_USER: (id: string) => `current-user-${id}` },
}));

import { deleteAccount } from "../delete-account";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ confirmation: "SUPPRIMER MON COMPTE" });

// ============================================================================
// TESTS
// ============================================================================

describe("deleteAccount", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "user@example.com", name: "User", role: "USER" },
		});
		mockValidateInput.mockReturnValue({ data: { confirmation: "SUPPRIMER MON COMPTE" } });
		mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: "ACTIVE" });
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(0);
		mockPrisma.user.update.mockResolvedValue({});
		mockPrisma.user.count.mockResolvedValue(5); // 5 other admins by default
		mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation(
			async (callback: (tx: unknown) => Promise<unknown>) => {
				return callback({
					user: { update: mockPrisma.user.update, count: mockPrisma.user.count },
					session: { deleteMany: mockPrisma.session.deleteMany },
				});
			},
		);
		mockHeaders.mockResolvedValue(new Headers());
		mockCookies.mockResolvedValue({ delete: mockCookieDelete });
		mockAuth.api.signOut.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await deleteAccount(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await deleteAccount(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return validation error for wrong confirmation text", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await deleteAccount(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when deletion already pending (idempotence)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({ accountStatus: "PENDING_DELETION" });
		const result = await deleteAccount(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("déjà en cours");
	});

	it("should return error when user has pending orders", async () => {
		mockPrisma.order.count.mockResolvedValue(2);
		const result = await deleteAccount(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("2 commande");
	});

	it("should return error when user has in-flight refunds", async () => {
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(1);
		const result = await deleteAccount(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("remboursement");
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("should pass when refunds are all completed or cancelled", async () => {
		mockPrisma.order.count.mockResolvedValue(0);
		mockPrisma.refund.count.mockResolvedValue(0);
		const result = await deleteAccount(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should set PENDING_DELETION status", async () => {
		await deleteAccount(undefined, validFormData);
		expect(mockPrisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_USER_ID },
				data: expect.objectContaining({ accountStatus: "PENDING_DELETION" }),
			}),
		);
	});

	it("should sign out user after deletion request", async () => {
		await deleteAccount(undefined, validFormData);
		expect(mockAuth.api.signOut).toHaveBeenCalled();
	});

	it("should purge recent searches cookie (RGPD)", async () => {
		await deleteAccount(undefined, validFormData);
		expect(mockCookieDelete).toHaveBeenCalledWith("recent-searches");
	});

	it("should invalidate cache tags", async () => {
		await deleteAccount(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-customers-list");
	});

	it("should succeed with proper message", async () => {
		const result = await deleteAccount(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("30 jours");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await deleteAccount(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	/**
	 * @regression AUTH-ADMIN-002 — `deleteAccount` must revoke ALL sessions of the user,
	 * not only the device that emitted the request. Otherwise the iPhone session keeps
	 * working 7 days after the user requested deletion (RGPD Art. 17 violation).
	 */
	it("(AUTH-ADMIN-002) deletes all sessions for the user atomically in the transaction", async () => {
		await deleteAccount(undefined, validFormData);

		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
			where: { userId: VALID_USER_ID },
		});
	});

	it("(AUTH-ADMIN-002) session.deleteMany runs in the same transaction as user.update", async () => {
		await deleteAccount(undefined, validFormData);

		// Both calls should fire (they execute inside the $transaction callback)
		expect(mockPrisma.user.update).toHaveBeenCalled();
		expect(mockPrisma.session.deleteMany).toHaveBeenCalled();
	});

	/**
	 * @regression AUTH-ADMIN-004 — last admin cannot self-delete; mirrors the
	 * LAST_ADMIN check in `change-user-role.ts` to keep the back-office reachable.
	 */
	it("(AUTH-ADMIN-004) refuses deleteAccount if user is the LAST admin", async () => {
		mockRequireAuth.mockResolvedValue({
			user: {
				id: VALID_USER_ID,
				email: "admin@synclune.fr",
				name: "Last Admin",
				role: "ADMIN",
			},
		});
		// 0 other admins (this user is the last)
		mockPrisma.user.count.mockResolvedValue(0);

		const result = await deleteAccount(undefined, validFormData);

		// BusinessError → handleActionError → ERROR
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
		// user.update should NOT have been called because the transaction threw
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
		expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
	});

	it("(AUTH-ADMIN-004) allows admin to self-delete if other admins exist", async () => {
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "admin@synclune.fr", name: "Admin", role: "ADMIN" },
		});
		mockPrisma.user.count.mockResolvedValue(3); // 3 other admins

		const result = await deleteAccount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.user.update).toHaveBeenCalled();
		expect(mockPrisma.session.deleteMany).toHaveBeenCalled();
	});

	it("(AUTH-ADMIN-004) does NOT count admins for a regular USER", async () => {
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "u@example.com", name: "User", role: "USER" },
		});

		await deleteAccount(undefined, validFormData);

		expect(mockPrisma.user.count).not.toHaveBeenCalled();
		expect(mockPrisma.user.update).toHaveBeenCalled();
	});
});
