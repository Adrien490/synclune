import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockCacheLife,
	mockCacheTag,
	mockCacheDiscounts,
	mockBuildDiscountWhereClause,
	mockGetSortDirection,
	mockBuildCursorPagination,
	mockProcessCursorResults,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: { findMany: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockCacheDiscounts: vi.fn(),
	mockBuildDiscountWhereClause: vi.fn(),
	mockGetSortDirection: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
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

vi.mock("../../constants/cache", () => ({
	cacheDiscounts: mockCacheDiscounts,
}));

vi.mock("../../constants/discount.constants", () => ({
	GET_DISCOUNTS_SELECT: {
		id: true,
		code: true,
		type: true,
		value: true,
		isActive: true,
		usageCount: true,
		createdAt: true,
	},
	GET_DISCOUNTS_DEFAULT_PER_PAGE: 20,
	GET_DISCOUNTS_MAX_RESULTS_PER_PAGE: 100,
	DISCOUNTS_SORT_OPTIONS: {
		CREATED_DESC: "created-descending",
		CREATED_ASC: "created-ascending",
		CODE_ASC: "code-ascending",
		CODE_DESC: "code-descending",
		USAGE_DESC: "usage-descending",
		USAGE_ASC: "usage-ascending",
	},
	DISCOUNTS_SORT_LABELS: {},
}));

vi.mock("../../schemas/discount.schemas", () => ({
	getDiscountsSchema: {
		safeParse: vi.fn((data: unknown) => ({
			success: true,
			data: {
				cursor: undefined,
				direction: "forward",
				perPage: 20,
				sortBy: "created-descending",
				...(data as object),
			},
		})),
	},
	discountFiltersSchema: {},
	discountSortBySchema: {},
}));

vi.mock("../../services/discount-query-builder", () => ({
	buildDiscountWhereClause: mockBuildDiscountWhereClause,
}));

vi.mock("@/shared/utils/sort-direction", () => ({
	getSortDirection: mockGetSortDirection,
}));

vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}));

import { getDiscounts } from "../get-discounts";
import { getDiscountsSchema } from "../../schemas/discount.schemas";

const mockSchema = getDiscountsSchema as unknown as { safeParse: ReturnType<typeof vi.fn> };

// ============================================================================
// Factories
// ============================================================================

const emptyPagination = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
};

function makeDiscount(overrides: Record<string, unknown> = {}) {
	return {
		id: "discount-cuid-001",
		code: "PROMO10",
		type: "PERCENTAGE",
		value: 10,
		isActive: true,
		usageCount: 5,
		createdAt: new Date("2024-01-01"),
		...overrides,
	};
}

function makeValidParams() {
	return {
		cursor: undefined,
		direction: "forward" as const,
		perPage: 20,
		sortBy: "created-descending",
	};
}

function setupDefaults() {
	mockBuildDiscountWhereClause.mockReturnValue({});
	mockGetSortDirection.mockReturnValue("desc");
	mockBuildCursorPagination.mockReturnValue({ take: 21 });
	mockPrisma.discount.findMany.mockResolvedValue([makeDiscount()]);
	mockProcessCursorResults.mockReturnValue({
		items: [makeDiscount()],
		pagination: emptyPagination,
	});
	mockSchema.safeParse.mockReturnValue({
		success: true,
		data: makeValidParams(),
	});
}

// ============================================================================
// Tests: getDiscounts
// ============================================================================

describe("getDiscounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("throws when validation fails", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "sortBy invalide" }] },
		});

		await expect(getDiscounts(makeValidParams() as never)).rejects.toThrow("Invalid parameters");
	});

	it("returns discounts for valid params (no auth required)", async () => {
		const discount = makeDiscount();
		mockProcessCursorResults.mockReturnValue({
			items: [discount],
			pagination: emptyPagination,
		});

		const result = await getDiscounts(makeValidParams() as never);

		expect(result.discounts).toEqual([discount]);
	});

	it("returns empty list when no discounts found", async () => {
		mockPrisma.discount.findMany.mockResolvedValue([]);
		mockProcessCursorResults.mockReturnValue({
			items: [],
			pagination: emptyPagination,
		});

		const result = await getDiscounts(makeValidParams() as never);

		expect(result.discounts).toEqual([]);
	});

	it("calls cacheDiscounts helper (which sets cacheLife and cacheTag)", async () => {
		await getDiscounts(makeValidParams() as never);

		expect(mockCacheDiscounts).toHaveBeenCalledOnce();
	});

	it("uses GET_DISCOUNTS_SELECT for the DB query", async () => {
		await getDiscounts(makeValidParams() as never);

		expect(mockPrisma.discount.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, code: true, type: true, value: true, isActive: true, usageCount: true, createdAt: true },
			})
		);
	});

	it("passes where clause from buildDiscountWhereClause to DB query", async () => {
		mockBuildDiscountWhereClause.mockReturnValue({ isActive: true });

		await getDiscounts(makeValidParams() as never);

		expect(mockPrisma.discount.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { isActive: true },
			})
		);
	});

	it("orders by createdAt for created-descending sort", async () => {
		mockGetSortDirection.mockReturnValue("desc");
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), sortBy: "created-descending" },
		});

		await getDiscounts(makeValidParams() as never);

		expect(mockPrisma.discount.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ createdAt: "desc" }, { id: "asc" }],
			})
		);
	});

	it("orders by code for code-ascending sort", async () => {
		mockGetSortDirection.mockReturnValue("asc");
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), sortBy: "code-ascending" },
		});

		await getDiscounts(makeValidParams() as never);

		expect(mockPrisma.discount.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ code: "asc" }, { id: "asc" }],
			})
		);
	});

	it("orders by usageCount for usage-descending sort", async () => {
		mockGetSortDirection.mockReturnValue("desc");
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), sortBy: "usage-descending" },
		});

		await getDiscounts(makeValidParams() as never);

		expect(mockPrisma.discount.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ usageCount: "desc" }, { id: "asc" }],
			})
		);
	});

	it("passes cursor config from buildCursorPagination to DB query", async () => {
		mockBuildCursorPagination.mockReturnValue({ take: 21, skip: 1, cursor: { id: "discount-prev" } });

		await getDiscounts(makeValidParams() as never);

		expect(mockPrisma.discount.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				take: 21,
				skip: 1,
				cursor: { id: "discount-prev" },
			})
		);
	});

	it("calls processCursorResults with DB results and pagination params", async () => {
		const discounts = [makeDiscount()];
		mockPrisma.discount.findMany.mockResolvedValue(discounts);
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), cursor: "some-cursor", direction: "forward" },
		});

		await getDiscounts(makeValidParams() as never);

		expect(mockProcessCursorResults).toHaveBeenCalledWith(
			discounts,
			20,
			"forward",
			"some-cursor"
		);
	});

	it("returns empty result on DB error inside fetchDiscounts", async () => {
		mockPrisma.discount.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getDiscounts(makeValidParams() as never);

		expect(result.discounts).toEqual([]);
		expect(result.pagination).toEqual(emptyPagination);
	});

	it("caps perPage at GET_DISCOUNTS_MAX_RESULTS_PER_PAGE (100)", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), perPage: 999 },
		});

		await getDiscounts(makeValidParams() as never);

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ take: 100 })
		);
	});

	it("uses default perPage when perPage is 0", async () => {
		mockSchema.safeParse.mockReturnValue({
			success: true,
			data: { ...makeValidParams(), perPage: 0 },
		});

		await getDiscounts(makeValidParams() as never);

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ take: 20 })
		);
	});
});
