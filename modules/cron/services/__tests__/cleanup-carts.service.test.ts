import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
	mockPrisma: {
		cart: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		$executeRaw: vi.fn(),
	},
	mockLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

import { cleanupExpiredCarts } from "../cleanup-carts.service";

const GRACE_PERIOD_MS = 23 * 24 * 60 * 60 * 1000;

describe("cleanupExpiredCarts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-16T10:00:00Z"));

		mockPrisma.cart.findMany.mockResolvedValue([
			{ id: "cart-1" },
			{ id: "cart-2" },
			{ id: "cart-3" },
		]);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 3 });
		mockPrisma.$executeRaw.mockResolvedValue(0);
	});

	it("should hard-delete guest carts past grace period (expiresAt < now - 23j, userId null)", async () => {
		await cleanupExpiredCarts();

		const expectedCutoff = new Date(new Date("2026-02-16T10:00:00Z").getTime() - GRACE_PERIOD_MS);
		expect(mockPrisma.cart.findMany).toHaveBeenCalledWith({
			where: {
				expiresAt: { lt: expectedCutoff },
				userId: null,
			},
			select: { id: true },
			take: 1000,
		});
	});

	it("should preserve user carts (userId not null)", async () => {
		await cleanupExpiredCarts();

		const whereClause = mockPrisma.cart.findMany.mock.calls[0]![0].where;
		expect(whereClause.userId).toBeNull();
	});

	it("should clean orphaned CartItems via raw SQL safety net", async () => {
		mockPrisma.$executeRaw.mockResolvedValue(5);

		await cleanupExpiredCarts();

		expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
		const sqlQuery = mockPrisma.$executeRaw.mock.calls[0]![0];
		expect(sqlQuery.join("")).toContain('DELETE FROM "CartItem"');
		expect(sqlQuery.join("")).toContain("NOT EXISTS");
		expect(sqlQuery.join("")).toContain('SELECT 1 FROM "Cart"');
	});

	it("should return correct counts for deleted carts and orphaned items", async () => {
		const cartIds = Array.from({ length: 7 }, (_, i) => ({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 7 });
		mockPrisma.$executeRaw.mockResolvedValue(BigInt(12));

		const result = await cleanupExpiredCarts();

		expect(result).toMatchObject({
			deletedCount: 7,
			orphanedItemsCount: 12,
			hasMore: false,
		});
		expect(typeof result.orphanedItemsCount).toBe("number");
	});

	it("should handle zero expired carts", async () => {
		mockPrisma.cart.findMany.mockResolvedValue([]);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 0 });

		const result = await cleanupExpiredCarts();

		expect(result).toMatchObject({
			deletedCount: 0,
			orphanedItemsCount: 0,
			hasMore: false,
		});
	});

	it("should signal hasMore when delete limit is reached", async () => {
		const cartIds = Array.from({ length: 1000 }, (_, i) => ({ id: `cart-${i}` }));
		mockPrisma.cart.findMany.mockResolvedValue(cartIds);
		mockPrisma.cart.deleteMany.mockResolvedValue({ count: 1000 });

		const result = await cleanupExpiredCarts();

		expect(result.hasMore).toBe(true);
		expect(mockLogger.warn).toHaveBeenCalledWith(
			"Delete limit reached, remaining carts will be cleaned on next run",
			expect.objectContaining({ cronJob: "cleanup-carts" }),
		);
	});

	it("should log cleanup progress", async () => {
		mockPrisma.$executeRaw.mockResolvedValue(2);

		await cleanupExpiredCarts();

		expect(mockLogger.info).toHaveBeenCalledWith(
			"Starting expired carts cleanup",
			expect.objectContaining({ cronJob: "cleanup-carts" }),
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			"Cleanup completed",
			expect.objectContaining({ cronJob: "cleanup-carts" }),
		);
	});

	it("should propagate errors from prisma operations", async () => {
		mockPrisma.cart.findMany.mockRejectedValue(new Error("DB connection lost"));

		await expect(cleanupExpiredCarts()).rejects.toThrow("DB connection lost");
	});
});
