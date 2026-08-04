import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockFindMany,
	mockCount,
	mockCacheCollections,
	mockBuildCollectionWhereClause,
	mockSafeParse,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockGetSortDirection,
	mockGetCollectionsSelect,
	mockIsAdmin,
	mockLoggerError,
} = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockCount: vi.fn(),
	mockCacheCollections: vi.fn(),
	mockBuildCollectionWhereClause: vi.fn(),
	mockSafeParse: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockGetSortDirection: vi.fn(),
	mockGetCollectionsSelect: { id: true, name: true },
	mockIsAdmin: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: mockLoggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		collection: { findMany: mockFindMany, count: mockCount },
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
	mockIsAdmin.mockResolvedValue(true);
	mockSafeParse.mockReturnValue({ success: true, data: params });
	mockBuildCollectionWhereClause.mockReturnValue({});
	mockGetSortDirection.mockReturnValue("asc");
	mockBuildCursorPagination.mockReturnValue({ take: 21 });
	mockFindMany.mockResolvedValue([]);
	mockCount.mockResolvedValue(0);
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
		it("returns empty collections on invalid params", async () => {
			mockSafeParse.mockReturnValue({
				success: false,
				error: { issues: [{ message: "bad" }] },
			});

			const result = await getCollections({} as never);
			expect(result).toEqual({ collections: [], pagination: EMPTY_PAGINATION, totalCount: 0 });
		});

		it("calls fetchCollections with validated data", async () => {
			const params = makeValidParams({ search: "bagues" });
			mockSafeParse.mockReturnValue({ success: true, data: params });

			await getCollections(params as never);

			expect(mockBuildCollectionWhereClause).toHaveBeenCalledWith(params);
		});
	});

	// ============================================================================
	// Tests: forçage du statut (parité avec getProducts)
	// ============================================================================

	// Avant ce forçage, la visibilité reposait ENTIÈREMENT sur la discipline des
	// appelants : les 6 appelants publics passaient bien `status: PUBLIC`, mais un
	// septième qui l'oublie publiait les noms des collections DRAFT, et rien ne
	// l'en empêchait. `getProducts` force depuis longtemps ; ses deux voisins non.
	describe("visibilité forcée pour les non-admins", () => {
		it("forces status PUBLIC even when DRAFT is explicitly requested", async () => {
			mockIsAdmin.mockResolvedValue(false);
			const params = makeValidParams({ filters: { status: "DRAFT" } });
			mockSafeParse.mockReturnValue({ success: true, data: params });

			await getCollections(params as never);

			expect(mockBuildCollectionWhereClause).toHaveBeenCalledWith(
				expect.objectContaining({ filters: expect.objectContaining({ status: "PUBLIC" }) }),
			);
		});

		it("forces status PUBLIC when no status filter is provided", async () => {
			mockIsAdmin.mockResolvedValue(false);
			const params = makeValidParams({ filters: { hasProducts: true } });
			mockSafeParse.mockReturnValue({ success: true, data: params });

			await getCollections(params as never);

			expect(mockBuildCollectionWhereClause).toHaveBeenCalledWith(
				expect.objectContaining({
					filters: { hasProducts: true, status: "PUBLIC" },
				}),
			);
		});

		it("preserves the requested status filter for admins", async () => {
			mockIsAdmin.mockResolvedValue(true);
			const params = makeValidParams({ filters: { status: "DRAFT" } });
			mockSafeParse.mockReturnValue({ success: true, data: params });

			await getCollections(params as never);

			expect(mockBuildCollectionWhereClause).toHaveBeenCalledWith(
				expect.objectContaining({ filters: expect.objectContaining({ status: "DRAFT" }) }),
			);
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
			mockCount.mockResolvedValue(7);

			const result = await getCollections(makeValidParams() as never);

			expect(result).toEqual({ collections: items, pagination, totalCount: 7 });
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
				totalCount: 0,
			});
			expect(mockLoggerError).toHaveBeenCalled();
		});

		it("ne logge PAS un rejet de fin de prerender (HANGING_PROMISE_REJECTION), repli silencieux", async () => {
			mockFindMany.mockRejectedValue(
				Object.assign(new Error("During prerendering, `cookies()` rejects…"), {
					digest: "HANGING_PROMISE_REJECTION",
				}),
			);

			const result = await getCollections(makeValidParams() as never);

			expect(result).toEqual({ collections: [], pagination: EMPTY_PAGINATION, totalCount: 0 });
			expect(mockLoggerError).not.toHaveBeenCalled();
		});

		it('ne logge PAS « Connection closed. » pendant la phase build (lecture "use cache" avortée)', async () => {
			vi.stubEnv("NEXT_PHASE", "phase-production-build");
			mockFindMany.mockRejectedValue(new Error("Connection closed."));

			const result = await getCollections(makeValidParams() as never);

			expect(result).toEqual({ collections: [], pagination: EMPTY_PAGINATION, totalCount: 0 });
			expect(mockLoggerError).not.toHaveBeenCalled();
			vi.unstubAllEnvs();
		});

		it("returns empty collections when validation fails in getCollections wrapper", async () => {
			mockSafeParse.mockReturnValue({
				success: false,
				error: { issues: [{ message: "invalid perPage" }] },
			});

			const result = await getCollections({} as never);
			expect(result).toEqual({ collections: [], pagination: EMPTY_PAGINATION, totalCount: 0 });
		});
	});
});
