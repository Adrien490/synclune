import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		cart: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		$executeRaw: vi.fn(),
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { cleanupExpiredCarts } from "../cleanup-carts.service";

describe("cleanupExpiredCarts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2036-03-01T08:00:00Z"));
		// Suppress console.log for cleaner test output
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});

		// Default: findMany returns some cart IDs
		mockPrisma.cart.findMany.mockResolvedValue([
			{ id: "cart-1" },
			{ id: "cart-2" },
			{ id: "cart-3" },
		]);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 3 });
		mockPrisma.$executeRaw.mockResolvedValue(0);
	});

	it("should delete expired guest carts (expiresAt < now, userId null)", async () => {
		const cartIds = [{ id: "cart-a" }, { id: "cart-b" }, { id: "cart-c" }, { id: "cart-d" }, { id: "cart-e" }];
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 5 });

		await cleanupExpiredCarts();

		expect(mockPrisma.cart.findMany).toHaveBeenCalledWith({
			where: {
				expiresAt: { lt: new Date("2036-03-01T08:00:00Z") },
				userId: null,
			},
			select: { id: true },
			take: 1000,
		});

		expect(mockPrisma.cart.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["cart-a", "cart-b", "cart-c", "cart-d", "cart-e"] } },
		});
	});

	it("should clean orphaned cart items via raw SQL", async () => {
		mockPrisma.$executeRaw.mockResolvedValue(2);

		await cleanupExpiredCarts();

		expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
		// Check that the SQL query uses the expected pattern
		const sqlQuery = mockPrisma.$executeRaw.mock.calls[0][0];
		expect(sqlQuery.join("")).toContain('DELETE FROM "CartItem"');
		expect(sqlQuery.join("")).toContain('NOT EXISTS');
		expect(sqlQuery.join("")).toContain('SELECT 1 FROM "Cart"');
		expect(sqlQuery.join("")).toContain('LIMIT');
	});

	it("should return correct counts for deleted carts and orphaned items", async () => {
		const cartIds = Array.from({ length: 7 }, (_, i) => ({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 7 });
		mockPrisma.$executeRaw.mockResolvedValue(3);

		const result = await cleanupExpiredCarts();

		expect(result).toEqual({
			deletedCount: 7,
			orphanedItemsCount: 3,
		});
	});

	it("should handle zero expired carts", async () => {
		mockPrisma.cart.findMany.mockResolvedValue([]);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.$executeRaw.mockResolvedValue(0);

		const result = await cleanupExpiredCarts();

		expect(result).toEqual({
			deletedCount: 0,
			orphanedItemsCount: 0,
		});
		expect(mockPrisma.cart.findMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.cart.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
	});

	it("should handle zero orphaned items", async () => {
		const cartIds = Array.from({ length: 4 }, (_, i) => ({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 4 });
		mockPrisma.$executeRaw.mockResolvedValue(0);

		const result = await cleanupExpiredCarts();

		expect(result).toEqual({
			deletedCount: 4,
			orphanedItemsCount: 0,
		});
	});

	it("should convert orphanedItemsCount from BigInt to Number", async () => {
		mockPrisma.cart.findMany.mockResolvedValue([{ id: "cart-1" }, { id: "cart-2" }]);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 2 });
		// $executeRaw can return a BigInt in real scenarios
		mockPrisma.$executeRaw.mockResolvedValue(BigInt(15));

		const result = await cleanupExpiredCarts();

		expect(result.orphanedItemsCount).toBe(15);
		expect(typeof result.orphanedItemsCount).toBe("number");
	});

	it("should only target guest carts (userId: null)", async () => {
		await cleanupExpiredCarts();

		const whereClause = mockPrisma.cart.findMany.mock.calls[0][0].where;
		expect(whereClause.userId).toBeNull();
	});

	it("should use current timestamp for expiresAt comparison", async () => {
		const mockDate = new Date("2036-06-15T12:30:00Z");
		vi.setSystemTime(mockDate);

		await cleanupExpiredCarts();

		const whereClause = mockPrisma.cart.findMany.mock.calls[0][0].where;
		expect(whereClause.expiresAt.lt).toEqual(mockDate);
	});

	it("should log cleanup progress to console", async () => {
		const consoleLogSpy = vi.spyOn(console, "log");
		const cartIds = Array.from({ length: 8 }, (_, i) => ({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 8 });
		mockPrisma.$executeRaw.mockResolvedValue(4);

		await cleanupExpiredCarts();

		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-carts] Starting expired carts cleanup..."
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-carts] Deleted 8 expired carts"
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-carts] Cleaned up 4 orphaned cart items"
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-carts] Cleanup completed"
		);
	});

	it("should not log orphaned items message when count is zero", async () => {
		const consoleLogSpy = vi.spyOn(console, "log");
		mockPrisma.$executeRaw.mockResolvedValue(0);

		await cleanupExpiredCarts();

		const logCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
		expect(logCalls).not.toContain(
			expect.stringContaining("Cleaned up 0 orphaned cart items")
		);
	});

	it("should log warning when delete limit is reached", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		// Return exactly CLEANUP_DELETE_LIMIT (1000) items to trigger the warning
		const cartIds = Array.from({ length: 1000 }, (_, i) => ({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 1000 });

		await cleanupExpiredCarts();

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-carts] Delete limit reached, remaining carts will be cleaned on next run"
		);
	});

	it("should not log warning when under delete limit", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const cartIds = Array.from({ length: 999 }, (_, i) => ({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 999 });

		await cleanupExpiredCarts();

		expect(consoleWarnSpy).not.toHaveBeenCalled();
	});

	it("should pass found IDs to deleteMany", async () => {
		const cartIds = [{ id: "abc-123" }, { id: "def-456" }];
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 2 });

		await cleanupExpiredCarts();

		expect(mockPrisma.cart.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["abc-123", "def-456"] } },
		});
	});
});
