import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrismaQueryRaw, mockCacheDashboard } = vi.hoisted(() => ({
	mockPrismaQueryRaw: vi.fn(),
	mockCacheDashboard: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRaw: mockPrismaQueryRaw,
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

vi.mock("@/shared/lib/cache", () => ({
	cacheDashboard: mockCacheDashboard,
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: {
		CART_ABANDONMENT: "dashboard-cart-abandonment",
	},
}));

import { fetchCartAbandonment } from "../get-cart-abandonment";

// ============================================================================
// HELPERS
// ============================================================================

function setupMocks({
	activeCount = 0,
	activeValue = 0,
	currentEmailsSent = 0,
	previousEmailsSent = 0,
	currentRecovered = 0,
	previousRecovered = 0,
}: {
	activeCount?: number;
	activeValue?: number;
	currentEmailsSent?: number;
	previousEmailsSent?: number;
	currentRecovered?: number;
	previousRecovered?: number;
} = {}) {
	mockPrismaQueryRaw
		.mockResolvedValueOnce([{ cart_count: BigInt(activeCount), total_value: BigInt(activeValue) }])
		.mockResolvedValueOnce([{ count: BigInt(currentEmailsSent) }])
		.mockResolvedValueOnce([{ count: BigInt(previousEmailsSent) }])
		.mockResolvedValueOnce([
			{ period: "current", count: BigInt(currentRecovered) },
			{ period: "previous", count: BigInt(previousRecovered) },
		]);
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchCartAbandonment", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("should return all cart abandonment metrics with expected shape", async () => {
		setupMocks();

		const result = await fetchCartAbandonment();

		expect(result).toHaveProperty("activeCarts");
		expect(result).toHaveProperty("abandonedEmailsSent");
		expect(result).toHaveProperty("recoveryRate");
		expect(result.activeCarts).toHaveProperty("count");
		expect(result.activeCarts).toHaveProperty("totalValue");
		expect(result.abandonedEmailsSent).toHaveProperty("count");
		expect(result.abandonedEmailsSent).toHaveProperty("evolution");
		expect(result.recoveryRate).toHaveProperty("rate");
		expect(result.recoveryRate).toHaveProperty("recoveredCount");
		expect(result.recoveryRate).toHaveProperty("evolution");
	});

	it("should call cacheDashboard with CART_ABANDONMENT tag", async () => {
		setupMocks();

		await fetchCartAbandonment();

		expect(mockCacheDashboard).toHaveBeenCalledWith("dashboard-cart-abandonment");
	});

	it("should make exactly 4 raw SQL queries", async () => {
		setupMocks();

		await fetchCartAbandonment();

		expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(4);
	});

	// -------------------------------------------------------------------------
	// Active carts
	// -------------------------------------------------------------------------

	it("should return active carts count and total value as numbers", async () => {
		setupMocks({ activeCount: 25, activeValue: 12500 });

		const result = await fetchCartAbandonment();

		expect(result.activeCarts.count).toBe(25);
		expect(result.activeCarts.totalValue).toBe(12500);
		expect(typeof result.activeCarts.count).toBe("number");
		expect(typeof result.activeCarts.totalValue).toBe("number");
	});

	it("should default active carts to 0 when query returns empty", async () => {
		mockPrismaQueryRaw
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([{ count: BigInt(0) }])
			.mockResolvedValueOnce([{ count: BigInt(0) }])
			.mockResolvedValueOnce([
				{ period: "current", count: BigInt(0) },
				{ period: "previous", count: BigInt(0) },
			]);

		const result = await fetchCartAbandonment();

		expect(result.activeCarts.count).toBe(0);
		expect(result.activeCarts.totalValue).toBe(0);
	});

	it("should handle null cart_count and total_value defensively", async () => {
		mockPrismaQueryRaw
			.mockResolvedValueOnce([{ cart_count: null, total_value: null }])
			.mockResolvedValueOnce([{ count: BigInt(0) }])
			.mockResolvedValueOnce([{ count: BigInt(0) }])
			.mockResolvedValueOnce([
				{ period: "current", count: BigInt(0) },
				{ period: "previous", count: BigInt(0) },
			]);

		const result = await fetchCartAbandonment();

		expect(result.activeCarts.count).toBe(0);
		expect(result.activeCarts.totalValue).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Abandoned emails sent
	// -------------------------------------------------------------------------

	it("should return abandoned emails sent count for current period", async () => {
		setupMocks({ currentEmailsSent: 12, previousEmailsSent: 8 });

		const result = await fetchCartAbandonment();

		expect(result.abandonedEmailsSent.count).toBe(12);
	});

	it("should compute positive abandoned emails evolution", async () => {
		setupMocks({ currentEmailsSent: 20, previousEmailsSent: 10 });

		const result = await fetchCartAbandonment();

		expect(result.abandonedEmailsSent.evolution).toBeCloseTo(100);
	});

	it("should return evolution of 0 when previous emails sent is 0", async () => {
		setupMocks({ currentEmailsSent: 5, previousEmailsSent: 0 });

		const result = await fetchCartAbandonment();

		expect(result.abandonedEmailsSent.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Recovery rate
	// -------------------------------------------------------------------------

	it("should compute recovery rate as % of recovered carts among emails sent", async () => {
		setupMocks({ currentEmailsSent: 10, currentRecovered: 3 });

		const result = await fetchCartAbandonment();

		expect(result.recoveryRate.rate).toBe(30);
		expect(result.recoveryRate.recoveredCount).toBe(3);
	});

	it("should return rate of 0 when no emails sent in period", async () => {
		setupMocks({ currentEmailsSent: 0, currentRecovered: 0 });

		const result = await fetchCartAbandonment();

		expect(result.recoveryRate.rate).toBe(0);
		expect(result.recoveryRate.recoveredCount).toBe(0);
	});

	it("should compute 100% recovery when all emails resulted in payment", async () => {
		setupMocks({ currentEmailsSent: 5, currentRecovered: 5 });

		const result = await fetchCartAbandonment();

		expect(result.recoveryRate.rate).toBe(100);
	});

	it("should compute recovery rate evolution vs previous period", async () => {
		setupMocks({
			currentEmailsSent: 10,
			currentRecovered: 4,
			previousEmailsSent: 10,
			previousRecovered: 2,
		});

		const result = await fetchCartAbandonment();

		// Current 40%, previous 20%, evolution +100%
		expect(result.recoveryRate.rate).toBe(40);
		expect(result.recoveryRate.evolution).toBeCloseTo(100);
	});

	it("should return evolution of 0 when previous rate is 0", async () => {
		setupMocks({
			currentEmailsSent: 10,
			currentRecovered: 5,
			previousEmailsSent: 5,
			previousRecovered: 0,
		});

		const result = await fetchCartAbandonment();

		expect(result.recoveryRate.evolution).toBe(0);
	});

	it("should handle missing 'previous' row in recovery query gracefully", async () => {
		mockPrismaQueryRaw
			.mockResolvedValueOnce([{ cart_count: BigInt(0), total_value: BigInt(0) }])
			.mockResolvedValueOnce([{ count: BigInt(5) }])
			.mockResolvedValueOnce([{ count: BigInt(0) }])
			.mockResolvedValueOnce([{ period: "current", count: BigInt(2) }]); // no 'previous' row

		const result = await fetchCartAbandonment();

		expect(result.recoveryRate.recoveredCount).toBe(2);
		expect(result.recoveryRate.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Period parameter
	// -------------------------------------------------------------------------

	it("should accept different period values", async () => {
		setupMocks();
		await expect(fetchCartAbandonment("7d")).resolves.toBeDefined();
		setupMocks();
		await expect(fetchCartAbandonment("year")).resolves.toBeDefined();
	});
});
