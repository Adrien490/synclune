import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GetSkuStocksReturn } from "../../types/inventory.types";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockCacheLife,
	mockCacheTag,
	mockBuildInventoryWhereClause,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockGetSortDirection,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: { findMany: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildInventoryWhereClause: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockGetSortDirection: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../services/inventory-query-builder.service", () => ({
	buildInventoryWhereClause: mockBuildInventoryWhereClause,
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

vi.mock("../../constants/inventory.constants", () => ({
	GET_INVENTORY_DEFAULT_PER_PAGE: 50,
	GET_INVENTORY_MAX_RESULTS_PER_PAGE: 200,
	GET_INVENTORY_SELECT: { id: true, sku: true, inventory: true },
	INVENTORY_SORT_LABELS: {},
	INVENTORY_SORT_OPTIONS: {},
}));

vi.mock("../../schemas/inventory.schemas", () => ({
	getSkuStocksSchema: {
		parse: (data: unknown) => data,
	},
}));

import { getSkuStocks } from "../get-sku-stocks";

// ============================================================================
// Helpers
// ============================================================================

const EMPTY_PAGINATION = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeDefaultParams() {
	return {
		cursor: undefined as string | undefined,
		direction: "forward" as const,
		perPage: 50,
		sortBy: "available-ascending",
		search: undefined as string | undefined,
		filters: {} as Record<string, unknown>,
	};
}

function setupDefaults() {
	mockIsAdmin.mockResolvedValue(true);
	mockBuildInventoryWhereClause.mockReturnValue({ deletedAt: null });
	mockGetSortDirection.mockReturnValue("asc");
	mockBuildCursorPagination.mockReturnValue({ take: 51 });
	mockPrisma.productSku.findMany.mockResolvedValue([]);
	mockProcessCursorResults.mockReturnValue({
		items: [],
		pagination: EMPTY_PAGINATION,
	});
}

// ============================================================================
// Tests: auth guard
// ============================================================================

describe("getSkuStocks – auth guard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("throws when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getSkuStocks(makeDefaultParams())).rejects.toThrow(
			"Accès non autorisé. Droits administrateur requis.",
		);
	});

	it("does not query DB when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getSkuStocks(makeDefaultParams())).rejects.toThrow();
		expect(mockPrisma.productSku.findMany).not.toHaveBeenCalled();
	});

	it("checks admin before delegating to fetch", async () => {
		await getSkuStocks(makeDefaultParams());

		expect(mockIsAdmin).toHaveBeenCalledOnce();
	});
});

// ============================================================================
// Tests: cache directives
// ============================================================================

describe("getSkuStocks – cache directives", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("calls cacheLife with 'dashboard' profile", async () => {
		await getSkuStocks(makeDefaultParams());

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with admin inventory list tag", async () => {
		await getSkuStocks(makeDefaultParams());

		expect(mockCacheTag).toHaveBeenCalledWith("admin-inventory-list");
	});
});

// ============================================================================
// Tests: sort order logic
// ============================================================================

describe("getSkuStocks – sort order logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("sorts by inventory when sortBy starts with 'available-'", async () => {
		await getSkuStocks({ ...makeDefaultParams(), sortBy: "available-ascending" });

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ inventory: "asc" })]),
		);
	});

	it("sorts by sku when sortBy starts with 'sku-'", async () => {
		await getSkuStocks({ ...makeDefaultParams(), sortBy: "sku-ascending" });

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ sku: "asc" })]),
		);
	});

	it("falls back to inventory asc for unknown sortBy prefix", async () => {
		await getSkuStocks({ ...makeDefaultParams(), sortBy: "unknown-sort" });

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ inventory: "asc" })]),
		);
	});

	it("always includes secondary id sort as tiebreaker", async () => {
		await getSkuStocks(makeDefaultParams());

		const callArg = mockPrisma.productSku.findMany.mock.calls[0]![0];
		expect(callArg.orderBy).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: "asc" })]),
		);
	});
});

// ============================================================================
// Tests: pagination
// ============================================================================

describe("getSkuStocks – pagination", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("clamps perPage to GET_INVENTORY_MAX_RESULTS_PER_PAGE (200)", async () => {
		await getSkuStocks({ ...makeDefaultParams(), perPage: 999 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
	});

	it("falls back to default perPage when perPage is 0 (falsy)", async () => {
		// When perPage is 0, `0 || DEFAULT` returns DEFAULT (50), not 0
		await getSkuStocks({ ...makeDefaultParams(), perPage: 0 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
	});

	it("uses GET_INVENTORY_DEFAULT_PER_PAGE when perPage is falsy", async () => {
		await getSkuStocks({ ...makeDefaultParams(), perPage: undefined as any });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
	});

	it("passes cursor and direction to buildCursorPagination", async () => {
		await getSkuStocks({ ...makeDefaultParams(), cursor: "cursor-abc", direction: "backward" });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: "cursor-abc", direction: "backward" }),
		);
	});
});

// ============================================================================
// Tests: DB query
// ============================================================================

describe("getSkuStocks – DB query", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("calls buildInventoryWhereClause with validated params", async () => {
		const params = makeDefaultParams();
		await getSkuStocks(params);

		expect(mockBuildInventoryWhereClause).toHaveBeenCalledWith(params);
	});

	it("passes where clause from service to Prisma", async () => {
		const where = { inventory: { gt: 0 } };
		mockBuildInventoryWhereClause.mockReturnValue(where);

		await getSkuStocks(makeDefaultParams());

		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
	});

	it("passes GET_INVENTORY_SELECT to Prisma select", async () => {
		await getSkuStocks(makeDefaultParams());

		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ select: { id: true, sku: true, inventory: true } }),
		);
	});
});

// ============================================================================
// Tests: return value
// ============================================================================

describe("getSkuStocks – return value", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns items and pagination from processCursorResults", async () => {
		const items = [{ id: "sku-1", sku: "SKU-001", inventory: 5 }];
		mockProcessCursorResults.mockReturnValue({
			items,
			pagination: { ...EMPTY_PAGINATION, hasNextPage: true },
		});
		mockPrisma.productSku.findMany.mockResolvedValue(items);

		const result = await getSkuStocks(makeDefaultParams());

		expect(result.items).toEqual(items);
		expect(result.pagination.hasNextPage).toBe(true);
	});
});

// ============================================================================
// Tests: error handling
// ============================================================================

describe("getSkuStocks – error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns empty items and pagination when Prisma throws", async () => {
		mockPrisma.productSku.findMany.mockRejectedValue(new Error("DB error"));

		const result = await getSkuStocks(makeDefaultParams());

		expect(result.items).toEqual([]);
		expect(result.pagination).toEqual(EMPTY_PAGINATION);
	});

	it("includes error message in dev mode when Prisma throws", async () => {
		const originalEnv = process.env.NODE_ENV;
		// NODE_ENV is read-only in some environments, so we spy on it
		vi.stubEnv("NODE_ENV", "development");
		mockPrisma.productSku.findMany.mockRejectedValue(new Error("DB exploded"));

		const result = (await getSkuStocks(makeDefaultParams())) as GetSkuStocksReturn & {
			error?: string;
		};

		expect(result.error).toBe("DB exploded");
		vi.unstubAllEnvs();
		void originalEnv;
	});

	it("returns generic error message in production when Prisma throws", async () => {
		vi.stubEnv("NODE_ENV", "production");
		mockPrisma.productSku.findMany.mockRejectedValue(new Error("DB exploded"));

		const result = (await getSkuStocks(makeDefaultParams())) as GetSkuStocksReturn & {
			error?: string;
		};

		expect(result.error).toBe("Failed to fetch inventory items");
		vi.unstubAllEnvs();
	});
});
