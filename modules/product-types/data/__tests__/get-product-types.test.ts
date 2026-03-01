import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockCacheLife,
	mockCacheTag,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockGetSortDirection,
	mockBuildProductTypeWhereClause,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: { findMany: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockGetSortDirection: vi.fn(),
	mockBuildProductTypeWhereClause: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	cacheProductTypes: () => {
		mockCacheLife("reference");
		mockCacheTag("product-types-list");
	},
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: mockGetSortDirection,
}));

vi.mock("../../services/product-type-query-builder", () => ({
	buildProductTypeWhereClause: mockBuildProductTypeWhereClause,
}));

vi.mock("../../constants/product-type.constants", () => ({
	GET_PRODUCT_TYPES_SELECT: {
		id: true,
		slug: true,
		label: true,
		description: true,
		isActive: true,
		isSystem: true,
		createdAt: true,
		updatedAt: true,
		_count: {
			select: {
				products: {
					where: {
						status: "PUBLIC",
						skus: { some: { isActive: true } },
					},
				},
			},
		},
	},
	GET_PRODUCT_TYPES_DEFAULT_PER_PAGE: 20,
	GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE: 200,
	GET_PRODUCT_TYPES_DEFAULT_SORT_BY: "label-ascending",
	GET_PRODUCT_TYPES_SORT_FIELDS: [
		"label-ascending",
		"label-descending",
		"products-ascending",
		"products-descending",
	],
	PRODUCT_TYPES_SORT_OPTIONS: {
		LABEL_ASC: "label-ascending",
		LABEL_DESC: "label-descending",
		PRODUCTS_ASC: "products-ascending",
		PRODUCTS_DESC: "products-descending",
	},
	PRODUCT_TYPES_SORT_LABELS: {
		"label-ascending": "Label (A-Z)",
		"label-descending": "Label (Z-A)",
		"products-ascending": "Moins de produits",
		"products-descending": "Plus de produits",
	},
}));

import { getProductTypes } from "../get-product-types";

// ============================================================================
// Factories
// ============================================================================

const emptyPagination = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		slug: "bague",
		label: "Bague",
		description: "Bijou en anneau",
		isActive: true,
		isSystem: false,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		_count: { products: 10 },
		...overrides,
	};
}

function setupDefaults() {
	mockBuildProductTypeWhereClause.mockReturnValue({});
	mockGetSortDirection.mockReturnValue("asc");
	mockBuildCursorPagination.mockReturnValue({ take: 21 });
	mockProcessCursorResults.mockReturnValue({
		items: [],
		pagination: emptyPagination,
	});
	mockPrisma.productType.findMany.mockResolvedValue([]);
}

// ============================================================================
// Tests: getProductTypes
// ============================================================================

describe("getProductTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	// --- Validation ---

	it("defaults invalid sortBy to label-ascending via schema preprocess", async () => {
		// The productTypeSortBySchema preprocesses unknown values back to the default
		// so getProductTypes does not throw for an invalid sortBy
		const result = await getProductTypes({ sortBy: "invalid-sort" as never } as never);

		expect(result.productTypes).toEqual([]);
		expect(mockPrisma.productType.findMany).toHaveBeenCalled();
	});

	// --- Cache ---

	it("calls cacheLife with reference profile", async () => {
		await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the product-types list tag", async () => {
		await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
	});

	// --- Sort order ---

	it("orders by label when sortBy starts with label-", async () => {
		mockGetSortDirection.mockReturnValue("asc");

		await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ label: "asc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by label descending when sortBy is label-descending", async () => {
		mockGetSortDirection.mockReturnValue("desc");

		await getProductTypes({ sortBy: "label-descending", direction: "forward" });

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ label: "desc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by product count when sortBy starts with products-", async () => {
		mockGetSortDirection.mockReturnValue("desc");

		await getProductTypes({ sortBy: "products-descending", direction: "forward" });

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ products: { _count: "desc" } }, { id: "asc" }],
			}),
		);
	});

	it("falls back to label asc order for unknown sortBy", async () => {
		mockGetSortDirection.mockReturnValue("asc");
		// Use a valid sort value that doesn't match name- or skuCount- prefixes
		// Since schema preprocess defaults invalid sorts to label-ascending, we test directly
		await getProductTypes({ direction: "forward" } as never);

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ label: "asc" }, { id: "asc" }],
			}),
		);
	});

	// --- Pagination ---

	it("uses perPage param up to the max allowed by schema", async () => {
		// Schema rejects perPage > 200, so test with the maximum valid value
		await getProductTypes({ sortBy: "label-ascending", direction: "forward", perPage: 200 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
	});

	it("uses default perPage when not provided", async () => {
		await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
	});

	// Cursor must be exactly 25 characters (cuid2 length) to pass schema validation
	it("passes cursor to buildCursorPagination", async () => {
		const validCursor = "cm6z1234567890abcdefghijk";

		await getProductTypes({ sortBy: "label-ascending", direction: "forward", cursor: validCursor });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: validCursor }),
		);
	});

	it("passes direction to buildCursorPagination", async () => {
		await getProductTypes({ sortBy: "label-ascending", direction: "backward" });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ direction: "backward" }),
		);
	});

	// --- Where clause ---

	it("passes built where clause to prisma query", async () => {
		const whereClause = { label: { contains: "bague" } };
		mockBuildProductTypeWhereClause.mockReturnValue(whereClause);

		await getProductTypes({ sortBy: "label-ascending", direction: "forward", search: "bague" });

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: whereClause }),
		);
	});

	// --- Result processing ---

	it("returns productTypes from processCursorResults", async () => {
		const productTypes = [makeProductType()];
		mockProcessCursorResults.mockReturnValue({
			items: productTypes,
			pagination: emptyPagination,
		});
		mockPrisma.productType.findMany.mockResolvedValue(productTypes);

		const result = await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(result.productTypes).toEqual(productTypes);
	});

	it("returns pagination from processCursorResults", async () => {
		const pagination = {
			nextCursor: "cursor-2",
			prevCursor: null,
			hasNextPage: true,
			hasPreviousPage: false,
		};
		mockProcessCursorResults.mockReturnValue({ items: [], pagination });

		const result = await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(result.pagination).toEqual(pagination);
	});

	// --- Error handling ---

	it("returns empty result on database error", async () => {
		mockPrisma.productType.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(result.productTypes).toEqual([]);
		expect(result.pagination).toEqual(emptyPagination);
	});

	it("uses GET_PRODUCT_TYPES_SELECT for the DB query", async () => {
		await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					slug: true,
					label: true,
					description: true,
					isActive: true,
					isSystem: true,
					createdAt: true,
					updatedAt: true,
					_count: {
						select: {
							products: {
								where: {
									status: "PUBLIC",
									skus: { some: { isActive: true } },
								},
							},
						},
					},
				},
			}),
		);
	});

	// --- Public access ---

	it("does not require authentication", async () => {
		mockProcessCursorResults.mockReturnValue({
			items: [makeProductType()],
			pagination: emptyPagination,
		});
		mockPrisma.productType.findMany.mockResolvedValue([makeProductType()]);

		const result = await getProductTypes({ sortBy: "label-ascending", direction: "forward" });

		expect(result.productTypes).toHaveLength(1);
	});
});
