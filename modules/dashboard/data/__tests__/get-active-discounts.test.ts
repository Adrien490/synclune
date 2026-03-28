import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDiscountFindMany, mockCacheDefault } = vi.hoisted(() => ({
	mockDiscountFindMany: vi.fn(),
	mockCacheDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		discount: { findMany: mockDiscountFindMany },
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: mockCacheDefault,
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		ACTIVE_DISCOUNTS: "dashboard-active-discounts",
	},
}));

import { fetchActiveDiscounts } from "../get-active-discounts";

// ============================================================================
// HELPERS
// ============================================================================

function makeDiscount(
	overrides: Partial<{
		id: string;
		code: string;
		type: string;
		value: number;
		usageCount: number;
		maxUsageCount: number | null;
		endsAt: Date | null;
	}> = {},
) {
	return {
		id: "discount-1",
		code: "SAVE10",
		type: "PERCENTAGE",
		value: 10,
		usageCount: 5,
		maxUsageCount: 100,
		endsAt: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchActiveDiscounts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockDiscountFindMany.mockResolvedValue([]);
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return an object with a discounts array", async () => {
		const result = await fetchActiveDiscounts();

		expect(result).toHaveProperty("discounts");
		expect(Array.isArray(result.discounts)).toBe(true);
	});

	it("should return empty discounts array when no active discounts exist", async () => {
		const result = await fetchActiveDiscounts();

		expect(result.discounts).toEqual([]);
	});

	it("should map discount rows to ActiveDiscountItem shape", async () => {
		const endsAt = new Date("2026-12-31T00:00:00Z");
		mockDiscountFindMany.mockResolvedValue([
			makeDiscount({
				id: "d1",
				code: "CODE1",
				type: "PERCENTAGE",
				value: 15,
				usageCount: 3,
				maxUsageCount: 50,
				endsAt,
			}),
		]);

		const result = await fetchActiveDiscounts();

		expect(result.discounts).toHaveLength(1);
		expect(result.discounts[0]).toEqual({
			id: "d1",
			code: "CODE1",
			type: "PERCENTAGE",
			value: 15,
			usageCount: 3,
			maxUsageCount: 50,
			endsAt,
		});
	});

	it("should handle discounts with null maxUsageCount", async () => {
		mockDiscountFindMany.mockResolvedValue([makeDiscount({ maxUsageCount: null })]);

		const result = await fetchActiveDiscounts();

		expect(result.discounts[0]?.maxUsageCount).toBeNull();
	});

	it("should handle discounts with null endsAt", async () => {
		mockDiscountFindMany.mockResolvedValue([makeDiscount({ endsAt: null })]);

		const result = await fetchActiveDiscounts();

		expect(result.discounts[0]?.endsAt).toBeNull();
	});

	it("should return all 5 discounts when findMany returns 5 rows", async () => {
		const rows = Array.from({ length: 5 }, (_, i) =>
			makeDiscount({ id: `d${i}`, code: `CODE${i}`, usageCount: 10 - i }),
		);
		mockDiscountFindMany.mockResolvedValue(rows);

		const result = await fetchActiveDiscounts();

		expect(result.discounts).toHaveLength(5);
	});

	// -------------------------------------------------------------------------
	// Prisma query filters
	// -------------------------------------------------------------------------

	it("should query only active, non-deleted discounts", async () => {
		await fetchActiveDiscounts();

		const [args] = mockDiscountFindMany.mock.calls[0] as [{ where: Record<string, unknown> }];
		expect(args.where.isActive).toBe(true);
		expect(args.where.deletedAt).toBeNull();
	});

	it("should filter for non-expired discounts (endsAt null OR endsAt > now)", async () => {
		await fetchActiveDiscounts();

		const [args] = mockDiscountFindMany.mock.calls[0] as [{ where: { OR: unknown[] } }];
		expect(args.where.OR).toHaveLength(2);
		expect(args.where.OR[0]).toEqual({ endsAt: null });
		expect(args.where.OR[1]).toMatchObject({ endsAt: { gt: expect.any(Date) } });
	});

	it("should order results by usageCount descending", async () => {
		await fetchActiveDiscounts();

		const [args] = mockDiscountFindMany.mock.calls[0] as [{ orderBy: unknown }];
		expect(args.orderBy).toEqual({ usageCount: "desc" });
	});

	it("should limit results to 5", async () => {
		await fetchActiveDiscounts();

		const [args] = mockDiscountFindMany.mock.calls[0] as [{ take: number }];
		expect(args.take).toBe(5);
	});

	it("should select only the required fields", async () => {
		await fetchActiveDiscounts();

		const [args] = mockDiscountFindMany.mock.calls[0] as [{ select: Record<string, boolean> }];
		expect(args.select).toEqual({
			id: true,
			code: true,
			type: true,
			value: true,
			usageCount: true,
			maxUsageCount: true,
			endsAt: true,
		});
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the ACTIVE_DISCOUNTS tag", async () => {
		await fetchActiveDiscounts();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-active-discounts");
	});

	it("should call cacheDashboard exactly once", async () => {
		await fetchActiveDiscounts();

		expect(mockCacheDefault).toHaveBeenCalledTimes(1);
	});
});
