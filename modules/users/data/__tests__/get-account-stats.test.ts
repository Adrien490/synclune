import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { count: vi.fn() },
		cart: { findUnique: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("@/modules/orders/constants/cache", () => ({
	ORDERS_CACHE_TAGS: {
		ACCOUNT_STATS: (userId: string) => `account-stats-${userId}`,
	},
}));

vi.mock("../../constants/account-stats.constants", () => ({
	CART_SELECT_FOR_COUNT: { _count: { select: { items: true } } },
	LAST_ORDER_SELECT_FOR_DATE: { createdAt: true },
}));

// Must be imported after mocks
import { getAccountStats, fetchAccountStats } from "../get-account-stats";

// ============================================================================
// Factories
// ============================================================================

function makeCart(itemCount: number) {
	return {
		_count: { items: itemCount },
	};
}

function setupDefaults() {
	mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
	// Use persistent resolved value so tests that override with Once don't conflict
	mockPrisma.order.count.mockResolvedValue(5);
	mockPrisma.cart.findUnique.mockResolvedValue(makeCart(3));
}

// ============================================================================
// Tests: getAccountStats
// ============================================================================

describe("getAccountStats", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when there is no session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await getAccountStats();

		expect(result).toBeNull();
		expect(mockPrisma.order.count).not.toHaveBeenCalled();
	});

	it("returns null when session has no user id", async () => {
		mockGetSession.mockResolvedValue({ user: {} });

		const result = await getAccountStats();

		expect(result).toBeNull();
		expect(mockPrisma.order.count).not.toHaveBeenCalled();
	});

	it("returns account stats for authenticated user", async () => {
		// First call (totalOrders) = 5, second call (pendingOrders) = 2
		mockPrisma.order.count
			.mockResolvedValueOnce(5)
			.mockResolvedValueOnce(2);

		const result = await getAccountStats();

		expect(result).toEqual({
			totalOrders: 5,
			pendingOrders: 2,
			cartItemsCount: 3,
		});
	});

	it("calls fetchAccountStats with session userId", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user-42" } });
		mockPrisma.order.count.mockReset();
		mockPrisma.order.count
			.mockResolvedValueOnce(1)
			.mockResolvedValueOnce(0);
		mockPrisma.cart.findUnique.mockResolvedValue(null);

		const result = await getAccountStats();

		expect(mockPrisma.order.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: "user-42" }),
			})
		);
		expect(result).toEqual({
			totalOrders: 1,
			pendingOrders: 0,
			cartItemsCount: 0,
		});
	});
});

// ============================================================================
// Tests: fetchAccountStats
// ============================================================================

describe("fetchAccountStats", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Persistent fallback values (can be overridden per-test with Once)
		mockPrisma.order.count.mockResolvedValue(10);
		mockPrisma.cart.findUnique.mockResolvedValue(makeCart(5));
	});

	it("calls cacheLife with userOrders profile", async () => {
		await fetchAccountStats("user-1");

		expect(mockCacheLife).toHaveBeenCalledWith("userOrders");
	});

	it("calls cacheTag with account-stats user-specific tag", async () => {
		await fetchAccountStats("user-1");

		expect(mockCacheTag).toHaveBeenCalledWith("account-stats-user-1");
	});

	it("counts total orders for the user excluding soft-deleted", async () => {
		await fetchAccountStats("user-1");

		expect(mockPrisma.order.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: "user-1", deletedAt: null },
			})
		);
	});

	it("counts pending (PROCESSING) orders for the user", async () => {
		await fetchAccountStats("user-1");

		expect(mockPrisma.order.count).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: "user-1", status: "PROCESSING", deletedAt: null },
			})
		);
	});

	it("fetches cart for the user using userId", async () => {
		await fetchAccountStats("user-1");

		expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: "user-1" },
			})
		);
	});

	it("uses CART_SELECT_FOR_COUNT for the cart query", async () => {
		await fetchAccountStats("user-1");

		expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { _count: { select: { items: true } } },
			})
		);
	});

	it("returns correct stats with all three values", async () => {
		mockPrisma.order.count
			.mockResolvedValueOnce(10)
			.mockResolvedValueOnce(3);

		const result = await fetchAccountStats("user-1");

		expect(result).toEqual({
			totalOrders: 10,
			pendingOrders: 3,
			cartItemsCount: 5,
		});
	});

	it("returns cartItemsCount of 0 when cart is null", async () => {
		mockPrisma.cart.findUnique.mockResolvedValue(null);

		const result = await fetchAccountStats("user-1");

		expect(result.cartItemsCount).toBe(0);
	});

	it("returns zero stats on DB error", async () => {
		mockPrisma.order.count.mockReset();
		mockPrisma.order.count.mockRejectedValue(new Error("DB unavailable"));

		const result = await fetchAccountStats("user-1");

		expect(result).toEqual({
			totalOrders: 0,
			pendingOrders: 0,
			cartItemsCount: 0,
		});
	});

	it("runs all three DB queries in parallel", async () => {
		const callOrder: string[] = [];
		mockPrisma.order.count.mockImplementation(() => {
			callOrder.push("order.count");
			return Promise.resolve(0);
		});
		mockPrisma.cart.findUnique.mockImplementation(() => {
			callOrder.push("cart.findUnique");
			return Promise.resolve(null);
		});

		await fetchAccountStats("user-1");

		// All three (2x order.count + 1x cart.findUnique) should have been called
		expect(mockPrisma.order.count).toHaveBeenCalledTimes(2);
		expect(mockPrisma.cart.findUnique).toHaveBeenCalledTimes(1);
	});
});
