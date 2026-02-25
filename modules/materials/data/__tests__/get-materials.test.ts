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
	mockBuildMaterialWhereClause,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: { findMany: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockGetSortDirection: vi.fn(),
	mockBuildMaterialWhereClause: vi.fn(),
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
	cacheMaterials: () => {
		mockCacheLife("reference");
		mockCacheTag("materials-list");
	},
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: mockGetSortDirection,
}));

vi.mock("../../services/materials-query-builder", () => ({
	buildMaterialWhereClause: mockBuildMaterialWhereClause,
}));

vi.mock("../../constants/materials.constants", () => ({
	GET_MATERIALS_SELECT: {
		id: true,
		name: true,
		slug: true,
		description: true,
		isActive: true,
		createdAt: true,
		updatedAt: true,
		_count: { select: { skus: { where: { isActive: true } } } },
	},
	GET_MATERIALS_DEFAULT_PER_PAGE: 20,
	GET_MATERIALS_MAX_RESULTS_PER_PAGE: 200,
	GET_MATERIALS_DEFAULT_SORT_BY: "name-ascending",
	GET_MATERIALS_SORT_FIELDS: [
		"name-ascending",
		"name-descending",
		"skuCount-ascending",
		"skuCount-descending",
		"createdAt-ascending",
		"createdAt-descending",
	],
	MATERIALS_SORT_OPTIONS: {
		NAME_ASC: "name-ascending",
		NAME_DESC: "name-descending",
		SKU_COUNT_ASC: "skuCount-ascending",
		SKU_COUNT_DESC: "skuCount-descending",
		CREATED_ASC: "createdAt-ascending",
		CREATED_DESC: "createdAt-descending",
	},
	MATERIALS_SORT_LABELS: {
		"name-ascending": "Nom (A-Z)",
		"name-descending": "Nom (Z-A)",
		"skuCount-ascending": "Moins de SKU",
		"skuCount-descending": "Plus de SKU",
		"createdAt-ascending": "Plus anciens",
		"createdAt-descending": "Plus recents",
	},
}));

import { getMaterials } from "../get-materials";

// ============================================================================
// Factories
// ============================================================================

const emptyPagination = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: "material-1",
		name: "Argent",
		slug: "argent",
		description: "Metal precieux",
		isActive: true,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		_count: { skus: 5 },
		...overrides,
	};
}

function setupDefaults() {
	mockBuildMaterialWhereClause.mockReturnValue({});
	mockGetSortDirection.mockReturnValue("asc");
	mockBuildCursorPagination.mockReturnValue({ take: 21 });
	mockProcessCursorResults.mockReturnValue({
		items: [],
		pagination: emptyPagination,
	});
	mockPrisma.material.findMany.mockResolvedValue([]);
}

// ============================================================================
// Tests: getMaterials
// ============================================================================

describe("getMaterials", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	// --- Validation ---

	it("throws an error when params are invalid", async () => {
		await expect(
			getMaterials({ sortBy: "invalid-sort" as never } as never)
		).rejects.toThrow();
	});

	// --- Cache ---

	it("calls cacheLife with reference profile", async () => {
		await getMaterials({ sortBy: "name-ascending", direction: "forward" });

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the materials list tag", async () => {
		await getMaterials({ sortBy: "name-ascending", direction: "forward" });

		expect(mockCacheTag).toHaveBeenCalledWith("materials-list");
	});

	// --- Sort order ---

	it("orders by name when sortBy starts with name-", async () => {
		mockGetSortDirection.mockReturnValue("asc");

		await getMaterials({ sortBy: "name-ascending", direction: "forward" });

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ name: "asc" }, { id: "asc" }],
			})
		);
	});

	it("orders by name descending when sortBy is name-descending", async () => {
		mockGetSortDirection.mockReturnValue("desc");

		await getMaterials({ sortBy: "name-descending", direction: "forward" });

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ name: "desc" }, { id: "asc" }],
			})
		);
	});

	it("orders by sku count when sortBy starts with skuCount-", async () => {
		mockGetSortDirection.mockReturnValue("asc");

		await getMaterials({ sortBy: "skuCount-ascending", direction: "forward" });

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ skus: { _count: "asc" } }, { id: "asc" }],
			})
		);
	});

	it("orders by createdAt when sortBy starts with createdAt-", async () => {
		mockGetSortDirection.mockReturnValue("desc");

		await getMaterials({ sortBy: "createdAt-descending", direction: "forward" });

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ createdAt: "desc" }, { id: "asc" }],
			})
		);
	});

	// --- Pagination ---

	it("uses perPage param up to the max allowed by schema", async () => {
		// Schema rejects perPage > 200, so test with the maximum valid value
		await getMaterials({ sortBy: "name-ascending", direction: "forward", perPage: 200 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ take: 200 })
		);
	});

	it("uses default perPage when not provided", async () => {
		await getMaterials({ sortBy: "name-ascending", direction: "forward" });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ take: 20 })
		);
	});

	// Cursor must be exactly 25 characters (cuid2 length) to pass schema validation
	it("passes cursor to buildCursorPagination", async () => {
		const validCursor = "cm6z1234567890abcdefghijk";

		await getMaterials({ sortBy: "name-ascending", direction: "forward", cursor: validCursor });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: validCursor })
		);
	});

	it("passes direction to buildCursorPagination", async () => {
		await getMaterials({ sortBy: "name-ascending", direction: "backward" });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ direction: "backward" })
		);
	});

	// --- Where clause ---

	it("passes built where clause to prisma query", async () => {
		const whereClause = { name: { contains: "argent" } };
		mockBuildMaterialWhereClause.mockReturnValue(whereClause);

		await getMaterials({ sortBy: "name-ascending", direction: "forward", search: "argent" });

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: whereClause })
		);
	});

	// --- Result processing ---

	it("returns materials from processCursorResults", async () => {
		const materials = [makeMaterial()];
		mockProcessCursorResults.mockReturnValue({
			items: materials,
			pagination: emptyPagination,
		});
		mockPrisma.material.findMany.mockResolvedValue(materials);

		const result = await getMaterials({ sortBy: "name-ascending", direction: "forward" });

		expect(result.materials).toEqual(materials);
	});

	it("returns pagination from processCursorResults", async () => {
		const pagination = {
			nextCursor: "cursor-2",
			prevCursor: null,
			hasNextPage: true,
			hasPreviousPage: false,
		};
		mockProcessCursorResults.mockReturnValue({ items: [], pagination });

		const result = await getMaterials({ sortBy: "name-ascending", direction: "forward" });

		expect(result.pagination).toEqual(pagination);
	});

	// --- Error handling ---

	it("returns empty result on database error", async () => {
		mockPrisma.material.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getMaterials({ sortBy: "name-ascending", direction: "forward" });

		expect(result.materials).toEqual([]);
		expect(result.pagination).toEqual(emptyPagination);
	});

	it("uses GET_MATERIALS_SELECT for the DB query", async () => {
		await getMaterials({ sortBy: "name-ascending", direction: "forward" });

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					isActive: true,
					createdAt: true,
					updatedAt: true,
					_count: { select: { skus: { where: { isActive: true } } } },
				},
			})
		);
	});
});
