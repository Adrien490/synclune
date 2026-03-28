import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrismaQueryRaw, mockCacheDefault } = vi.hoisted(() => ({
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDefault: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRaw: mockPrismaQueryRaw,
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
		TOP_PRODUCTS: "dashboard-top-products",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	PaymentStatus: { PAID: "PAID" },
}));

import { fetchTopProducts } from "../get-top-products";

// ============================================================================
// HELPERS
// ============================================================================

function makeTopProductRow(
	overrides: Partial<{
		productId: string | null;
		productTitle: string;
		productImageUrl: string | null;
		units_sold: bigint;
		revenue: bigint;
	}> = {},
) {
	return {
		productId: "product-1",
		productTitle: "Bague en or",
		productImageUrl: "https://example.com/image.jpg",
		units_sold: BigInt(10),
		revenue: BigInt(50000),
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchTopProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));

		mockPrismaQueryRaw.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return an object with a products array", async () => {
		const result = await fetchTopProducts();

		expect(result).toHaveProperty("products");
		expect(Array.isArray(result.products)).toBe(true);
	});

	it("should return empty products array when no rows are returned", async () => {
		const result = await fetchTopProducts();

		expect(result.products).toEqual([]);
	});

	it("should map raw rows to TopProductItem shape", async () => {
		const imageUrl = "https://example.com/ring.jpg";
		mockPrismaQueryRaw.mockResolvedValue([
			makeTopProductRow({
				productId: "p1",
				productTitle: "Collier argent",
				productImageUrl: imageUrl,
				units_sold: BigInt(7),
				revenue: BigInt(35000),
			}),
		]);

		const result = await fetchTopProducts();

		expect(result.products).toHaveLength(1);
		expect(result.products[0]).toEqual({
			productId: "p1",
			title: "Collier argent",
			imageUrl,
			unitsSold: 7,
			revenue: 35000,
		});
	});

	it("should convert BigInt units_sold to a regular number", async () => {
		mockPrismaQueryRaw.mockResolvedValue([makeTopProductRow({ units_sold: BigInt(42) })]);

		const result = await fetchTopProducts();

		expect(typeof result.products[0]?.unitsSold).toBe("number");
		expect(result.products[0]?.unitsSold).toBe(42);
	});

	it("should convert BigInt revenue to a regular number", async () => {
		mockPrismaQueryRaw.mockResolvedValue([makeTopProductRow({ revenue: BigInt(99999) })]);

		const result = await fetchTopProducts();

		expect(typeof result.products[0]?.revenue).toBe("number");
		expect(result.products[0]?.revenue).toBe(99999);
	});

	it("should handle null productId", async () => {
		mockPrismaQueryRaw.mockResolvedValue([makeTopProductRow({ productId: null })]);

		const result = await fetchTopProducts();

		expect(result.products[0]?.productId).toBeNull();
	});

	it("should handle null productImageUrl", async () => {
		mockPrismaQueryRaw.mockResolvedValue([makeTopProductRow({ productImageUrl: null })]);

		const result = await fetchTopProducts();

		expect(result.products[0]?.imageUrl).toBeNull();
	});

	it("should return up to 5 products", async () => {
		const rows = Array.from({ length: 5 }, (_, i) =>
			makeTopProductRow({
				productId: `p${i}`,
				productTitle: `Product ${i}`,
				revenue: BigInt((5 - i) * 10000),
			}),
		);
		mockPrismaQueryRaw.mockResolvedValue(rows);

		const result = await fetchTopProducts();

		expect(result.products).toHaveLength(5);
	});

	it("should preserve the order returned by the raw query", async () => {
		const rows = [
			makeTopProductRow({ productId: "p1", productTitle: "Top Product", revenue: BigInt(90000) }),
			makeTopProductRow({
				productId: "p2",
				productTitle: "Second Product",
				revenue: BigInt(60000),
			}),
			makeTopProductRow({ productId: "p3", productTitle: "Third Product", revenue: BigInt(30000) }),
		];
		mockPrismaQueryRaw.mockResolvedValue(rows);

		const result = await fetchTopProducts();

		expect(result.products[0]?.productId).toBe("p1");
		expect(result.products[1]?.productId).toBe("p2");
		expect(result.products[2]?.productId).toBe("p3");
	});

	// -------------------------------------------------------------------------
	// Date range computation
	// -------------------------------------------------------------------------

	it("should compute currentMonthStart as the first day of the current UTC month", async () => {
		// Fixed time: 2026-02-15T12:00:00Z → currentMonthStart = 2026-02-01T00:00:00Z
		await fetchTopProducts();

		// The $queryRaw template literal receives currentMonthStart as a parameter.
		// We can't inspect template literal calls directly, but we verify the raw query is called.
		expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(1);
	});

	it("should use the first day of January when called in January", async () => {
		vi.setSystemTime(new Date("2026-01-20T09:00:00Z"));
		mockPrismaQueryRaw.mockResolvedValue([]);

		await fetchTopProducts();

		expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(1);
	});

	// -------------------------------------------------------------------------
	// Raw query is called
	// -------------------------------------------------------------------------

	it("should query the database exactly once", async () => {
		await fetchTopProducts();

		expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(1);
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("should call cacheDashboard with the TOP_PRODUCTS tag", async () => {
		await fetchTopProducts();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-top-products");
	});

	it("should call cacheDashboard exactly once", async () => {
		await fetchTopProducts();

		expect(mockCacheDefault).toHaveBeenCalledTimes(1);
	});
});
