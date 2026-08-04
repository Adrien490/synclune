import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockReadWishlistCookie,
	mockLoggerError,
	mockCacheLife,
	mockCacheTag,
	mockIsPrerenderInterrupt,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findMany: vi.fn() },
	},
	mockReadWishlistCookie: vi.fn(),
	mockLoggerError: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockIsPrerenderInterrupt: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/wishlist/lib/wishlist-cookie", () => ({
	readWishlistCookie: mockReadWishlistCookie,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: mockLoggerError, warn: vi.fn(), info: vi.fn() },
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
	revalidateTag: vi.fn(),
}));

vi.mock("@/shared/lib/prerender-interrupt", () => ({
	isPrerenderInterrupt: mockIsPrerenderInterrupt,
}));

import { getWishlist } from "../get-wishlist";

const ID_A = "cm1234567890abcdefghijk12";
const ID_B = "cm1234567890abcdefghijk34";
const ID_C = "cm1234567890abcdefghijk56";

function mockProduct(id: string) {
	return { id, title: `Produit ${id}` };
}

beforeEach(() => {
	vi.clearAllMocks();
	mockIsPrerenderInterrupt.mockReturnValue(false);
});

describe("getWishlist", () => {
	it("retourne vide sans cookie, SANS toucher la DB", async () => {
		mockReadWishlistCookie.mockResolvedValue([]);

		const result = await getWishlist();

		expect(result).toEqual({ items: [], totalCount: 0 });
		expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
	});

	it("matérialise les ids en produits PUBLIC non supprimés", async () => {
		mockReadWishlistCookie.mockResolvedValue([ID_A]);
		mockPrisma.product.findMany.mockResolvedValue([mockProduct(ID_A)]);

		await getWishlist();

		expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: [ID_A] },
					status: "PUBLIC",
					deletedAt: null,
				}),
			}),
		);
	});

	it("préserve l'ordre du cookie (plus récent en premier) malgré l'ordre DB", async () => {
		mockReadWishlistCookie.mockResolvedValue([ID_B, ID_A]);
		// findMany retourne dans un ordre arbitraire
		mockPrisma.product.findMany.mockResolvedValue([mockProduct(ID_A), mockProduct(ID_B)]);

		const result = await getWishlist();

		expect(result.items.map((p) => p.id)).toEqual([ID_B, ID_A]);
	});

	it("écarte silencieusement les ids sans produit PUBLIC correspondant", async () => {
		mockReadWishlistCookie.mockResolvedValue([ID_A, ID_C, ID_B]);
		// ID_C archivé/supprimé : absent du résultat DB
		mockPrisma.product.findMany.mockResolvedValue([mockProduct(ID_A), mockProduct(ID_B)]);

		const result = await getWishlist();

		expect(result.items.map((p) => p.id)).toEqual([ID_A, ID_B]);
		expect(result.totalCount).toBe(2);
	});

	it("retourne vide ET logge sur une panne DB (repli hors du scope cache)", async () => {
		mockReadWishlistCookie.mockResolvedValue([ID_A]);
		mockPrisma.product.findMany.mockRejectedValue(new Error("db down"));

		const result = await getWishlist();

		expect(result).toEqual({ items: [], totalCount: 0 });
		expect(mockLoggerError).toHaveBeenCalled();
	});

	it("retourne vide SANS logger quand cookies() rejette pendant le prerender (PPR)", async () => {
		mockReadWishlistCookie.mockRejectedValue(new Error("prerender interrupted"));
		mockIsPrerenderInterrupt.mockReturnValue(true);

		const result = await getWishlist();

		expect(result).toEqual({ items: [], totalCount: 0 });
		expect(mockLoggerError).not.toHaveBeenCalled();
	});

	it("retourne vide SANS logger quand la lecture `use cache` est coupée à la clôture", async () => {
		mockReadWishlistCookie.mockResolvedValue([ID_A]);
		mockPrisma.product.findMany.mockRejectedValue(new Error("Connection closed."));
		mockIsPrerenderInterrupt.mockReturnValue(true);

		const result = await getWishlist();

		expect(result).toEqual({ items: [], totalCount: 0 });
		expect(mockLoggerError).not.toHaveBeenCalled();
	});
});
