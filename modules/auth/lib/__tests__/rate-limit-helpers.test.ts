import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockHeaders,
	mockGetSession,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
} = vi.hoisted(() => ({
	mockHeaders: vi.fn(),
	mockGetSession: vi.fn(),
	mockCheckRateLimit: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockGetRateLimitIdentifier: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));

import { getRateLimitId, enforceRateLimitForCurrentUser } from "../rate-limit-helpers";
import type { RateLimitConfig } from "@/shared/lib/rate-limit";

// ============================================================================
// Fixtures
// ============================================================================

const MOCK_HEADERS = new Headers({ "x-forwarded-for": "1.2.3.4" });
const MOCK_IP = "1.2.3.4";
const MOCK_USER_ID = "user-abc";
const MOCK_LIMIT: RateLimitConfig = { limit: 10, windowMs: 60000 };

// ============================================================================
// getRateLimitId
// ============================================================================

describe("getRateLimitId", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(MOCK_HEADERS);
		mockGetClientIp.mockResolvedValue(MOCK_IP);
	});

	it("uses userId-based identifier when session is authenticated", async () => {
		mockGetSession.mockResolvedValue({ user: { id: MOCK_USER_ID } });
		mockGetRateLimitIdentifier.mockReturnValue(`user:${MOCK_USER_ID}`);

		const result = await getRateLimitId();

		expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith(MOCK_USER_ID, null, null);
		expect(result.identifier).toBe(`user:${MOCK_USER_ID}`);
	});

	it("returns the ipAddress from headers alongside the identifier", async () => {
		mockGetSession.mockResolvedValue({ user: { id: MOCK_USER_ID } });
		mockGetRateLimitIdentifier.mockReturnValue(`user:${MOCK_USER_ID}`);

		const result = await getRateLimitId();

		expect(result.ipAddress).toBe(MOCK_IP);
	});

	it("falls back to IP-based identifier when session is null", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetRateLimitIdentifier.mockReturnValue(`ip:${MOCK_IP}`);

		const result = await getRateLimitId();

		expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith(null, null, MOCK_IP);
		expect(result.identifier).toBe(`ip:${MOCK_IP}`);
	});

	it("falls back to IP when session user has no id", async () => {
		mockGetSession.mockResolvedValue({ user: {} });
		mockGetRateLimitIdentifier.mockReturnValue(`ip:${MOCK_IP}`);

		const result = await getRateLimitId();

		expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith(null, null, MOCK_IP);
		expect(result.identifier).toBe(`ip:${MOCK_IP}`);
	});

	it("falls back to IP when getSession throws", async () => {
		mockGetSession.mockRejectedValue(new Error("session unavailable"));
		mockGetRateLimitIdentifier.mockReturnValue(`ip:${MOCK_IP}`);

		const result = await getRateLimitId();

		expect(mockGetRateLimitIdentifier).toHaveBeenCalledWith(null, null, MOCK_IP);
		expect(result.identifier).toBe(`ip:${MOCK_IP}`);
	});

	it("returns null ipAddress when getClientIp returns null", async () => {
		mockGetClientIp.mockResolvedValue(null);
		mockGetSession.mockResolvedValue(null);
		mockGetRateLimitIdentifier.mockReturnValue("anonymous");

		const result = await getRateLimitId();

		expect(result.ipAddress).toBeNull();
	});

	it("passes the resolved headers list to getClientIp", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetRateLimitIdentifier.mockReturnValue("anonymous");

		await getRateLimitId();

		expect(mockGetClientIp).toHaveBeenCalledWith(MOCK_HEADERS);
	});
});

// ============================================================================
// enforceRateLimitForCurrentUser
// ============================================================================

describe("enforceRateLimitForCurrentUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockHeaders.mockResolvedValue(MOCK_HEADERS);
		mockGetClientIp.mockResolvedValue(MOCK_IP);
		mockGetSession.mockResolvedValue({ user: { id: MOCK_USER_ID } });
		mockGetRateLimitIdentifier.mockReturnValue(`user:${MOCK_USER_ID}`);
	});

	it("returns { success: true } when rate limit check passes", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9, limit: 10 });

		const result = await enforceRateLimitForCurrentUser(MOCK_LIMIT);

		expect(result).toEqual({ success: true });
	});

	it("returns { error: ActionState } when rate limit is exceeded", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			error: "Trop de requêtes. Veuillez réessayer dans 60 secondes.",
		});

		const result = await enforceRateLimitForCurrentUser(MOCK_LIMIT);

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error.status).toBe(ActionStatus.ERROR);
		}
	});

	it("uses the error message from the rate limit check result", async () => {
		const rateLimitError = "Trop de requêtes. Veuillez réessayer dans 60 secondes.";
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			error: rateLimitError,
		});

		const result = await enforceRateLimitForCurrentUser(MOCK_LIMIT);

		if ("error" in result) {
			expect(result.error.message).toBe(rateLimitError);
		}
	});

	it("falls back to default message when check has no error string", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			error: undefined,
		});

		const result = await enforceRateLimitForCurrentUser(MOCK_LIMIT);

		if ("error" in result) {
			expect(result.error.message).toBe("Trop de requêtes. Veuillez réessayer plus tard.");
		}
	});

	it("forwards the identifier and ipAddress to checkRateLimit", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9, limit: 10 });

		await enforceRateLimitForCurrentUser(MOCK_LIMIT);

		expect(mockCheckRateLimit).toHaveBeenCalledWith(`user:${MOCK_USER_ID}`, MOCK_LIMIT, MOCK_IP);
	});

	it("forwards the limit config to checkRateLimit", async () => {
		const customLimit: RateLimitConfig = { limit: 3, windowMs: 30000 };
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 2, limit: 3 });

		await enforceRateLimitForCurrentUser(customLimit);

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			expect.any(String),
			customLimit,
			expect.anything(),
		);
	});
});
