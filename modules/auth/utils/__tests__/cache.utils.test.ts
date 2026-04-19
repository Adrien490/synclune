import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	AUTH_CACHE_TAGS: {
		SESSIONS_LIST: "auth-sessions-list",
		SESSION: (id: string) => `auth-session-${id}`,
		SESSIONS_USER: (userId: string) => `auth-sessions-${userId}`,
		VERIFICATIONS_LIST: "auth-verifications-list",
		USER_PROVIDERS: (userId: string) => `user-providers-${userId}`,
	},
}));

import {
	cacheAuthSessions,
	cacheAuthSession,
	cacheAuthVerifications,
	getAuthSessionInvalidationTags,
	getAuthVerificationInvalidationTags,
	getUserProvidersInvalidationTags,
} from "../cache.utils";

// ============================================================================
// cacheAuthSessions
// ============================================================================

describe("cacheAuthSessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls cacheLife with 'dashboard'", () => {
		cacheAuthSessions();

		expect(mockCacheLife).toHaveBeenCalledWith("user");
	});

	it("tags with SESSIONS_USER when userId is provided", () => {
		cacheAuthSessions("user-42");

		expect(mockCacheTag).toHaveBeenCalledWith("auth-sessions-user-42");
	});

	it("tags with SESSIONS_LIST when no userId is provided", () => {
		cacheAuthSessions();

		expect(mockCacheTag).toHaveBeenCalledWith("auth-sessions-list");
	});

	it("tags with SESSIONS_LIST when userId is undefined", () => {
		cacheAuthSessions(undefined);

		expect(mockCacheTag).toHaveBeenCalledWith("auth-sessions-list");
	});

	it("does not call SESSIONS_LIST tag when userId is provided", () => {
		cacheAuthSessions("user-1");

		const calls = mockCacheTag.mock.calls.map((c) => c[0]);
		expect(calls).not.toContain("auth-sessions-list");
	});
});

// ============================================================================
// cacheAuthSession
// ============================================================================

describe("cacheAuthSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls cacheLife with 'dashboard'", () => {
		cacheAuthSession("session-99");

		expect(mockCacheLife).toHaveBeenCalledWith("user");
	});

	it("tags with SESSION(sessionId)", () => {
		cacheAuthSession("session-99");

		expect(mockCacheTag).toHaveBeenCalledWith("auth-session-session-99");
	});

	it("uses the provided sessionId in the tag", () => {
		cacheAuthSession("abc-123");

		expect(mockCacheTag).toHaveBeenCalledWith("auth-session-abc-123");
	});
});

// ============================================================================
// cacheAuthVerifications
// ============================================================================

describe("cacheAuthVerifications", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls cacheLife with 'dashboard'", () => {
		cacheAuthVerifications();

		expect(mockCacheLife).toHaveBeenCalledWith("user");
	});

	it("tags with VERIFICATIONS_LIST", () => {
		cacheAuthVerifications();

		expect(mockCacheTag).toHaveBeenCalledWith("auth-verifications-list");
	});
});

// ============================================================================
// getAuthSessionInvalidationTags
// ============================================================================

describe("getAuthSessionInvalidationTags", () => {
	it("always includes SESSIONS_LIST tag", () => {
		const tags = getAuthSessionInvalidationTags();

		expect(tags).toContain("auth-sessions-list");
	});

	it("returns only SESSIONS_LIST when no sessionId and no userId", () => {
		const tags = getAuthSessionInvalidationTags();

		expect(tags).toEqual(["auth-sessions-list"]);
	});

	it("includes SESSION(sessionId) when sessionId is provided", () => {
		const tags = getAuthSessionInvalidationTags("session-7");

		expect(tags).toContain("auth-session-session-7");
	});

	it("includes SESSIONS_USER(userId) when userId is provided", () => {
		const tags = getAuthSessionInvalidationTags(undefined, "user-5");

		expect(tags).toContain("auth-sessions-user-5");
	});

	it("includes all three tags when both sessionId and userId are provided", () => {
		const tags = getAuthSessionInvalidationTags("session-7", "user-5");

		expect(tags).toEqual(["auth-sessions-list", "auth-session-session-7", "auth-sessions-user-5"]);
	});

	it("returns tags in order: SESSIONS_LIST, SESSION, SESSIONS_USER", () => {
		const tags = getAuthSessionInvalidationTags("s-1", "u-1");

		expect(tags[0]).toBe("auth-sessions-list");
		expect(tags[1]).toBe("auth-session-s-1");
		expect(tags[2]).toBe("auth-sessions-u-1");
	});
});

// ============================================================================
// getAuthVerificationInvalidationTags
// ============================================================================

describe("getAuthVerificationInvalidationTags", () => {
	it("returns an array containing VERIFICATIONS_LIST", () => {
		const tags = getAuthVerificationInvalidationTags();

		expect(tags).toEqual(["auth-verifications-list"]);
	});

	it("returns exactly one tag", () => {
		const tags = getAuthVerificationInvalidationTags();

		expect(tags).toHaveLength(1);
	});
});

// ============================================================================
// getUserProvidersInvalidationTags
// ============================================================================

describe("getUserProvidersInvalidationTags", () => {
	it("returns USER_PROVIDERS tag for the given userId", () => {
		const tags = getUserProvidersInvalidationTags("user-99");

		expect(tags).toEqual(["user-providers-user-99"]);
	});

	it("returns exactly one tag", () => {
		const tags = getUserProvidersInvalidationTags("user-1");

		expect(tags).toHaveLength(1);
	});

	it("uses the provided userId in the tag value", () => {
		const tags = getUserProvidersInvalidationTags("abc-xyz");

		expect(tags[0]).toBe("user-providers-abc-xyz");
	});
});
