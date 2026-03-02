import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			findMany: vi.fn(),
		},
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));
vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: {
		CONFIRMED: "CONFIRMED",
		PENDING: "PENDING",
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
	Prisma: {
		QueryMode: { insensitive: "insensitive" },
	},
}));
vi.mock("../../constants/cache", () => ({
	cacheNewsletterSubscribers: vi.fn(),
	NEWSLETTER_CACHE_TAGS: { LIST: "newsletter-subscribers-list" },
	getNewsletterInvalidationTags: vi.fn(),
}));
vi.mock("../../constants/subscriber.constants", () => ({
	GET_SUBSCRIBERS_DEFAULT_PER_PAGE: 20,
	GET_SUBSCRIBERS_MAX_RESULTS_PER_PAGE: 100,
	GET_SUBSCRIBERS_SELECT: {
		id: true,
		email: true,
		status: true,
		subscribedAt: true,
		unsubscribedAt: true,
		confirmedAt: true,
		createdAt: true,
		updatedAt: true,
	},
	SORT_OPTIONS: {
		SUBSCRIBED_DESC: "subscribed-descending",
		SUBSCRIBED_ASC: "subscribed-ascending",
		EMAIL_ASC: "email-ascending",
		EMAIL_DESC: "email-descending",
		STATUS_ASC: "status-ascending",
		STATUS_DESC: "status-descending",
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { getSubscribers } from "../get-subscribers";

// ============================================================================
// HELPERS
// ============================================================================

function createSubscriber(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		email: `user-${id}@example.com`,
		status: "CONFIRMED",
		subscribedAt: new Date("2026-01-15"),
		unsubscribedAt: null,
		confirmedAt: new Date("2026-01-15"),
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		...overrides,
	};
}

const DEFAULT_PARAMS = {
	sortBy: "subscribed-descending" as const,
	perPage: 20,
	direction: "forward" as const,
};

// ============================================================================
// TESTS
// ============================================================================

describe("getSubscribers", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
	});

	// -------------------------------------------------------------------------
	// Validation
	// -------------------------------------------------------------------------

	it("should throw on invalid parameters", async () => {
		await expect(
			getSubscribers({ sortBy: "invalid-sort" as never, perPage: 20, direction: "forward" }),
		).rejects.toThrow("Invalid parameters");
	});

	it("should throw when perPage exceeds maximum", async () => {
		await expect(getSubscribers({ ...DEFAULT_PARAMS, perPage: 200 })).rejects.toThrow(
			"Invalid parameters",
		);
	});

	// -------------------------------------------------------------------------
	// Basic query
	// -------------------------------------------------------------------------

	it("should return empty list when no subscribers exist", async () => {
		const result = await getSubscribers(DEFAULT_PARAMS);

		expect(result.subscribers).toEqual([]);
		expect(result.pagination.hasNextPage).toBe(false);
		expect(result.pagination.hasPreviousPage).toBe(false);
	});

	it("should return subscribers from DB", async () => {
		const subscribers = [createSubscriber("1"), createSubscriber("2")];
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(subscribers);

		const result = await getSubscribers(DEFAULT_PARAMS);

		expect(result.subscribers).toHaveLength(2);
		expect(mockPrisma.newsletterSubscriber.findMany).toHaveBeenCalledTimes(1);
	});

	it("should exclude soft-deleted subscribers via deletedAt: null", async () => {
		await getSubscribers(DEFAULT_PARAMS);

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.where).toMatchObject({ deletedAt: null });
	});

	// -------------------------------------------------------------------------
	// Sorting
	// -------------------------------------------------------------------------

	it("should sort by subscribedAt desc by default", async () => {
		await getSubscribers(DEFAULT_PARAMS);

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.orderBy).toEqual([{ subscribedAt: "desc" }, { id: "asc" }]);
	});

	it("should sort by subscribedAt asc when sortBy is subscribed-ascending", async () => {
		await getSubscribers({ ...DEFAULT_PARAMS, sortBy: "subscribed-ascending" });

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.orderBy).toEqual([{ subscribedAt: "asc" }, { id: "asc" }]);
	});

	it("should sort by email when sortBy is email-ascending", async () => {
		await getSubscribers({ ...DEFAULT_PARAMS, sortBy: "email-ascending" });

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.orderBy).toEqual([{ email: "asc" }, { id: "asc" }]);
	});

	it("should sort by email desc when sortBy is email-descending", async () => {
		await getSubscribers({ ...DEFAULT_PARAMS, sortBy: "email-descending" });

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.orderBy).toEqual([{ email: "desc" }, { id: "asc" }]);
	});

	it("should sort by status when sortBy is status-ascending", async () => {
		await getSubscribers({ ...DEFAULT_PARAMS, sortBy: "status-ascending" });

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.orderBy).toEqual([{ status: "asc" }, { id: "asc" }]);
	});

	// -------------------------------------------------------------------------
	// Pagination
	// -------------------------------------------------------------------------

	it("should request take+1 for hasMore detection", async () => {
		await getSubscribers({ ...DEFAULT_PARAMS, perPage: 10 });

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		// buildCursorPagination adds +1 for hasMore detection
		expect(call.take).toBe(11);
	});

	it("should clamp perPage to max 100", async () => {
		await getSubscribers({ ...DEFAULT_PARAMS, perPage: 100 });

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.take).toBe(101);
	});

	it("should pass cursor when provided", async () => {
		await getSubscribers({
			...DEFAULT_PARAMS,
			cursor: "cm1234567890abcdefghijklm",
			direction: "forward",
		});

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.cursor).toEqual({ id: "cm1234567890abcdefghijklm" });
		expect(call.skip).toBe(1);
	});

	it("should detect hasNextPage when more items than take", async () => {
		// Return 21 items for take=20 → hasMore=true
		const items = Array.from({ length: 21 }, (_, i) => createSubscriber(`s-${i}`));
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(items);

		const result = await getSubscribers(DEFAULT_PARAMS);

		expect(result.subscribers).toHaveLength(20);
		expect(result.pagination.hasNextPage).toBe(true);
		expect(result.pagination.nextCursor).toBe("s-19");
	});

	it("should not have hasNextPage when fewer items than take", async () => {
		const items = [createSubscriber("1"), createSubscriber("2")];
		mockPrisma.newsletterSubscriber.findMany.mockResolvedValue(items);

		const result = await getSubscribers(DEFAULT_PARAMS);

		expect(result.subscribers).toHaveLength(2);
		expect(result.pagination.hasNextPage).toBe(false);
		expect(result.pagination.nextCursor).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Search
	// -------------------------------------------------------------------------

	it("should add email search condition when search param is provided", async () => {
		await getSubscribers({ ...DEFAULT_PARAMS, search: "test@" });

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.where.AND).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					email: { contains: "test@", mode: "insensitive" },
				}),
			]),
		);
	});

	// -------------------------------------------------------------------------
	// Filters
	// -------------------------------------------------------------------------

	it("should filter by status when filter is provided", async () => {
		await getSubscribers({
			...DEFAULT_PARAMS,
			filters: { status: "CONFIRMED" },
		});

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.where.AND).toEqual(
			expect.arrayContaining([expect.objectContaining({ status: "CONFIRMED" })]),
		);
	});

	it("should filter by subscribedAfter date range", async () => {
		const after = new Date("2026-01-01");

		await getSubscribers({
			...DEFAULT_PARAMS,
			filters: { subscribedAfter: after },
		});

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.where.AND).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					subscribedAt: expect.objectContaining({ gte: after }),
				}),
			]),
		);
	});

	// -------------------------------------------------------------------------
	// Error handling
	// -------------------------------------------------------------------------

	it("should return empty list with error on DB failure", async () => {
		mockPrisma.newsletterSubscriber.findMany.mockRejectedValue(new Error("DB error"));

		const result = await getSubscribers(DEFAULT_PARAMS);

		expect(result.subscribers).toEqual([]);
		expect(result.pagination.hasNextPage).toBe(false);
	});

	// -------------------------------------------------------------------------
	// Select projection
	// -------------------------------------------------------------------------

	it("should use GET_SUBSCRIBERS_SELECT projection", async () => {
		await getSubscribers(DEFAULT_PARAMS);

		const call = mockPrisma.newsletterSubscriber.findMany.mock.calls[0]![0];
		expect(call.select).toBeDefined();
		expect(call.select.id).toBe(true);
		expect(call.select.email).toBe(true);
		expect(call.select.status).toBe(true);
	});
});
