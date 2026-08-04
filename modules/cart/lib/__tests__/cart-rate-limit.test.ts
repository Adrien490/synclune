import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockGetSession,
	mockHeaders,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockCheckRateLimit,
	mockGetGuestSessionId,
	mockGetOrCreateGuestSessionId,
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockGetRateLimitIdentifier: vi.fn(),
	mockCheckRateLimit: vi.fn(),
	mockGetGuestSessionId: vi.fn(),
	mockGetOrCreateGuestSessionId: vi.fn(),
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
	checkRateLimit: mockCheckRateLimit,
}));

vi.mock("../guest-session", () => ({
	getGuestSessionId: mockGetGuestSessionId,
	getOrCreateGuestSessionId: mockGetOrCreateGuestSessionId,
}));

import { checkCartRateLimit } from "../cart-rate-limit";
import { ActionStatus } from "@/shared/types/server-action";
import type { RateLimitConfig } from "@/shared/lib/rate-limit";

// ============================================================================
// Constants
// ============================================================================

const MOCK_LIMIT_CONFIG: RateLimitConfig = { name: "test", limit: 10, windowMs: 60000 };
const MOCK_HEADERS = {} as Headers;
const MOCK_IP = "1.2.3.4";
const MOCK_USER_ID = "user-123";
const MOCK_SESSION_ID = "session-abc";
const MOCK_RATE_LIMIT_ID = "user:user-123";

// ============================================================================
// Helpers
// ============================================================================

function makeRateLimitSuccess() {
	return { success: true as const, remaining: 9, limit: 10, reset: Date.now() + 60000 };
}

function makeRateLimitFailure(error?: string) {
	return {
		success: false as const,
		remaining: 0,
		limit: 10,
		reset: Date.now() + 60000,
		retryAfter: 30,
		error: error ?? "Trop de requêtes. Veuillez réessayer dans 30 secondes.",
	};
}

// ============================================================================
// Tests: checkCartRateLimit
// ============================================================================

describe("checkCartRateLimit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(MOCK_HEADERS);
		mockGetClientIp.mockResolvedValue(MOCK_IP);
		mockGetRateLimitIdentifier.mockReturnValue(MOCK_RATE_LIMIT_ID);
		mockCheckRateLimit.mockResolvedValue(makeRateLimitSuccess());
	});

	describe("authenticated user", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue({ user: { id: MOCK_USER_ID } });
		});

		it("returns success with userId in context", async () => {
			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.context.userId).toBe(MOCK_USER_ID);
			}
		});

		it("does not call getGuestSessionId when user is authenticated", async () => {
			await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(mockGetGuestSessionId).not.toHaveBeenCalled();
			expect(mockGetOrCreateGuestSessionId).not.toHaveBeenCalled();
		});

		it("sets sessionId to null for authenticated user", async () => {
			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.context.sessionId).toBeNull();
			}
		});

		it("includes ipAddress in context", async () => {
			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.context.ipAddress).toBe(MOCK_IP);
			}
		});

		it("calls getRateLimitIdentifier with userId, null sessionId and ipAddress", async () => {
			await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith(MOCK_USER_ID, null, MOCK_IP);
		});

		it("calls checkRateLimit with the computed identifier, limitConfig and ipAddress", async () => {
			await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(mockCheckRateLimit).toHaveBeenCalledWith(
				MOCK_RATE_LIMIT_ID,
				MOCK_LIMIT_CONFIG,
				MOCK_IP,
			);
		});
	});

	describe("anonymous user (no session)", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue(null);
			mockGetGuestSessionId.mockResolvedValue(MOCK_SESSION_ID);
			mockGetRateLimitIdentifier.mockReturnValue(`session:${MOCK_SESSION_ID}`);
		});

		it("calls getGuestSessionId when createSessionIfMissing is false (default)", async () => {
			await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(mockGetGuestSessionId).toHaveBeenCalledOnce();
			expect(mockGetOrCreateGuestSessionId).not.toHaveBeenCalled();
		});

		it("calls getGuestSessionId when createSessionIfMissing is explicitly false", async () => {
			await checkCartRateLimit(MOCK_LIMIT_CONFIG, { createSessionIfMissing: false });

			expect(mockGetGuestSessionId).toHaveBeenCalledOnce();
			expect(mockGetOrCreateGuestSessionId).not.toHaveBeenCalled();
		});

		it("returns success with sessionId from cookie", async () => {
			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.context.sessionId).toBe(MOCK_SESSION_ID);
				expect(result.context.userId).toBeUndefined();
			}
		});

		it("calls getRateLimitIdentifier with undefined userId, sessionId and ipAddress", async () => {
			await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith(undefined, MOCK_SESSION_ID, MOCK_IP);
		});
	});

	describe("createSessionIfMissing option", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue(null);
			mockGetOrCreateGuestSessionId.mockResolvedValue(MOCK_SESSION_ID);
		});

		it("calls getOrCreateGuestSessionId when createSessionIfMissing is true", async () => {
			await checkCartRateLimit(MOCK_LIMIT_CONFIG, { createSessionIfMissing: true });

			expect(mockGetOrCreateGuestSessionId).toHaveBeenCalledOnce();
			expect(mockGetGuestSessionId).not.toHaveBeenCalled();
		});

		it("returns the session ID created by getOrCreateGuestSessionId", async () => {
			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG, { createSessionIfMissing: true });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.context.sessionId).toBe(MOCK_SESSION_ID);
			}
		});
	});

	describe("rate limit exceeded", () => {
		beforeEach(() => {
			mockGetSession.mockResolvedValue({ user: { id: MOCK_USER_ID } });
		});

		it("returns success: false when rate limit is exceeded", async () => {
			mockCheckRateLimit.mockResolvedValue(makeRateLimitFailure());

			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(result.success).toBe(false);
		});

		it("returns errorState with ActionStatus.ERROR when rate limit is exceeded", async () => {
			mockCheckRateLimit.mockResolvedValue(makeRateLimitFailure());

			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errorState.status).toBe(ActionStatus.ERROR);
			}
		});

		it("uses the error message from checkRateLimit when provided", async () => {
			const customError = "Limite dépassée, réessayez dans 1 minute.";
			mockCheckRateLimit.mockResolvedValue(makeRateLimitFailure(customError));

			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errorState.message).toBe(customError);
			}
		});

		it("uses the default fallback message when checkRateLimit error is undefined", async () => {
			mockCheckRateLimit.mockResolvedValue({
				...makeRateLimitFailure(),
				error: undefined,
			});

			const result = await checkCartRateLimit(MOCK_LIMIT_CONFIG);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errorState.message).toBe("Trop de requêtes. Veuillez réessayer plus tard.");
			}
		});
	});
});

// La suite `checkMergeCartsRateLimit` est partie avec la fonction (audit wishlist
// 2026-08-01) : son unique caller `merge-carts` a disparu avec l'espace client.
