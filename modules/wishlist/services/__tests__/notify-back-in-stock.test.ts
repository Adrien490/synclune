import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockSendBackInStockEmail, mockLogger, mockCaptureWishlistError } = vi.hoisted(
	() => ({
		mockPrisma: {
			wishlistItem: { findMany: vi.fn(), updateMany: vi.fn() },
		},
		mockSendBackInStockEmail: vi.fn(),
		mockLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
		mockCaptureWishlistError: vi.fn(),
	}),
);

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));
vi.mock("@/modules/emails/services/wishlist-emails", () => ({
	sendBackInStockEmail: mockSendBackInStockEmail,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((path: string) => `https://synclune.fr${path}`),
	ROUTES: {
		SHOP: { PRODUCTS: "/produits" },
		NOTIFICATIONS: { UNSUBSCRIBE: "/notifications/desinscription" },
	},
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));
vi.mock("@/modules/wishlist/utils/capture-wishlist-error", () => ({
	captureWishlistError: mockCaptureWishlistError,
}));
vi.mock("@sentry/nextjs", () => ({
	// startSpan executes the callback with a no-op span so attributes are recorded harmlessly
	startSpan: vi.fn(
		async (
			_options: { name: string; attributes?: Record<string, unknown> },
			cb: (span: { setAttribute: (k: string, v: unknown) => void }) => Promise<void> | void,
		) => cb({ setAttribute: () => {} }),
	),
}));

import { notifyBackInStock } from "../notify-back-in-stock";

// ============================================================================
// HELPERS
// ============================================================================

function makeWishlistItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "wi-1",
		wishlist: {
			user: { email: "client@example.com", name: "Marie" },
		},
		product: {
			title: "Bracelet Lune",
			slug: "bracelet-lune",
			skus: [{ images: [{ url: "https://utfs.io/f/bracelet-lune.jpg" }] }],
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("notifyBackInStock", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.wishlistItem.findMany.mockResolvedValue([]);
		mockPrisma.wishlistItem.updateMany.mockResolvedValue({ count: 0 });
		mockSendBackInStockEmail.mockResolvedValue({ success: true });
	});

	it("returns early when no wishlist items found", async () => {
		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).not.toHaveBeenCalled();
	});

	it("queries wishlist items for correct product with correct filters", async () => {
		await notifyBackInStock("prod-1");

		const call = mockPrisma.wishlistItem.findMany.mock.calls[0]![0];
		expect(call.where.productId).toBe("prod-1");
		expect(call.where.backInStockNotifiedAt).toBeNull();
		expect(call.where.wishlist.userId).toEqual({ not: null });
		expect(call.where.wishlist.user.deletedAt).toBeNull();
		expect(call.take).toBe(50);
		expect(call.orderBy).toEqual({ id: "asc" });
	});

	it("sends email to all eligible wishlist users", async () => {
		const items = [
			makeWishlistItem({ id: "wi-1" }),
			makeWishlistItem({
				id: "wi-2",
				wishlist: { user: { email: "other@example.com", name: "Sophie" } },
			}),
		];
		mockPrisma.wishlistItem.findMany.mockResolvedValue(items);

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(2);
		expect(mockSendBackInStockEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				productTitle: "Bracelet Lune",
			}),
		);
		expect(mockSendBackInStockEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "other@example.com",
			}),
		);
	});

	it("batch-marks items as notified after successful emails", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem()]);

		await notifyBackInStock("prod-1");

		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["wi-1"] } },
				data: { backInStockNotifiedAt: expect.any(Date) },
			}),
		);
	});

	it("skips marking when email send fails", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem()]);
		mockSendBackInStockEmail.mockResolvedValue({ success: false });

		await notifyBackInStock("prod-1");

		expect(mockPrisma.wishlistItem.updateMany).not.toHaveBeenCalled();
	});

	it("skips items with no user", async () => {
		const itemNoUser = makeWishlistItem({ wishlist: { user: null } });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([itemNoUser]);

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).not.toHaveBeenCalled();
	});

	it("skips items with no product", async () => {
		const itemNoProduct = makeWishlistItem({ product: null });
		mockPrisma.wishlistItem.findMany.mockResolvedValue([itemNoProduct]);

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).not.toHaveBeenCalled();
	});

	it("does not throw when outer DB query fails (non-blocking)", async () => {
		mockPrisma.wishlistItem.findMany.mockRejectedValue(new Error("DB connection lost"));

		// Should not throw
		await expect(notifyBackInStock("prod-1")).resolves.toBeUndefined();
	});

	it("does not throw when individual email send throws", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem()]);
		mockSendBackInStockEmail.mockRejectedValue(new Error("SMTP down"));

		// Should not throw
		await expect(notifyBackInStock("prod-1")).resolves.toBeUndefined();
	});

	it("continues processing remaining items when one email fails (no retry recovery)", async () => {
		const items = [
			makeWishlistItem({ id: "wi-1" }),
			makeWishlistItem({
				id: "wi-2",
				wishlist: { user: { email: "other@example.com", name: "Sophie" } },
			}),
		];
		mockPrisma.wishlistItem.findMany.mockResolvedValue(items);
		// wi-1: rejected on first try AND on retry (permanent failure)
		// wi-2: success on first try
		mockSendBackInStockEmail
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValueOnce({ success: true })
			.mockRejectedValueOnce(new Error("fail again"));

		await notifyBackInStock("prod-1");

		// 2 initial calls + 1 retry for wi-1
		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(3);
		// Only wi-2 should be batch-marked as notified (wi-1 permanently failed)
		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["wi-2"] } },
			}),
		);
		// Sentry captured for the send-email throw AND the retry-exhausted
		expect(mockCaptureWishlistError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ stage: "send-email", wishlistItemId: "wi-1" }),
		);
		expect(mockCaptureWishlistError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ stage: "retry-exhausted", wishlistItemId: "wi-1" }),
		);
	});

	it("retries failed-email items once after main loop and marks them notified on success", async () => {
		const items = [
			makeWishlistItem({ id: "wi-1" }),
			makeWishlistItem({
				id: "wi-2",
				wishlist: { user: { email: "other@example.com", name: "Sophie" } },
			}),
		];
		mockPrisma.wishlistItem.findMany.mockResolvedValue(items);
		// wi-1: fails first, succeeds on retry
		// wi-2: succeeds first try
		mockSendBackInStockEmail
			.mockResolvedValueOnce({ success: false }) // wi-1 first call
			.mockResolvedValueOnce({ success: true }) // wi-2 first call
			.mockResolvedValueOnce({ success: true }); // wi-1 retry

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(3);
		// Initial pass marks wi-2
		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ where: { id: { in: ["wi-2"] } } }),
		);
		// Retry pass marks wi-1
		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ where: { id: { in: ["wi-1"] } } }),
		);
		// No Sentry capture: retry succeeded
		expect(mockCaptureWishlistError).not.toHaveBeenCalled();
	});

	it("captures Sentry error with stage send-email when send throws", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem({ id: "wi-throw" })]);
		mockSendBackInStockEmail.mockRejectedValue(new Error("SMTP exploded"));

		await notifyBackInStock("prod-1");

		expect(mockCaptureWishlistError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "SMTP exploded" }),
			expect.objectContaining({
				service: "back-in-stock",
				stage: "send-email",
				productId: "prod-1",
				wishlistItemId: "wi-throw",
			}),
		);
	});

	it("captures Sentry error with stage outer-loop when DB query throws", async () => {
		mockPrisma.wishlistItem.findMany.mockRejectedValue(new Error("DB exploded"));

		await notifyBackInStock("prod-1");

		expect(mockCaptureWishlistError).toHaveBeenCalledWith(
			expect.objectContaining({ message: "DB exploded" }),
			expect.objectContaining({
				service: "back-in-stock",
				stage: "outer-loop",
				productId: "prod-1",
			}),
		);
	});

	it("paginates through all users in batches of 50", async () => {
		// First batch: 50 items (triggers next batch)
		const batch1 = Array.from({ length: 50 }, (_, i) =>
			makeWishlistItem({
				id: `wi-${i + 1}`,
				wishlist: { user: { email: `user${i + 1}@example.com`, name: `User ${i + 1}` } },
			}),
		);
		// Second batch: 10 items (less than 50, stops pagination)
		const batch2 = Array.from({ length: 10 }, (_, i) =>
			makeWishlistItem({
				id: `wi-${i + 51}`,
				wishlist: { user: { email: `user${i + 51}@example.com`, name: `User ${i + 51}` } },
			}),
		);

		mockPrisma.wishlistItem.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

		await notifyBackInStock("prod-1");

		// Should have made 2 findMany calls (pagination)
		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledTimes(2);

		// Second call should use cursor from last item of first batch
		const secondCall = mockPrisma.wishlistItem.findMany.mock.calls[1]![0];
		expect(secondCall.cursor).toEqual({ id: "wi-50" });
		expect(secondCall.skip).toBe(1);

		// All 60 emails should have been sent
		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(60);

		// Two updateMany calls (one per batch)
		expect(mockPrisma.wishlistItem.updateMany).toHaveBeenCalledTimes(2);
	});

	it("stops pagination when batch returns fewer than 50 items", async () => {
		const smallBatch = Array.from({ length: 3 }, (_, i) => makeWishlistItem({ id: `wi-${i + 1}` }));
		mockPrisma.wishlistItem.findMany.mockResolvedValueOnce(smallBatch);

		await notifyBackInStock("prod-1");

		// Only one findMany call (batch < 50 = no more pages)
		expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledTimes(1);
		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(3);
	});

	it("uses email as fallback when user has no name", async () => {
		const item = makeWishlistItem({
			wishlist: { user: { email: "noname@example.com", name: null } },
		});
		mockPrisma.wishlistItem.findMany.mockResolvedValue([item]);

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				customerName: "noname@example.com",
			}),
		);
	});
});
