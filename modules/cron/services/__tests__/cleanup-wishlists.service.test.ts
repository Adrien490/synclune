import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		wishlist: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		$executeRaw: vi.fn(),
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { cleanupExpiredWishlists } from "../cleanup-wishlists.service";

describe("cleanupExpiredWishlists", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-16T10:00:00Z"));
		// Suppress console.log for cleaner test output
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});

		// Default: findMany returns some wishlist IDs
		mockPrisma.wishlist.findMany.mockResolvedValue([
			{ id: "wishlist-1" },
			{ id: "wishlist-2" },
			{ id: "wishlist-3" },
		]);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 3 });
		mockPrisma.$executeRaw.mockResolvedValue(0);
	});

	it("should delete expired guest wishlists (expiresAt < now, userId null)", async () => {
		const wishlistIds = [
			{ id: "wishlist-a" },
			{ id: "wishlist-b" },
			{ id: "wishlist-c" },
			{ id: "wishlist-d" },
			{ id: "wishlist-e" },
		];
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 5 });

		await cleanupExpiredWishlists();

		expect(mockPrisma.wishlist.findMany).toHaveBeenCalledWith({
			where: {
				expiresAt: { lt: new Date("2026-02-16T10:00:00Z") },
				userId: null,
			},
			select: { id: true },
			take: 1000,
		});

		expect(mockPrisma.wishlist.deleteMany).toHaveBeenCalledWith({
			where: {
				id: {
					in: [
						"wishlist-a",
						"wishlist-b",
						"wishlist-c",
						"wishlist-d",
						"wishlist-e",
					],
				},
			},
		});
	});

	it("should clean orphaned wishlist items via raw SQL", async () => {
		mockPrisma.$executeRaw.mockResolvedValue(2);

		await cleanupExpiredWishlists();

		expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
		// Check that the SQL query uses the expected pattern
		const sqlQuery = mockPrisma.$executeRaw.mock.calls[0][0];
		expect(sqlQuery.join("")).toContain('DELETE FROM "WishlistItem"');
		expect(sqlQuery.join("")).toContain("NOT EXISTS");
		expect(sqlQuery.join("")).toContain('SELECT 1 FROM "Wishlist"');
		expect(sqlQuery.join("")).toContain("LIMIT");
	});

	it("should return correct counts for deleted wishlists and orphaned items", async () => {
		const wishlistIds = Array.from({ length: 7 }, (_, i) => ({
			id: `wishlist-${i}`,
		}));
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 7 });
		mockPrisma.$executeRaw.mockResolvedValue(12);

		const result = await cleanupExpiredWishlists();

		expect(result).toEqual({
			deletedCount: 7,
			orphanedItemsCount: 12,
			hasMore: false,
		});
	});

	it("should handle zero expired wishlists", async () => {
		mockPrisma.wishlist.findMany.mockResolvedValue([]);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.$executeRaw.mockResolvedValue(0);

		const result = await cleanupExpiredWishlists();

		expect(result).toEqual({
			deletedCount: 0,
			orphanedItemsCount: 0,
			hasMore: false,
		});
		expect(mockPrisma.wishlist.findMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.wishlist.deleteMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
	});

	it("should handle zero orphaned items", async () => {
		const wishlistIds = Array.from({ length: 4 }, (_, i) => ({
			id: `wishlist-${i}`,
		}));
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 4 });
		mockPrisma.$executeRaw.mockResolvedValue(0);

		const result = await cleanupExpiredWishlists();

		expect(result).toEqual({
			deletedCount: 4,
			orphanedItemsCount: 0,
			hasMore: false,
		});
	});

	it("should convert orphanedItemsCount from BigInt to Number", async () => {
		mockPrisma.wishlist.findMany.mockResolvedValue([
			{ id: "wishlist-1" },
			{ id: "wishlist-2" },
		]);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 2 });
		// $executeRaw can return a BigInt in real scenarios
		mockPrisma.$executeRaw.mockResolvedValue(BigInt(15));

		const result = await cleanupExpiredWishlists();

		expect(result.orphanedItemsCount).toBe(15);
		expect(typeof result.orphanedItemsCount).toBe("number");
	});

	it("should only target guest wishlists (userId: null)", async () => {
		await cleanupExpiredWishlists();

		const whereClause = mockPrisma.wishlist.findMany.mock.calls[0][0].where;
		expect(whereClause.userId).toBeNull();
	});

	it("should use current timestamp for expiresAt comparison", async () => {
		const mockDate = new Date("2026-06-15T12:30:00Z");
		vi.setSystemTime(mockDate);

		await cleanupExpiredWishlists();

		const whereClause = mockPrisma.wishlist.findMany.mock.calls[0][0].where;
		expect(whereClause.expiresAt.lt).toEqual(mockDate);
	});

	it("should log cleanup progress to console", async () => {
		const consoleLogSpy = vi.spyOn(console, "log");
		const wishlistIds = Array.from({ length: 8 }, (_, i) => ({
			id: `wishlist-${i}`,
		}));
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 8 });
		mockPrisma.$executeRaw.mockResolvedValue(4);

		await cleanupExpiredWishlists();

		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-wishlists] Starting expired wishlists cleanup..."
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-wishlists] Deleted 8 expired wishlists"
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-wishlists] Cleaned up 4 orphaned wishlist items"
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-wishlists] Cleanup completed"
		);
	});

	it("should not log orphaned items message when count is zero", async () => {
		const consoleLogSpy = vi.spyOn(console, "log");
		mockPrisma.$executeRaw.mockResolvedValue(0);

		await cleanupExpiredWishlists();

		const logCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
		expect(logCalls).not.toContain(
			expect.stringContaining("Cleaned up 0 orphaned wishlist items")
		);
	});

	it("should log warning when delete limit is reached", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		// Return exactly CLEANUP_DELETE_LIMIT (1000) items to trigger the warning
		const wishlistIds = Array.from({ length: 1000 }, (_, i) => ({
			id: `wishlist-${i}`,
		}));
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 1000 });

		await cleanupExpiredWishlists();

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"[CRON:cleanup-wishlists] Delete limit reached, remaining wishlists will be cleaned on next run"
		);
	});

	it("should not log warning when under delete limit", async () => {
		const consoleWarnSpy = vi.spyOn(console, "warn");
		const wishlistIds = Array.from({ length: 999 }, (_, i) => ({
			id: `wishlist-${i}`,
		}));
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 999 });

		await cleanupExpiredWishlists();

		expect(consoleWarnSpy).not.toHaveBeenCalled();
	});

	it("should pass found IDs to deleteMany", async () => {
		const wishlistIds = [{ id: "abc-123" }, { id: "def-456" }];
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 2 });

		await cleanupExpiredWishlists();

		expect(mockPrisma.wishlist.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["abc-123", "def-456"] } },
		});
	});
});
