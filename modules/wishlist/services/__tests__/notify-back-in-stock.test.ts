import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockSendBackInStockEmail } = vi.hoisted(() => ({
	mockPrisma: {
		wishlistItem: { findMany: vi.fn(), update: vi.fn() },
	},
	mockSendBackInStockEmail: vi.fn(),
}));

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
		mockPrisma.wishlistItem.update.mockResolvedValue({});
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

	it("marks item as notified after successful email", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem()]);

		await notifyBackInStock("prod-1");

		expect(mockPrisma.wishlistItem.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "wi-1" },
				data: { backInStockNotifiedAt: expect.any(Date) },
			}),
		);
	});

	it("skips marking when email send fails", async () => {
		mockPrisma.wishlistItem.findMany.mockResolvedValue([makeWishlistItem()]);
		mockSendBackInStockEmail.mockResolvedValue({ success: false });

		await notifyBackInStock("prod-1");

		expect(mockPrisma.wishlistItem.update).not.toHaveBeenCalled();
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

	it("continues processing remaining items when one email fails", async () => {
		const items = [
			makeWishlistItem({ id: "wi-1" }),
			makeWishlistItem({
				id: "wi-2",
				wishlist: { user: { email: "other@example.com", name: "Sophie" } },
			}),
		];
		mockPrisma.wishlistItem.findMany.mockResolvedValue(items);
		mockSendBackInStockEmail
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValueOnce({ success: true });

		await notifyBackInStock("prod-1");

		expect(mockSendBackInStockEmail).toHaveBeenCalledTimes(2);
		// Only second item should be marked as notified
		expect(mockPrisma.wishlistItem.update).toHaveBeenCalledTimes(1);
		expect(mockPrisma.wishlistItem.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "wi-2" } }),
		);
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
