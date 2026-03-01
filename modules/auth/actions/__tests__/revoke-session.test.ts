import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAuth,
	mockEnforceRateLimit,
	mockPrisma,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockUpdateTag,
	mockGetAuthSessionInvalidationTags,
	mockSessionCacheTags,
} = vi.hoisted(() => ({
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockPrisma: {
		session: {
			findFirst: vi.fn(),
			delete: vi.fn(),
		},
	},
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetAuthSessionInvalidationTags: vi.fn(),
	mockSessionCacheTags: {
		SESSIONS: (userId: string) => `sessions-user-${userId}`,
	},
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ SESSION_REVOKE_LIMIT: {} }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/constants/cache-tags", () => ({
	SESSION_CACHE_TAGS: mockSessionCacheTags,
}));
vi.mock("@/modules/auth/utils/cache.utils", () => ({
	getAuthSessionInvalidationTags: mockGetAuthSessionInvalidationTags,
}));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	handleActionError: mockHandleActionError,
}));

import { revokeSession } from "../revoke-session";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_SESSION_ID = "session_cm1234567890abcde";

const validFormData = createMockFormData({
	sessionId: VALID_SESSION_ID,
});

const emptySessionIdFormData = createMockFormData({
	sessionId: "",
});

// ============================================================================
// TESTS
// ============================================================================

describe("revokeSession", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockEnforceRateLimit.mockResolvedValue({});
		mockValidateInput.mockReturnValue({ data: { sessionId: VALID_SESSION_ID } });
		mockPrisma.session.findFirst.mockResolvedValue({ id: VALID_SESSION_ID });
		mockPrisma.session.delete.mockResolvedValue({});
		mockGetAuthSessionInvalidationTags.mockReturnValue([
			"auth-sessions-list",
			`auth-session-${VALID_SESSION_ID}`,
			`auth-sessions-${VALID_USER_ID}`,
		]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non authentifié" },
		});
		const result = await revokeSession(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de tentatives" },
		});
		const result = await revokeSession(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("tentatives");
	});

	it("should return validation error when sessionId is missing", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "ID de session manquant" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await revokeSession(undefined, emptySessionIdFormData);
		expect(result).toEqual(valErr);
	});

	it("should return error when session is not found or belongs to another user", async () => {
		mockPrisma.session.findFirst.mockResolvedValue(null);
		const result = await revokeSession(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("introuvable");
	});

	it("should verify session belongs to the authenticated user", async () => {
		await revokeSession(undefined, validFormData);
		expect(mockPrisma.session.findFirst).toHaveBeenCalledWith({
			where: { id: VALID_SESSION_ID, userId: VALID_USER_ID },
			select: { id: true },
		});
	});

	it("should delete the session on success", async () => {
		await revokeSession(undefined, validFormData);
		expect(mockPrisma.session.delete).toHaveBeenCalledWith({
			where: { id: VALID_SESSION_ID },
		});
	});

	it("should invalidate SESSION_CACHE_TAGS.SESSIONS for the user on success", async () => {
		await revokeSession(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith(`sessions-user-${VALID_USER_ID}`);
	});

	it("should invalidate all auth session tags returned by getAuthSessionInvalidationTags", async () => {
		const tags = [
			"auth-sessions-list",
			`auth-session-${VALID_SESSION_ID}`,
			`auth-sessions-${VALID_USER_ID}`,
		];
		mockGetAuthSessionInvalidationTags.mockReturnValue(tags);
		await revokeSession(undefined, validFormData);
		tags.forEach((tag) => expect(mockUpdateTag).toHaveBeenCalledWith(tag));
	});

	it("should call getAuthSessionInvalidationTags with sessionId and userId", async () => {
		await revokeSession(undefined, validFormData);
		expect(mockGetAuthSessionInvalidationTags).toHaveBeenCalledWith(
			VALID_SESSION_ID,
			VALID_USER_ID,
		);
	});

	it("should return success with correct message", async () => {
		const result = await revokeSession(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("révoquée");
	});

	it("should handle DB errors via handleActionError", async () => {
		const dbError = new Error("Database connection failed");
		mockPrisma.session.delete.mockRejectedValue(dbError);
		await revokeSession(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalledWith(dbError, "Erreur lors de la révocation");
	});
});
