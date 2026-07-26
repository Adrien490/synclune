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
	getUserFullInvalidationTags,
} from "../cache.utils";

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// cacheCurrentUser
// ============================================================================

describe("cacheCurrentUser", () => {
	it("sets session cache life and CURRENT_USER tag", () => {
		cacheCurrentUser("user-123");

		expect(mockCacheLife).toHaveBeenCalledWith("checkout");
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

		expect(mockCacheLife).toHaveBeenCalledWith("user");
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
// getUserFullInvalidationTags
// ============================================================================

describe("getUserFullInvalidationTags", () => {
	it("returns CURRENT_USER, SESSIONS, and USER_ORDERS_COUNT tags", () => {
		const tags = getUserFullInvalidationTags("user-123");

		expect(tags).toContain("user-user-123");
		expect(tags).toContain("sessions-user-user-123");
		expect(tags).toContain("user-orders-count-user-123");
		expect(tags).toHaveLength(3);
	});

	it("uses userId in all dynamic tags", () => {
		const tags = getUserFullInvalidationTags("user-abc");

		expect(tags).toContain("user-user-abc");
		expect(tags).toContain("sessions-user-user-abc");
	});

	it("does not reintroduce the orphan session-${userId} tag (no cacheTag reader poses it)", () => {
		const tags = getUserFullInvalidationTags("user-123");

		expect(tags).not.toContain("session-user-123");
	});
});
