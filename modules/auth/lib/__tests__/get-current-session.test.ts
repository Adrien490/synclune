import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetSession, mockHeaders } = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockHeaders: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("server-only", () => ({}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: {
		api: {
			getSession: mockGetSession,
		},
	},
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

import { getSession } from "../get-current-session";

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_HEADERS_INSTANCE = new Headers({ cookie: "session=abc123" });

const MOCK_SESSION = {
	user: {
		id: "user-1",
		email: "user@example.com",
		name: "Marie Dupont",
		role: "USER",
	},
	session: {
		id: "session-abc",
		expiresAt: new Date("2030-01-01"),
	},
};

// ============================================================================
// TESTS
// ============================================================================

describe("getSession", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockHeaders.mockResolvedValue(MOCK_HEADERS_INSTANCE);
	});

	// ─── Returns session ──────────────────────────────────────────────────────

	it("returns the session object when auth.api.getSession resolves", async () => {
		mockGetSession.mockResolvedValue(MOCK_SESSION);

		const result = await getSession();

		expect(result).toEqual(MOCK_SESSION);
	});

	it("returns the user data within the session", async () => {
		mockGetSession.mockResolvedValue(MOCK_SESSION);

		const result = await getSession();

		expect(result?.user.id).toBe("user-1");
		expect(result?.user.email).toBe("user@example.com");
	});

	// ─── Passes headers ───────────────────────────────────────────────────────

	it("awaits headers() and passes the result to auth.api.getSession", async () => {
		mockGetSession.mockResolvedValue(MOCK_SESSION);

		await getSession();

		expect(mockHeaders).toHaveBeenCalledTimes(1);
		expect(mockGetSession).toHaveBeenCalledWith({
			headers: MOCK_HEADERS_INSTANCE,
		});
	});

	it("passes the exact headers instance returned by next/headers", async () => {
		const customHeaders = new Headers({ authorization: "Bearer token-xyz" });
		mockHeaders.mockResolvedValue(customHeaders);
		mockGetSession.mockResolvedValue(MOCK_SESSION);

		await getSession();

		expect(mockGetSession).toHaveBeenCalledWith({ headers: customHeaders });
	});

	// ─── No session ───────────────────────────────────────────────────────────

	it("returns null when auth.api.getSession resolves with null (unauthenticated)", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await getSession();

		expect(result).toBeNull();
	});

	it("returns undefined when auth.api.getSession resolves with undefined", async () => {
		mockGetSession.mockResolvedValue(undefined);

		const result = await getSession();

		expect(result).toBeUndefined();
	});

	// ─── Error propagation ────────────────────────────────────────────────────

	it("propagates errors thrown by auth.api.getSession", async () => {
		mockGetSession.mockRejectedValue(new Error("Auth service unavailable"));

		await expect(getSession()).rejects.toThrow("Auth service unavailable");
	});

	it("propagates errors thrown by headers()", async () => {
		mockHeaders.mockRejectedValue(new Error("headers() called outside request context"));

		await expect(getSession()).rejects.toThrow("headers() called outside request context");
	});
});
