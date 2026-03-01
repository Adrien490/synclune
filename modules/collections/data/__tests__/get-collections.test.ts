import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockFindMany,
	mockCacheCollections,
	mockBuildCollectionWhereClause,
	mockSafeParse,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockGetSortDirection,
	mockGetCollectionsSelect,
} = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockCacheCollections: vi.fn(),
	mockBuildCollectionWhereClause: vi.fn(),
	mockSafeParse: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockGetSortDirection: vi.fn(),
	mockGetCollectionsSelect: { id: true, name: true },
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		collection: { findMany: mockFindMany },
	},
}));

vi.mock("../../utils/cache.utils", () => ({
	cacheCollections: mockCacheCollections,
}));

vi.mock("../../services/collection-query-builder", () => ({
	buildCollectionWhereClause: mockBuildCollectionWhereClause,
}));

vi.mock("../../schemas/collection.schemas", () => ({
	getCollectionsSchema: { safeParse: mockSafeParse },
}));

vi.mock("../../constants/collection.constants", () => ({
	GET_COLLECTIONS_SELECT: mockGetCollectionsSelect,
	GET_COLLECTIONS_DEFAULT_PER_PAGE: 20,
	GET_COLLECTIONS_MAX_RESULTS_PER_PAGE: 200,
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: mockGetSortDirection,
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

import { getCollections } from "../get-collections";

// ============================================================================
// Helpers
// ============================================================================

const EMPTY_PAGINATION = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: "col-1",
		name: "Test Collection",
		slug: "test-collection",
		...overrides,
	};
}

function makeValidParams(overrides: Record<string, unknown> = {}) {
	return {
		sortBy: "name-ascending",
		perPage: 20,
		...overrides,
	};
}

function setupDefaults(params = makeValidParams()) {
	mockSafeParse.mockReturnValue({ success: true, data: params });
	mockBuildCollectionWhereClause.mockReturnValue({});
	mockGetSortDirection.mockReturnValue("asc");
	mockBuildCursorPagination.mockReturnValue({ take: 21 });
	mockFindMany.mockResolvedValue([]);
	mockProcessCursorResults.mockReturnValue({
		items: [],
		pagination: EMPTY_PAGINATION,
	});
}

// ============================================================================
// Tests: Validation
// ============================================================================

describe("getCollections", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	describe("validation", () => {
		it("throws on invalid params", async () => {
			mockSafeParse.mockReturnValue({
				success: false,
				error: { issues: [{ message: "bad" }] },
			});

			await expect(getCollections({} as never)).rejects.toThrow("Invalid parameters");
		});

		it("calls fetchCollections with validated data", async () => {
			const params = makeValidParams({ search: "bagues" });
			mockSafeParse.mockReturnValue({ success: true, data: params });

			await getCollections(params as never);

			expect(mockBuildCollectionWhereClause).toHaveBeenCalledWith(params);
		});
	});

	// ============================================================================
	// Tests: Sorting
	// ============================================================================

	describe("sorting", () => {
		it("sorts by name ascending", async () => {
			setupDefaults(makeValidParams({ sortBy: "name-ascending" }));
			mockGetSortDirection.mockReturnValue("asc");

			await getCollections(makeValidParams({ sortBy: "name-ascending" }) as never);

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: [{ name: "asc" }, { id: "asc" }],
				}),
			);
		});

		it("sorts by name descending", async () => {
			setupDefaults(makeValidParams({ sortBy: "name-descending" }));
			mockGetSortDirection.mockReturnValue("desc");

			await getCollections(makeValidParams({ sortBy: "name-descending" }) as never);

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: [{ name: "desc" }, { id: "asc" }],
				}),
			);
		});

		it("sorts by created ascending", async () => {
			setupDefaults(makeValidParams({ sortBy: "created-ascending" }));
			mockGetSortDirection.mockReturnValue("asc");

			await getCollections(makeValidParams({ sortBy: "created-ascending" }) as never);

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				}),
			);
		});

		it("sorts by created descending", async () => {
			setupDefaults(makeValidParams({ sortBy: "created-descending" }));
			mockGetSortDirection.mockReturnValue("desc");

			await getCollections(makeValidParams({ sortBy: "created-descending" }) as never);

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: [{ createdAt: "desc" }, { id: "asc" }],
				}),
			);
		});

		it("sorts by products ascending", async () => {
			setupDefaults(makeValidParams({ sortBy: "products-ascending" }));
			mockGetSortDirection.mockReturnValue("asc");

			await getCollections(makeValidParams({ sortBy: "products-ascending" }) as never);

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: [{ products: { _count: "asc" } }, { id: "asc" }],
				}),
			);
		});

		it("sorts by products descending", async () => {
			setupDefaults(makeValidParams({ sortBy: "products-descending" }));
			mockGetSortDirection.mockReturnValue("desc");

			await getCollections(makeValidParams({ sortBy: "products-descending" }) as never);

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: [{ products: { _count: "desc" } }, { id: "asc" }],
				}),
			);
		});

		it("falls back to name asc for unknown sort field", async () => {
			setupDefaults(makeValidParams({ sortBy: "unknown-field" }));
			mockGetSortDirection.mockReturnValue("desc");

			await getCollections(makeValidParams({ sortBy: "unknown-field" }) as never);

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: [{ name: "asc" }, { id: "asc" }],
				}),
			);
		});
	});

	// ============================================================================
	// Tests: Pagination
	// ============================================================================

	describe("pagination", () => {
		it("calls buildCursorPagination with cursor, direction, and take", async () => {
			const params = makeValidParams({
				cursor: "cursor-123",
				direction: "forward",
				perPage: 10,
			});
			setupDefaults(params);

			await getCollections(params as never);

			expect(mockBuildCursorPagination).toHaveBeenCalledWith({
				cursor: "cursor-123",
				direction: "forward",
				take: 10,
			});
		});

		it("clamps perPage to minimum 1", async () => {
			const params = makeValidParams({ perPage: -5 });
			setupDefaults(params);

			await getCollections(params as never);

			expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }));
		});

		it("clamps perPage to maximum 200", async () => {
			const params = makeValidParams({ perPage: 999 });
			setupDefaults(params);

			await getCollections(params as never);

			expect(mockBuildCursorPagination).toHaveBeenCalledWith(
				expect.objectContaining({ take: 200 }),
			);
		});

		it("uses default perPage when not provided", async () => {
			const params = makeValidParams({ perPage: undefined });
			setupDefaults(params);

			await getCollections(params as never);

			expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
		});

		it("passes cursor results to processCursorResults", async () => {
			const collections = [makeCollection({ id: "c1" }), makeCollection({ id: "c2" })];
			const params = makeValidParams({ cursor: "abc", direction: "backward", perPage: 10 });
			setupDefaults(params);
			mockFindMany.mockResolvedValue(collections);

			await getCollections(params as never);

			expect(mockProcessCursorResults).toHaveBeenCalledWith(collections, 10, "backward", "abc");
		});
	});

	// ============================================================================
	// Tests: Search & Filters
	// ============================================================================

	describe("search and filters", () => {
		it("passes params to buildCollectionWhereClause", async () => {
			const params = makeValidParams({
				search: "bagues",
				filters: { status: "PUBLIC" },
			});
			setupDefaults(params);

			await getCollections(params as never);

			expect(mockBuildCollectionWhereClause).toHaveBeenCalledWith(params);
		});

		it("uses the where clause from the query builder", async () => {
			const whereClause = { status: "PUBLIC", name: { contains: "test" } };
			setupDefaults();
			mockBuildCollectionWhereClause.mockReturnValue(whereClause);

			await getCollections(makeValidParams() as never);

			expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: whereClause }));
		});
	});

	// ============================================================================
	// Tests: Cache
	// ============================================================================

	describe("cache", () => {
		it("calls cacheCollections", async () => {
			await getCollections(makeValidParams() as never);

			expect(mockCacheCollections).toHaveBeenCalled();
		});
	});

	// ============================================================================
	// Tests: SELECT
	// ============================================================================

	describe("select", () => {
		it("uses GET_COLLECTIONS_SELECT in the DB query", async () => {
			await getCollections(makeValidParams() as never);

			expect(mockFindMany).toHaveBeenCalledWith(
				expect.objectContaining({ select: mockGetCollectionsSelect }),
			);
		});
	});

	// ============================================================================
	// Tests: Return value
	// ============================================================================

	describe("return value", () => {
		it("returns collections and pagination from processCursorResults", async () => {
			const items = [makeCollection()];
			const pagination = {
				nextCursor: "next",
				prevCursor: null,
				hasNextPage: true,
				hasPreviousPage: false,
			};
			mockProcessCursorResults.mockReturnValue({ items, pagination });

			const result = await getCollections(makeValidParams() as never);

			expect(result).toEqual({ collections: items, pagination });
		});
	});

	// ============================================================================
	// Tests: Errors
	// ============================================================================

	describe("errors", () => {
		it("returns empty collections on DB error", async () => {
			mockFindMany.mockRejectedValue(new Error("Connection refused"));

			const result = await getCollections(makeValidParams() as never);

			expect(result).toEqual({
				collections: [],
				pagination: EMPTY_PAGINATION,
			});
		});

		it("rethrows validation errors from getCollections wrapper", async () => {
			mockSafeParse.mockReturnValue({
				success: false,
				error: { issues: [{ message: "invalid perPage" }] },
			});

			await expect(getCollections({} as never)).rejects.toThrow("Invalid parameters");
		});
	});
});
