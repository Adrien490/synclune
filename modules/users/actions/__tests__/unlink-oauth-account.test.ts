import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockValidateInput,
	mockUpdateTag,
	mockSuccess,
	mockError,
	mockHandleActionError,
} = vi.hoisted(() => ({
	mockPrisma: {
		account: { findMany: vi.fn(), delete: vi.fn() },
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	USER_LIMITS: { UNLINK_OAUTH: "user-unlink-oauth" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../schemas/user-admin.schemas", () => ({ unlinkOAuthAccountSchema: {} }));
vi.mock("../../constants/cache", () => ({
	USERS_CACHE_TAGS: {
		CURRENT_USER: (id: string) => `current-user-${id}`,
		ACCOUNTS: (id: string) => `accounts-${id}`,
	},
	getCurrentUserInvalidationTags: (id: string) => [`current-user-${id}`],
}));

import { unlinkOAuthAccount } from "../unlink-oauth-account";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(providerId?: string): FormData {
	const fd = new FormData();
	if (providerId !== undefined) fd.set("providerId", providerId);
	return fd;
}

const USER_ID = "tz4a98xxat96iws9zmbrgj3a";

// ============================================================================
// TESTS
// ============================================================================

describe("unlinkOAuthAccount", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAuth.mockResolvedValue({ user: { id: USER_ID, email: "u@test.com" } });
		mockValidateInput.mockImplementation((_s: unknown, data: unknown) => ({
			data: data as { providerId: string },
		}));
		mockPrisma.account.findMany.mockResolvedValue([
			{ id: "acc-1", providerId: "credential" },
			{ id: "acc-2", providerId: "google" },
		]);
		mockPrisma.account.delete.mockResolvedValue({});

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

	it("should return rate limit error first", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await unlinkOAuthAccount(undefined, createFormData("google"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockRequireAuth).not.toHaveBeenCalled();
	});

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await unlinkOAuthAccount(undefined, createFormData("google"));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.account.findMany).not.toHaveBeenCalled();
	});

	it("should return validation error for missing provider", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Fournisseur requis" },
		});
		const result = await unlinkOAuthAccount(undefined, createFormData());
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should refuse to unlink credential provider", async () => {
		mockValidateInput.mockReturnValue({ data: { providerId: "credential" } });
		const result = await unlinkOAuthAccount(undefined, createFormData("credential"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("mot de passe"));
		expect(mockPrisma.account.delete).not.toHaveBeenCalled();
	});

	it("should return error when provider is not linked", async () => {
		mockValidateInput.mockReturnValue({ data: { providerId: "github" } });
		const result = await unlinkOAuthAccount(undefined, createFormData("github"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Aucun compte lie"));
		expect(mockPrisma.account.delete).not.toHaveBeenCalled();
	});

	it("should refuse to unlink when it is the only auth method", async () => {
		mockValidateInput.mockReturnValue({ data: { providerId: "google" } });
		mockPrisma.account.findMany.mockResolvedValue([{ id: "acc-2", providerId: "google" }]);

		const result = await unlinkOAuthAccount(undefined, createFormData("google"));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("seule methode"));
		expect(mockPrisma.account.delete).not.toHaveBeenCalled();
	});

	it("should unlink Google when credential + Google are linked", async () => {
		mockValidateInput.mockReturnValue({ data: { providerId: "google" } });
		const result = await unlinkOAuthAccount(undefined, createFormData("google"));

		expect(mockPrisma.account.delete).toHaveBeenCalledWith({ where: { id: "acc-2" } });
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("Google"));
	});

	it("should unlink one OAuth provider when two OAuth providers exist", async () => {
		mockValidateInput.mockReturnValue({ data: { providerId: "github" } });
		mockPrisma.account.findMany.mockResolvedValue([
			{ id: "acc-g", providerId: "google" },
			{ id: "acc-h", providerId: "github" },
		]);

		const result = await unlinkOAuthAccount(undefined, createFormData("github"));

		expect(mockPrisma.account.delete).toHaveBeenCalledWith({ where: { id: "acc-h" } });
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate user cache tags after unlink", async () => {
		mockValidateInput.mockReturnValue({ data: { providerId: "google" } });
		await unlinkOAuthAccount(undefined, createFormData("google"));

		expect(mockUpdateTag).toHaveBeenCalledWith(`current-user-${USER_ID}`);
		expect(mockUpdateTag).toHaveBeenCalledWith(`accounts-${USER_ID}`);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { providerId: "google" } });
		mockPrisma.account.findMany.mockRejectedValue(new Error("DB down"));
		const result = await unlinkOAuthAccount(undefined, createFormData("google"));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
