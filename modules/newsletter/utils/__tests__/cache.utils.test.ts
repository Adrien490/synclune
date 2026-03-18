import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

import { cacheNewsletterSubscribers, getNewsletterInvalidationTags } from "../cache.utils";

// ============================================================================
// TESTS
// ============================================================================

describe("cacheNewsletterSubscribers", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("sets dashboard cache profile", () => {
		cacheNewsletterSubscribers();
		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("sets newsletter subscribers list cache tag", () => {
		cacheNewsletterSubscribers();
		expect(mockCacheTag).toHaveBeenCalledWith("newsletter-subscribers-list");
	});
});

describe("getNewsletterInvalidationTags", () => {
	it("returns list and admin-badges tags when no userId", () => {
		const tags = getNewsletterInvalidationTags();
		expect(tags).toContain("newsletter-subscribers-list");
		expect(tags).toContain("admin-badges");
	});

	it("includes user-status tag when userId is provided", () => {
		const tags = getNewsletterInvalidationTags("user-123");
		expect(tags).toContain("newsletter-user-user-123");
	});

	it("does not include user-status tag when no userId", () => {
		const tags = getNewsletterInvalidationTags();
		const userTags = tags.filter((t) => t.startsWith("newsletter-user-"));
		expect(userTags).toHaveLength(0);
	});

	it("returns 2 tags when no userId", () => {
		expect(getNewsletterInvalidationTags()).toHaveLength(2);
	});

	it("returns 3 tags when userId is provided", () => {
		expect(getNewsletterInvalidationTags("user-abc")).toHaveLength(3);
	});
});
