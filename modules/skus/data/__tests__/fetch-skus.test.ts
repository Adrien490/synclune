import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GetProductSkusParams, GetProductSkusReturn } from "../../types/skus.types";
import type * as SkuConstantsModule from "../../constants/sku.constants";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockCacheLife,
	mockCacheTag,
	mockBuildWhereClause,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockGetSortDirection,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: { findMany: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildWhereClause: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockGetSortDirection: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@/modules/skus/services/build-where-clause", () => ({
	buildWhereClause: mockBuildWhereClause,
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: mockGetSortDirection,
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: {
		ADMIN_INVENTORY_LIST: "admin-inventory-list",
	},
}));

vi.mock("../../constants/sku.constants", async (importOriginal) => {
	const actual = await importOriginal<typeof SkuConstantsModule>();
	return {
		...actual,
		GET_PRODUCT_SKUS_DEFAULT_PER_PAGE: 20,
		GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE: 200,
		GET_PRODUCT_SKUS_DEFAULT_SELECT: { id: true, sku: true, inventory: true, images: true },
	};
});

import { fetchProductSkus } from "../fetch-skus";

// ============================================================================
// Helpers
// ============================================================================

const EMPTY_PAGINATION = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeParams(overrides: Partial<GetProductSkusParams> = {}): GetProductSkusParams {
	return {
		cursor: undefined,
		direction: "forward",
		perPage: 20,
		sortBy: "created-descending",
		search: undefined,
		filters: undefined,
		...overrides,
	};
}

function setupDefaults() {
	mockBuildWhereClause.mockReturnValue({ deletedAt: null });
	mockGetSortDirection.mockReturnValue("desc");
	mockBuildCursorPagination.mockReturnValue({ take: 21 });
	mockPrisma.productSku.findMany.mockResolvedValue([]);
	mockProcessCursorResults.mockReturnValue({
		items: [],
		pagination: EMPTY_PAGINATION,
	});
}

// ============================================================================
// Tests: cache directives
// ============================================================================

describe("fetchProductSkus – cache directives", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("calls cacheLife with 'dashboard' profile", async () => {
		await fetchProductSkus(makeParams());

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with admin inventory list tag", async () => {
		await fetchProductSkus(makeParams());

		expect(mockCacheTag).toHaveBeenCalledWith("admin-inventory-list", "skus-list");
	});
});

// ============================================================================
// Tests: sort order logic
// ============================================================================

describe("fetchProductSkus – sort order logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("always places isDefault desc as first orderBy entry", async () => {
		await fetchProductSkus(makeParams({ sortBy: "price-ascending" }));

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy[0]).toEqual({ isDefault: "desc" });
	});

	it("sorts by sku when sortBy starts with 'sku-'", async () => {
		mockGetSortDirection.mockReturnValue("asc");
		await fetchProductSkus(makeParams({ sortBy: "sku-ascending" }));

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ sku: "asc" })]),
		);
	});

	it("sorts by priceInclTax when sortBy starts with 'price-'", async () => {
		mockGetSortDirection.mockReturnValue("asc");
		await fetchProductSkus(makeParams({ sortBy: "price-ascending" }));

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ priceInclTax: "asc" })]),
		);
	});

	it("sorts by inventory when sortBy starts with 'stock-'", async () => {
		mockGetSortDirection.mockReturnValue("asc");
		await fetchProductSkus(makeParams({ sortBy: "stock-ascending" }));

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ inventory: "asc" })]),
		);
	});

	it("sorts by createdAt when sortBy starts with 'created-'", async () => {
		mockGetSortDirection.mockReturnValue("desc");
		await fetchProductSkus(makeParams({ sortBy: "created-descending" }));

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ createdAt: "desc" })]),
		);
	});

	it("falls back to createdAt desc for unknown sortBy prefix", async () => {
		await fetchProductSkus(
			makeParams({ sortBy: "unknown-sort" as unknown as GetProductSkusParams["sortBy"] }),
		);

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ createdAt: "desc" })]),
		);
	});

	it("always includes secondary id asc sort as tiebreaker", async () => {
		await fetchProductSkus(makeParams());

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: "asc" })]),
		);
	});
});

// ============================================================================
// Tests: pagination clamping
// ============================================================================

describe("fetchProductSkus – pagination clamping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("clamps perPage to GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE (200)", async () => {
		await fetchProductSkus(makeParams({ perPage: 9999 }));

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
	});

	it("falls back to default perPage when perPage is 0 (falsy)", async () => {
		// When perPage is 0, `0 || DEFAULT` returns DEFAULT (20), not 0
		await fetchProductSkus(makeParams({ perPage: 0 }));

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
	});

	it("uses GET_PRODUCT_SKUS_DEFAULT_PER_PAGE when perPage is falsy", async () => {
		await fetchProductSkus(makeParams({ perPage: undefined as any }));

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
	});

	it("passes cursor and direction to buildCursorPagination", async () => {
		await fetchProductSkus(makeParams({ cursor: "cursor-123", direction: "backward" }));

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: "cursor-123", direction: "backward" }),
		);
	});
});

// ============================================================================
// Tests: DB query
// ============================================================================

describe("fetchProductSkus – DB query", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("calls buildWhereClause with the input params", async () => {
		const params = makeParams({ search: "ring" });
		await fetchProductSkus(params);

		expect(mockBuildWhereClause).toHaveBeenCalledWith(params);
	});

	it("passes where clause from service to Prisma", async () => {
		const where = { deletedAt: null, isActive: true };
		mockBuildWhereClause.mockReturnValue(where);

		await fetchProductSkus(makeParams());

		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
	});

	it("passes GET_PRODUCT_SKUS_DEFAULT_SELECT to Prisma select", async () => {
		await fetchProductSkus(makeParams());

		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, sku: true, inventory: true, images: true },
			}),
		);
	});
});

// ============================================================================
// Tests: return shape
// ============================================================================

describe("fetchProductSkus – return shape", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns productSkus and pagination from processCursorResults", async () => {
		const items = [{ id: "sku-1", sku: "SKU-001" }];
		mockProcessCursorResults.mockReturnValue({
			items,
			pagination: { ...EMPTY_PAGINATION, hasNextPage: true },
		});
		mockPrisma.productSku.findMany.mockResolvedValue(items);

		const result = await fetchProductSkus(makeParams());

		expect(result.productSkus).toEqual(items);
		expect(result.pagination.hasNextPage).toBe(true);
	});

	it("passes DB results and take/direction/cursor to processCursorResults", async () => {
		const items = [{ id: "sku-1" }];
		mockPrisma.productSku.findMany.mockResolvedValue(items);

		await fetchProductSkus(makeParams({ cursor: "c-1", direction: "forward", perPage: 10 }));

		expect(mockProcessCursorResults).toHaveBeenCalledWith(items, 10, "forward", "c-1");
	});
});

// ============================================================================
// Tests: error handling
// ============================================================================

describe("fetchProductSkus – error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty productSkus and pagination when Prisma throws", async () => {
		mockPrisma.productSku.findMany.mockRejectedValue(new Error("DB failure"));

		const result = await fetchProductSkus(makeParams());

		expect(result.productSkus).toEqual([]);
		expect(result.pagination).toEqual(EMPTY_PAGINATION);
	});

	it("includes specific error message in dev mode", async () => {
		vi.stubEnv("NODE_ENV", "development");
		mockPrisma.productSku.findMany.mockRejectedValue(new Error("Connection refused"));

		const result = (await fetchProductSkus(makeParams())) as GetProductSkusReturn & {
			error?: string;
		};

		expect(result.error).toBe("Connection refused");
		vi.unstubAllEnvs();
	});

	it("returns generic error message in production", async () => {
		vi.stubEnv("NODE_ENV", "production");
		mockPrisma.productSku.findMany.mockRejectedValue(new Error("Connection refused"));

		const result = (await fetchProductSkus(makeParams())) as GetProductSkusReturn & {
			error?: string;
		};

		expect(result.error).toBe("Failed to fetch product SKUs");
		vi.unstubAllEnvs();
	});

	it("handles non-Error objects thrown by Prisma in dev mode", async () => {
		vi.stubEnv("NODE_ENV", "development");
		mockPrisma.productSku.findMany.mockRejectedValue("string error");

		const result = (await fetchProductSkus(makeParams())) as GetProductSkusReturn & {
			error?: string;
		};

		expect(result.error).toBe("Unknown error");
		vi.unstubAllEnvs();
	});
});
