import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockLogger, mockSentryCapture, mockSentryWithScope } = vi.hoisted(() => ({
	mockPrisma: {
		wishlist: {
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
	mockSentryCapture: vi.fn(),
	mockSentryWithScope: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: mockSentryCapture,
	withScope: mockSentryWithScope,
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
	startSpan: vi.fn(async (_opts: unknown, cb: () => unknown) => cb()),
}));

import { cleanupInactiveWishlists } from "../cleanup-wishlists.service";

// 30 j (cookie wishlist_session glissant) + 7 j de grâce
const RETENTION_MS = (30 + 7) * 24 * 60 * 60 * 1000;

interface FakeSentryScope {
	setTag: ReturnType<typeof vi.fn>;
	setLevel: ReturnType<typeof vi.fn>;
	setFingerprint: ReturnType<typeof vi.fn>;
	setContext: ReturnType<typeof vi.fn>;
}

function createSentryScope(): FakeSentryScope {
	return {
		setTag: vi.fn(),
		setLevel: vi.fn(),
		setFingerprint: vi.fn(),
		setContext: vi.fn(),
	};
}

describe("cleanupInactiveWishlists", () => {
	let lastScope: FakeSentryScope;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-01T10:00:00Z"));

		mockPrisma.wishlist.findMany.mockResolvedValue([
			{ id: "wishlist-1" },
			{ id: "wishlist-2" },
			{ id: "wishlist-3" },
		]);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 3 });
		mockPrisma.$executeRaw.mockResolvedValue(0);
		mockSentryWithScope.mockImplementation((cb: (s: FakeSentryScope) => void) => {
			lastScope = createSentryScope();
			cb(lastScope);
		});
	});

	it("should hard-delete guest wishlists inactive past retention (updatedAt < now - 37j, userId null)", async () => {
		await cleanupInactiveWishlists();

		const expectedCutoff = new Date(new Date("2026-08-01T10:00:00Z").getTime() - RETENTION_MS);
		expect(mockPrisma.wishlist.findMany).toHaveBeenCalledWith({
			where: {
				userId: null,
				updatedAt: { lt: expectedCutoff },
			},
			select: { id: true },
			take: 1000,
		});
	});

	it("should preserve user wishlists (userId not null)", async () => {
		await cleanupInactiveWishlists();

		const whereClause = mockPrisma.wishlist.findMany.mock.calls[0]![0].where;
		expect(whereClause.userId).toBeNull();
	});

	it("should clean orphaned WishlistItems via raw SQL safety net", async () => {
		mockPrisma.$executeRaw.mockResolvedValue(5);

		await cleanupInactiveWishlists();

		expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
		const sqlQuery = mockPrisma.$executeRaw.mock.calls[0]![0];
		expect(sqlQuery.join("")).toContain('DELETE FROM "WishlistItem"');
		expect(sqlQuery.join("")).toContain("NOT EXISTS");
		expect(sqlQuery.join("")).toContain('SELECT 1 FROM "Wishlist"');
	});

	it("should return correct counts for deleted wishlists and orphaned items", async () => {
		const wishlistIds = Array.from({ length: 7 }, (_, i) => ({ id: `wishlist-${i}` }));
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 7 });
		mockPrisma.$executeRaw.mockResolvedValue(BigInt(12));

		const result = await cleanupInactiveWishlists();

		expect(result).toMatchObject({
			deletedCount: 7,
			orphanedItemsCount: 12,
			hasMore: false,
		});
		expect(typeof result.orphanedItemsCount).toBe("number");
	});

	it("should handle zero inactive wishlists", async () => {
		mockPrisma.wishlist.findMany.mockResolvedValue([]);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 0 });

		const result = await cleanupInactiveWishlists();

		expect(result).toMatchObject({
			deletedCount: 0,
			orphanedItemsCount: 0,
			hasMore: false,
		});
	});

	it("should signal hasMore when delete limit is reached", async () => {
		const wishlistIds = Array.from({ length: 1000 }, (_, i) => ({ id: `wishlist-${i}` }));
		mockPrisma.wishlist.findMany.mockResolvedValue(wishlistIds);
		mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 1000 });

		const result = await cleanupInactiveWishlists();

		expect(result.hasMore).toBe(true);
		expect(mockLogger.warn).toHaveBeenCalledWith(
			"Delete limit reached, remaining wishlists will be cleaned on next run",
			expect.objectContaining({ cronJob: "cleanup-wishlists" }),
		);
	});

	it("should log cleanup progress", async () => {
		mockPrisma.$executeRaw.mockResolvedValue(2);

		await cleanupInactiveWishlists();

		expect(mockLogger.info).toHaveBeenCalledWith(
			"Starting inactive wishlists cleanup",
			expect.objectContaining({ cronJob: "cleanup-wishlists" }),
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			"Cleanup completed",
			expect.objectContaining({ cronJob: "cleanup-wishlists" }),
		);
	});

	it("increments errored instead of throwing on prisma error", async () => {
		mockPrisma.wishlist.findMany.mockRejectedValue(new Error("DB connection lost"));
		mockPrisma.$executeRaw.mockResolvedValue(0);

		const result = await cleanupInactiveWishlists();

		expect(result.errored).toBeGreaterThanOrEqual(1);
		expect(result.deletedCount).toBe(0);
	});

	it("captures wishlist-deletion errors to Sentry with step fingerprint (no rethrow)", async () => {
		const dbError = new Error("DB connection lost");
		mockPrisma.wishlist.findMany.mockRejectedValue(dbError);
		mockPrisma.$executeRaw.mockResolvedValue(0);

		const result = await cleanupInactiveWishlists();

		expect(result.errored).toBeGreaterThanOrEqual(1);
		expect(mockSentryWithScope).toHaveBeenCalled();
		expect(mockSentryCapture).toHaveBeenCalledWith(dbError);
		expect(lastScope.setTag).toHaveBeenCalledWith("cronJob", "cleanup-wishlists");
		expect(lastScope.setTag).toHaveBeenCalledWith("step", "wishlist-deletion");
		expect(lastScope.setFingerprint).toHaveBeenCalledWith([
			"cron",
			"cleanup-wishlists",
			"wishlist-deletion",
		]);
	});

	it("orphan-items errors captured separately and counted (no rethrow)", async () => {
		const orphanError = new Error("Raw SQL timeout");
		mockPrisma.$executeRaw.mockRejectedValue(orphanError);

		const result = await cleanupInactiveWishlists();

		expect(result.errored).toBeGreaterThanOrEqual(1);
		expect(mockSentryCapture).toHaveBeenCalledWith(orphanError);
		expect(lastScope.setTag).toHaveBeenCalledWith("step", "orphan-items");
		expect(lastScope.setFingerprint).toHaveBeenCalledWith([
			"cron",
			"cleanup-wishlists",
			"orphan-items",
		]);
	});
});
