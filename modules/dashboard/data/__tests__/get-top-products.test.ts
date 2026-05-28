import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrismaQueryRaw, mockCacheDefault, mockGetPeriodBoundaries } = vi.hoisted(() => ({
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDefault: vi.fn(),
	mockGetPeriodBoundaries: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRaw: mockPrismaQueryRaw,
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: mockCacheDefault,
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		KPIS: "dashboard-kpis",
		REVENUE_CHART: "dashboard-revenue-chart",
		RECENT_ORDERS: "dashboard-recent-orders",
		ALERTS: "dashboard-alerts",
		TOP_PRODUCTS: "dashboard-top-products",
	},
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: { LIST: "orders-list" },
}));

vi.mock("@/modules/dashboard/services/period-boundaries.service", () => ({
	getPeriodBoundaries: mockGetPeriodBoundaries,
}));

import { fetchDashboardTopProducts } from "../get-top-products";

// ============================================================================
// HELPERS
// ============================================================================

const FIXED_BOUNDARIES = {
	currentStart: new Date("2026-04-01T00:00:00Z"),
	currentEnd: new Date("2026-05-08T23:59:59Z"),
	previousStart: new Date("2026-03-01T00:00:00Z"),
	previousEnd: new Date("2026-04-01T00:00:00Z"),
	previousYearStart: new Date("2025-04-01T00:00:00Z"),
	previousYearEnd: new Date("2025-05-08T23:59:59Z"),
};

function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		productId: "prod-1",
		product_title: "Bracelet Or",
		product_image_url: "https://example.com/img.jpg",
		product_slug: "bracelet-or",
		revenue: 25000n,
		units_sold: 5n,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchDashboardTopProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetPeriodBoundaries.mockReturnValue(FIXED_BOUNDARIES);
		mockPrismaQueryRaw.mockResolvedValue([makeRow()]);
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("returns an object with a products array", async () => {
		const result = await fetchDashboardTopProducts();

		expect(result).toHaveProperty("products");
		expect(Array.isArray(result.products)).toBe(true);
	});

	it("converts bigint revenue/units_sold to number", async () => {
		mockPrismaQueryRaw.mockResolvedValue([makeRow({ revenue: 12300n, units_sold: 7n })]);

		const { products } = await fetchDashboardTopProducts();

		expect(products[0]?.revenue).toBe(12300);
		expect(products[0]?.unitsSold).toBe(7);
		expect(typeof products[0]?.revenue).toBe("number");
		expect(typeof products[0]?.unitsSold).toBe("number");
	});

	it("maps snake_case row fields to camelCase TopProductItem", async () => {
		mockPrismaQueryRaw.mockResolvedValue([
			makeRow({
				productId: "prod-42",
				product_title: "Collier Argent",
				product_image_url: "https://example.com/collier.jpg",
				product_slug: "collier-argent",
			}),
		]);

		const { products } = await fetchDashboardTopProducts();

		expect(products[0]).toEqual({
			productId: "prod-42",
			productSlug: "collier-argent",
			title: "Collier Argent",
			imageUrl: "https://example.com/collier.jpg",
			revenue: 25000,
			unitsSold: 5,
		});
	});

	it("handles soft-deleted/missing product (slug = null)", async () => {
		mockPrismaQueryRaw.mockResolvedValue([
			makeRow({
				productId: null,
				product_slug: null,
				product_image_url: null,
			}),
		]);

		const { products } = await fetchDashboardTopProducts();

		expect(products[0]?.productId).toBeNull();
		expect(products[0]?.productSlug).toBeNull();
		expect(products[0]?.imageUrl).toBeNull();
		// snapshot title is preserved
		expect(products[0]?.title).toBe("Bracelet Or");
	});

	it("returns empty array when no orders match the period", async () => {
		mockPrismaQueryRaw.mockResolvedValue([]);

		const result = await fetchDashboardTopProducts();

		expect(result.products).toEqual([]);
	});

	// -------------------------------------------------------------------------
	// Period boundaries
	// -------------------------------------------------------------------------

	it("calls getPeriodBoundaries with the requested period", async () => {
		await fetchDashboardTopProducts("year");

		expect(mockGetPeriodBoundaries).toHaveBeenCalledWith("year");
	});

	it("uses default period when not specified", async () => {
		await fetchDashboardTopProducts();

		expect(mockGetPeriodBoundaries).toHaveBeenCalledTimes(1);
		// DEFAULT_PERIOD is "month"
		expect(mockGetPeriodBoundaries).toHaveBeenCalledWith("month");
	});

	// -------------------------------------------------------------------------
	// Cache
	// -------------------------------------------------------------------------

	it("registers the TOP_PRODUCTS cache tag", async () => {
		await fetchDashboardTopProducts();

		expect(mockCacheDefault).toHaveBeenCalledWith("dashboard-top-products");
	});

	// -------------------------------------------------------------------------
	// SQL query — interpolated values
	// -------------------------------------------------------------------------

	it("interpolates the period boundaries into the raw SQL", async () => {
		await fetchDashboardTopProducts();

		expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(1);
		// $queryRaw is called as a tagged template: (strings, ...values)
		const call = mockPrismaQueryRaw.mock.calls[0];
		const values = call?.slice(1) ?? [];
		expect(values).toContain(FIXED_BOUNDARIES.currentStart);
		expect(values).toContain(FIXED_BOUNDARIES.currentEnd);
	});

	it("includes the LIMIT 5 clause via interpolated value", async () => {
		await fetchDashboardTopProducts();

		const call = mockPrismaQueryRaw.mock.calls[0];
		const values = call?.slice(1) ?? [];
		expect(values).toContain(5);
	});

	it("filters on encaissed payment statuses, soft-delete, and non-null productId snapshot", async () => {
		await fetchDashboardTopProducts();

		const sqlStrings = (mockPrismaQueryRaw.mock.calls[0]?.[0] ?? []) as string[];
		const sql = sqlStrings.join("?");
		// Statuts encaissés (ANALYTICS-AUDIT-001) interpolés via = ANY(...) sans cast ::text.
		expect(sql).toContain(`"paymentStatus" = ANY(`);
		expect(sql).toContain(`::"PaymentStatus"[]`);
		expect(sql).toContain(`o."deletedAt" IS NULL`);
		expect(sql).toContain(`p."deletedAt" IS NULL`);
		expect(sql).toContain(`ORDER BY revenue DESC`);

		// La liste de statuts est interpolée comme valeur (param), pas dans la chaîne SQL.
		const values = mockPrismaQueryRaw.mock.calls[0]?.slice(1) ?? [];
		expect(values).toContainEqual(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);
	});

	// -------------------------------------------------------------------------
	// Multiple products preserve ranking
	// -------------------------------------------------------------------------

	it("preserves the order returned by the query (already DESC by revenue)", async () => {
		mockPrismaQueryRaw.mockResolvedValue([
			makeRow({ productId: "prod-1", revenue: 30000n }),
			makeRow({ productId: "prod-2", revenue: 20000n }),
			makeRow({ productId: "prod-3", revenue: 10000n }),
		]);

		const { products } = await fetchDashboardTopProducts();

		expect(products.map((p) => p.productId)).toEqual(["prod-1", "prod-2", "prod-3"]);
		expect(products.map((p) => p.revenue)).toEqual([30000, 20000, 10000]);
	});
});
