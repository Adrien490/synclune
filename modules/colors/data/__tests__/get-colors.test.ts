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
	mockBuildColorWhereClause,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: { findMany: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockGetSortDirection: vi.fn(),
	mockBuildColorWhereClause: vi.fn(),
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
	cacheColors: () => {
		mockCacheLife("reference");
		mockCacheTag("colors");
	},
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: mockGetSortDirection,
}));

vi.mock("../../services/color-query-builder", () => ({
	buildColorWhereClause: mockBuildColorWhereClause,
}));

vi.mock("../../constants/color.constants", () => ({
	GET_COLORS_SELECT: {
		id: true,
		name: true,
		slug: true,
		hex: true,
		isActive: true,
		createdAt: true,
		updatedAt: true,
		_count: { select: { skus: true } },
	},
	GET_COLORS_DEFAULT_PER_PAGE: 20,
	GET_COLORS_MAX_RESULTS_PER_PAGE: 200,
	GET_COLORS_DEFAULT_SORT_BY: "name-ascending",
	GET_COLORS_SORT_FIELDS: [
		"name-ascending",
		"name-descending",
		"skuCount-ascending",
		"skuCount-descending",
	],
	COLORS_SORT_OPTIONS: {
		NAME_ASC: "name-ascending",
		NAME_DESC: "name-descending",
		SKU_COUNT_ASC: "skuCount-ascending",
		SKU_COUNT_DESC: "skuCount-descending",
	},
	COLORS_SORT_LABELS: {
		"name-ascending": "Nom (A-Z)",
		"name-descending": "Nom (Z-A)",
		"skuCount-ascending": "Moins de SKU",
		"skuCount-descending": "Plus de SKU",
	},
}));

import { getColors } from "../get-colors";

// ============================================================================
// Factories
// ============================================================================

const emptyPagination = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeColor(overrides: Record<string, unknown> = {}) {
	return {
		id: "color-1",
		name: "Rouge",
		slug: "rouge",
		hex: "#FF0000",
		isActive: true,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		_count: { skus: 3 },
		...overrides,
	};
}

function setupDefaults() {
	mockBuildColorWhereClause.mockReturnValue({});
	mockGetSortDirection.mockReturnValue("asc");
	mockBuildCursorPagination.mockReturnValue({ take: 21 });
	mockProcessCursorResults.mockReturnValue({
		items: [],
		pagination: emptyPagination,
	});
	mockPrisma.color.findMany.mockResolvedValue([]);
}

// ============================================================================
// Tests: getColors
// ============================================================================

describe("getColors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	// --- Validation ---

	it("returns empty result when params are invalid", async () => {
		const result = await getColors({ sortBy: "invalid-sort" as never } as never);

		expect(result.colors).toEqual([]);
		expect(result.pagination).toEqual(emptyPagination);
		expect(mockPrisma.color.findMany).not.toHaveBeenCalled();
	});

	// --- Cache ---

	it("calls cacheLife with reference profile", async () => {
		mockProcessCursorResults.mockReturnValue({ items: [makeColor()], pagination: emptyPagination });
		mockPrisma.color.findMany.mockResolvedValue([makeColor()]);

		await getColors({ sortBy: "name-ascending", direction: "forward" });

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the colors list tag", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColors({ sortBy: "name-ascending", direction: "forward" });

		expect(mockCacheTag).toHaveBeenCalledWith("colors");
	});

	// --- Sort order ---

	it("orders by name when sortBy starts with name-", async () => {
		mockGetSortDirection.mockReturnValue("asc");
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColors({ sortBy: "name-ascending", direction: "forward" });

		expect(mockPrisma.color.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ name: "asc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by name descending when sortBy is name-descending", async () => {
		mockGetSortDirection.mockReturnValue("desc");
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColors({ sortBy: "name-descending", direction: "forward" });

		expect(mockPrisma.color.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ name: "desc" }, { id: "asc" }],
			}),
		);
	});

	it("orders by sku count when sortBy starts with skuCount-", async () => {
		mockGetSortDirection.mockReturnValue("asc");
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColors({ sortBy: "skuCount-ascending", direction: "forward" });

		expect(mockPrisma.color.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ skus: { _count: "asc" } }, { id: "asc" }],
			}),
		);
	});

	// --- Pagination ---

	it("uses perPage param clamped to max inside fetchColors", async () => {
		mockBuildCursorPagination.mockReturnValue({ take: 201 });
		mockPrisma.color.findMany.mockResolvedValue([]);

		// 200 is the maximum accepted by the schema; clamping occurs inside fetchColors
		await getColors({ sortBy: "name-ascending", direction: "forward", perPage: 200 });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
	});

	it("uses default perPage when not provided", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColors({ sortBy: "name-ascending", direction: "forward" });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
	});

	// Cursor must be exactly 25 characters (cuid2 length) to pass schema validation
	it("passes cursor to buildCursorPagination", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);
		const validCursor = "cm6z1234567890abcdefghijk";

		await getColors({ sortBy: "name-ascending", direction: "forward", cursor: validCursor });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: validCursor }),
		);
	});

	it("passes direction to buildCursorPagination", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColors({ sortBy: "name-ascending", direction: "backward" });

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ direction: "backward" }),
		);
	});

	// --- Where clause ---

	it("passes built where clause to prisma query", async () => {
		const whereClause = { name: { contains: "rouge" } };
		mockBuildColorWhereClause.mockReturnValue(whereClause);
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColors({ sortBy: "name-ascending", direction: "forward", search: "rouge" });

		expect(mockPrisma.color.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: whereClause }),
		);
	});

	// --- Result processing ---

	it("returns colors from processCursorResults", async () => {
		const colors = [makeColor()];
		mockProcessCursorResults.mockReturnValue({
			items: colors,
			pagination: emptyPagination,
		});
		mockPrisma.color.findMany.mockResolvedValue(colors);

		const result = await getColors({ sortBy: "name-ascending", direction: "forward" });

		expect(result.colors).toEqual(colors);
	});

	it("returns pagination from processCursorResults", async () => {
		const pagination = {
			nextCursor: "cursor-2",
			prevCursor: null,
			hasNextPage: true,
			hasPreviousPage: false,
		};
		mockProcessCursorResults.mockReturnValue({ items: [], pagination });
		mockPrisma.color.findMany.mockResolvedValue([]);

		const result = await getColors({ sortBy: "name-ascending", direction: "forward" });

		expect(result.pagination).toEqual(pagination);
	});

	// --- Error handling ---

	it("returns empty result on database error", async () => {
		mockPrisma.color.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getColors({ sortBy: "name-ascending", direction: "forward" });

		expect(result.colors).toEqual([]);
		expect(result.pagination).toEqual(emptyPagination);
	});

	it("uses GET_COLORS_SELECT for the DB query", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColors({ sortBy: "name-ascending", direction: "forward" });

		expect(mockPrisma.color.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					name: true,
					slug: true,
					hex: true,
					isActive: true,
					createdAt: true,
					updatedAt: true,
					_count: { select: { skus: true } },
				},
			}),
		);
	});
});
