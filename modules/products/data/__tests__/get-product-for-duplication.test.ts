import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFindFirst, mockCacheProductDetailById, mockIsAdmin } = vi.hoisted(() => ({
	mockFindFirst: vi.fn(),
	mockCacheProductDetailById: vi.fn(),
	mockIsAdmin: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { findFirst: mockFindFirst },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/products/utils/cache.utils", () => ({
	cacheProductDetailById: mockCacheProductDetailById,
}));

// La garde `isAdmin()` a été portée dans la couche `data/` (audit cache catalogue
// 2026-07-31) : la requête ne filtre pas `status`, et `requireAdmin()` chez l'unique
// appelant était la seule protection — correcte, mais rien ne l'imposait.
vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	isAdmin: mockIsAdmin,
}));

import { getProductForDuplication } from "../get-product-for-duplication";

// ============================================================================
// HELPERS
// ============================================================================

function makeProductForDuplication(overrides: Record<string, unknown> = {}) {
	return {
		id: "prod-1",
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		description: "Un beau bracelet",
		typeId: "type-1",
		collections: [
			{
				collectionId: "col-1",
				collection: { slug: "printemps" },
			},
		],
		skus: [
			{
				sku: "BL-001",
				priceInclTax: 39.9,
				compareAtPrice: null,
				inventory: 10,
				isActive: true,
				position: 0,
				// M2M depuis les migrations de mai 2026 : plus de scalaires colorId/materialId
				colors: [
					{ colorId: "color-1", position: 0 },
					{ colorId: "color-2", position: 1 },
				],
				materials: [{ materialId: "mat-1", position: 0 }],
				size: null,
				images: [
					{
						url: "https://example.com/image.jpg",
						thumbnailUrl: "https://example.com/thumb.jpg",
						altText: "Bracelet Lune",
						mediaType: "IMAGE",
						position: 0,
					},
				],
			},
		],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("getProductForDuplication", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		mockFindFirst.mockResolvedValue(makeProductForDuplication());
	});

	// La garde vit désormais dans `data/`, pas seulement chez l'appelant.
	it("retourne null et n'interroge PAS la base pour un non-admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getProductForDuplication("prod-1")).resolves.toBeNull();
		expect(mockFindFirst).not.toHaveBeenCalled();
		expect(mockCacheProductDetailById).not.toHaveBeenCalled();
	});

	// ─── Data fetching ───────────────────────────────────────────────────────

	it("returns product with all select fields", async () => {
		const product = makeProductForDuplication();
		mockFindFirst.mockResolvedValue(product);

		const result = await getProductForDuplication("prod-1");

		expect(result).toEqual(product);
	});

	it("queries by productId with notDeleted filter", async () => {
		await getProductForDuplication("prod-1");

		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "prod-1",
					deletedAt: null,
				}),
			}),
		);
	});

	it("selects collections with collectionId and collection slug", async () => {
		await getProductForDuplication("prod-1");

		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					collections: expect.objectContaining({
						select: expect.objectContaining({
							collectionId: true,
						}),
					}),
				}),
			}),
		);
	});

	it("selects skus with images", async () => {
		await getProductForDuplication("prod-1");

		expect(mockFindFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					skus: expect.objectContaining({
						select: expect.objectContaining({
							images: expect.any(Object),
						}),
					}),
				}),
			}),
		);
	});

	it("selects colors and materials via the M2M relations, with position", async () => {
		await getProductForDuplication("prod-1");

		const skusArg = mockFindFirst.mock.calls[0]?.[0]?.select?.skus;

		expect(skusArg.select.colors.select).toEqual({ colorId: true, position: true });
		expect(skusArg.select.materials.select).toEqual({ materialId: true, position: true });
		expect(skusArg.select.colors.orderBy).toEqual({ position: "asc" });
		expect(skusArg.select.materials.orderBy).toEqual({ position: "asc" });
	});

	// Le defaut historique : `colorId`/`materialId` etaient selectionnes comme des
	// scalaires de ProductSku alors que les migrations M2M de mai 2026 les avaient
	// deplaces dans les tables de jointure. Prisma levait, le catch renvoyait null, et
	// l'admin lisait « Le produit source n'existe pas » a chaque duplication. Invisible
	// a `tsc` (le GetSelect de Prisma 7 ne rejette pas ces cles ici) et invisible ici
	// meme, puisque Prisma est mocke : c'est le test d'integration qui l'attrape. Cette
	// assertion empeche seulement la reintroduction du select mort.
	it("never selects the removed colorId/materialId scalars on ProductSku", async () => {
		await getProductForDuplication("prod-1");

		const skuSelect = mockFindFirst.mock.calls[0]?.[0]?.select?.skus?.select;

		expect(skuSelect).not.toHaveProperty("colorId");
		expect(skuSelect).not.toHaveProperty("materialId");
	});

	it("excludes soft-deleted skus", async () => {
		await getProductForDuplication("prod-1");

		expect(mockFindFirst.mock.calls[0]?.[0]?.select?.skus?.where).toEqual({ deletedAt: null });
	});

	// ─── Not found ───────────────────────────────────────────────────────────

	it("returns null when product is not found", async () => {
		mockFindFirst.mockResolvedValue(null);

		const result = await getProductForDuplication("nonexistent");

		expect(result).toBeNull();
	});

	// ─── Cache ───────────────────────────────────────────────────────────────

	it("caches by product ID", async () => {
		await getProductForDuplication("prod-42");

		// `cacheProductDetailById(id)` et non `cacheProductDetail(\`product-id-${id}\`)` :
		// l'ancienne forme nourrissait un id à une fabrique de SLUG et produisait
		// `product-product-id-<cuid>`, un tag qu'aucun mutateur n'émettait.
		expect(mockCacheProductDetailById).toHaveBeenCalledWith("prod-42");
	});

	it("uses a distinct cache key per product ID", async () => {
		await getProductForDuplication("prod-1");
		await getProductForDuplication("prod-2");

		expect(mockCacheProductDetailById).toHaveBeenNthCalledWith(1, "prod-1");
		expect(mockCacheProductDetailById).toHaveBeenNthCalledWith(2, "prod-2");
	});
});
