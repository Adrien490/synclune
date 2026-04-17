import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrismaUserCount, mockPrismaUserFindUnique, mockPrismaQueryRaw, mockCacheDashboard } =
	vi.hoisted(() => ({
		mockPrismaUserCount: vi.fn(),
		mockPrismaUserFindUnique: vi.fn(),
		mockPrismaQueryRaw: vi.fn(),
		mockCacheDashboard: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		user: {
			count: mockPrismaUserCount,
			findUnique: mockPrismaUserFindUnique,
		},
		$queryRaw: mockPrismaQueryRaw,
	},
	notDeleted: { deletedAt: null },
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
		CUSTOMER_KPIS: "dashboard-customer-kpis",
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	AccountStatus: {
		ACTIVE: "ACTIVE",
		INACTIVE: "INACTIVE",
		PENDING_DELETION: "PENDING_DELETION",
		ANONYMIZED: "ANONYMIZED",
	},
}));

import { fetchCustomerKpis } from "../get-customer-kpis";

// ============================================================================
// HELPERS
// ============================================================================

type ActiveCustomersRow = { userId: string; hasPriorOrder: boolean };
type SpendRow = { userId: string; totalSpent: bigint | number; orderCount: bigint | number };

function setupMocks({
	newCustomersCurrent = 5,
	newCustomersPrevious = 3,
	currentActive = [] as ActiveCustomersRow[],
	previousActive = [] as ActiveCustomersRow[],
	topSpender = [] as SpendRow[],
	topSpenderUser = null as { name: string | null; email: string } | null,
} = {}) {
	mockPrismaUserCount
		.mockResolvedValueOnce(newCustomersCurrent)
		.mockResolvedValueOnce(newCustomersPrevious);

	mockPrismaQueryRaw
		.mockResolvedValueOnce(currentActive)
		.mockResolvedValueOnce(previousActive)
		.mockResolvedValueOnce(topSpender);

	if (topSpenderUser !== null) {
		mockPrismaUserFindUnique.mockResolvedValue(topSpenderUser);
	} else {
		mockPrismaUserFindUnique.mockResolvedValue(null);
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchCustomerKpis", () => {
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

	it("should return all customer KPIs with expected shape", async () => {
		setupMocks();

		const result = await fetchCustomerKpis();

		expect(result).toHaveProperty("newCustomers");
		expect(result).toHaveProperty("returningRate");
		expect(result).toHaveProperty("topSpender");
		expect(result.newCustomers).toHaveProperty("count");
		expect(result.newCustomers).toHaveProperty("evolution");
		expect(result.returningRate).toHaveProperty("rate");
		expect(result.returningRate).toHaveProperty("returningCount");
		expect(result.returningRate).toHaveProperty("totalActiveCustomers");
		expect(result.returningRate).toHaveProperty("evolution");
	});

	it("should call cacheDashboard with CUSTOMER_KPIS tag", async () => {
		setupMocks();

		await fetchCustomerKpis();

		expect(mockCacheDashboard).toHaveBeenCalledWith("dashboard-customer-kpis");
	});

	// -------------------------------------------------------------------------
	// New customers
	// -------------------------------------------------------------------------

	it("should return new customers count for current period", async () => {
		setupMocks({ newCustomersCurrent: 12, newCustomersPrevious: 8 });

		const result = await fetchCustomerKpis();

		expect(result.newCustomers.count).toBe(12);
	});

	it("should compute positive new customers evolution", async () => {
		setupMocks({ newCustomersCurrent: 10, newCustomersPrevious: 5 });

		const result = await fetchCustomerKpis();

		expect(result.newCustomers.evolution).toBeCloseTo(100);
	});

	it("should compute negative new customers evolution", async () => {
		setupMocks({ newCustomersCurrent: 4, newCustomersPrevious: 8 });

		const result = await fetchCustomerKpis();

		expect(result.newCustomers.evolution).toBeCloseTo(-50);
	});

	it("should return evolution of 0 when previous period had no new customers", async () => {
		setupMocks({ newCustomersCurrent: 5, newCustomersPrevious: 0 });

		const result = await fetchCustomerKpis();

		expect(result.newCustomers.evolution).toBe(0);
	});

	it("should exclude anonymized accounts from new customers count (filter passed to prisma)", async () => {
		setupMocks();

		await fetchCustomerKpis();

		const firstCallArgs = mockPrismaUserCount.mock.calls[0]?.[0];
		expect(firstCallArgs.where.accountStatus).toEqual({ not: "ANONYMIZED" });
		expect(firstCallArgs.where.deletedAt).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Returning rate
	// -------------------------------------------------------------------------

	it("should compute returning rate as % of active customers with prior order", async () => {
		setupMocks({
			currentActive: [
				{ userId: "u1", hasPriorOrder: true },
				{ userId: "u2", hasPriorOrder: true },
				{ userId: "u3", hasPriorOrder: false },
				{ userId: "u4", hasPriorOrder: false },
			],
		});

		const result = await fetchCustomerKpis();

		expect(result.returningRate.totalActiveCustomers).toBe(4);
		expect(result.returningRate.returningCount).toBe(2);
		expect(result.returningRate.rate).toBe(50);
	});

	it("should return rate of 0 when no active customers in period", async () => {
		setupMocks({ currentActive: [] });

		const result = await fetchCustomerKpis();

		expect(result.returningRate.rate).toBe(0);
		expect(result.returningRate.totalActiveCustomers).toBe(0);
	});

	it("should compute 100% when all active customers are returning", async () => {
		setupMocks({
			currentActive: [
				{ userId: "u1", hasPriorOrder: true },
				{ userId: "u2", hasPriorOrder: true },
			],
		});

		const result = await fetchCustomerKpis();

		expect(result.returningRate.rate).toBe(100);
	});

	it("should compute returning rate evolution vs previous period", async () => {
		setupMocks({
			currentActive: [
				{ userId: "u1", hasPriorOrder: true },
				{ userId: "u2", hasPriorOrder: true },
				{ userId: "u3", hasPriorOrder: false },
			],
			previousActive: [
				{ userId: "u4", hasPriorOrder: true },
				{ userId: "u5", hasPriorOrder: false },
				{ userId: "u6", hasPriorOrder: false },
			],
		});

		const result = await fetchCustomerKpis();

		// Current rate ≈ 66.67%, previous rate ≈ 33.33% → +100%
		expect(result.returningRate.rate).toBeCloseTo(66.67, 1);
		expect(result.returningRate.evolution).toBeCloseTo(100, 1);
	});

	it("should return evolution of 0 when previous period had no active customers", async () => {
		setupMocks({
			currentActive: [{ userId: "u1", hasPriorOrder: true }],
			previousActive: [],
		});

		const result = await fetchCustomerKpis();

		expect(result.returningRate.evolution).toBe(0);
	});

	// -------------------------------------------------------------------------
	// Top spender
	// -------------------------------------------------------------------------

	it("should return null topSpender when no orders in period", async () => {
		setupMocks({ topSpender: [] });

		const result = await fetchCustomerKpis();

		expect(result.topSpender).toBeNull();
		expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
	});

	it("should return top spender with name and email when user found", async () => {
		setupMocks({
			topSpender: [{ userId: "u1", totalSpent: BigInt(15000), orderCount: BigInt(3) }],
			topSpenderUser: { name: "Alice", email: "alice@example.com" },
		});

		const result = await fetchCustomerKpis();

		expect(result.topSpender).toEqual({
			userId: "u1",
			customerName: "Alice",
			customerEmail: "alice@example.com",
			totalSpent: 15000,
			orderCount: 3,
		});
	});

	it("should default name to 'Client' when user has no name", async () => {
		setupMocks({
			topSpender: [{ userId: "u1", totalSpent: 8000, orderCount: 2 }],
			topSpenderUser: { name: null, email: "x@y.z" },
		});

		const result = await fetchCustomerKpis();

		expect(result.topSpender?.customerName).toBe("Client");
		expect(result.topSpender?.customerEmail).toBe("x@y.z");
	});

	it("should fallback to empty email when user not found anymore", async () => {
		setupMocks({
			topSpender: [{ userId: "u1", totalSpent: 5000, orderCount: 1 }],
			topSpenderUser: null,
		});

		const result = await fetchCustomerKpis();

		expect(result.topSpender?.customerName).toBe("Client");
		expect(result.topSpender?.customerEmail).toBe("");
	});

	it("should convert bigint totalSpent and orderCount to numbers", async () => {
		setupMocks({
			topSpender: [{ userId: "u1", totalSpent: BigInt(99999), orderCount: BigInt(7) }],
			topSpenderUser: { name: "Bob", email: "bob@x.com" },
		});

		const result = await fetchCustomerKpis();

		expect(typeof result.topSpender?.totalSpent).toBe("number");
		expect(typeof result.topSpender?.orderCount).toBe("number");
		expect(result.topSpender?.totalSpent).toBe(99999);
		expect(result.topSpender?.orderCount).toBe(7);
	});

	// -------------------------------------------------------------------------
	// Period parameter
	// -------------------------------------------------------------------------

	it("should accept different period values", async () => {
		setupMocks();

		await expect(fetchCustomerKpis("7d")).resolves.toBeDefined();
		setupMocks();
		await expect(fetchCustomerKpis("year")).resolves.toBeDefined();
	});
});
