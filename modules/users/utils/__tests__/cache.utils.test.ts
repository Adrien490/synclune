import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const mockCacheLife = vi.fn();
const mockCacheTag = vi.fn();

vi.mock("next/cache", () => ({
	cacheLife: (...args: unknown[]) => mockCacheLife(...args),
	cacheTag: (...args: unknown[]) => mockCacheTag(...args),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
	cacheCurrentUser,
	cacheUserAccounts,
	getCurrentUserInvalidationTags,
	getUserSessionsInvalidationTags,
	getUserAccountsInvalidationTags,
	getAdminAccountsListInvalidationTags,
	getUserFullInvalidationTags,
} from "../cache.utils";

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// cacheCurrentUser
// ============================================================================

describe("cacheCurrentUser", () => {
	it("sets dashboard cache life and CURRENT_USER tag", () => {
		cacheCurrentUser("user-123");

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
		expect(mockCacheTag).toHaveBeenCalledWith("user-user-123");
	});

	it("uses the userId in the tag", () => {
		cacheCurrentUser("user-abc");

		expect(mockCacheTag).toHaveBeenCalledWith("user-user-abc");
	});
});

// ============================================================================
// cacheUserAccounts
// ============================================================================

describe("cacheUserAccounts", () => {
	it("sets dashboard cache life and ACCOUNTS tag", () => {
		cacheUserAccounts("user-123");

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
		expect(mockCacheTag).toHaveBeenCalledWith("accounts-user-user-123");
	});

	it("uses the userId in the tag", () => {
		cacheUserAccounts("user-xyz");

		expect(mockCacheTag).toHaveBeenCalledWith("accounts-user-user-xyz");
	});
});

// ============================================================================
// getCurrentUserInvalidationTags
// ============================================================================

describe("getCurrentUserInvalidationTags", () => {
	it("returns CURRENT_USER tag for the given userId", () => {
		const tags = getCurrentUserInvalidationTags("user-123");

		expect(tags).toEqual(["user-user-123"]);
	});

	it("uses userId in the returned tag", () => {
		const tags = getCurrentUserInvalidationTags("user-abc");

		expect(tags[0]).toBe("user-user-abc");
	});
});

// ============================================================================
// getUserSessionsInvalidationTags
// ============================================================================

describe("getUserSessionsInvalidationTags", () => {
	it("returns SESSIONS tag for the given userId", () => {
		const tags = getUserSessionsInvalidationTags("user-123");

		expect(tags).toEqual(["sessions-user-user-123"]);
	});

	it("uses userId in the returned tag", () => {
		const tags = getUserSessionsInvalidationTags("user-xyz");

		expect(tags[0]).toBe("sessions-user-user-xyz");
	});
});

// ============================================================================
// getUserAccountsInvalidationTags
// ============================================================================

describe("getUserAccountsInvalidationTags", () => {
	it("returns ACCOUNTS tag for the given userId", () => {
		const tags = getUserAccountsInvalidationTags("user-123");

		expect(tags).toEqual(["accounts-user-user-123"]);
	});
});

// ============================================================================
// getAdminAccountsListInvalidationTags
// ============================================================================

describe("getAdminAccountsListInvalidationTags", () => {
	it("returns the accounts-list tag", () => {
		const tags = getAdminAccountsListInvalidationTags();

		expect(tags).toEqual(["accounts-list"]);
	});
});

// ============================================================================
// getUserFullInvalidationTags
// ============================================================================

describe("getUserFullInvalidationTags", () => {
	it("returns CURRENT_USER, SESSION, and SESSIONS tags", () => {
		const tags = getUserFullInvalidationTags("user-123");

		expect(tags).toContain("user-user-123");
		expect(tags).toContain("session-user-123");
		expect(tags).toContain("sessions-user-user-123");
		expect(tags).toHaveLength(3);
	});

	it("uses userId in all dynamic tags", () => {
		const tags = getUserFullInvalidationTags("user-abc");

		expect(tags).toContain("user-user-abc");
		expect(tags).toContain("session-user-abc");
		expect(tags).toContain("sessions-user-user-abc");
	});
});
