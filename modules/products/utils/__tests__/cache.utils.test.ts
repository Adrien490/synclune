import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

const mockCacheLife = vi.fn();
const mockCacheTag = vi.fn();

vi.mock("next/cache", () => ({
	cacheLife: (...args: unknown[]) => mockCacheLife(...args),
	cacheTag: (...args: unknown[]) => mockCacheTag(...args),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
	cacheProducts,
	cacheProductDetail,
	cacheProductSkus,
	cacheSkuDetail,
	getProductInvalidationTags,
	getInventoryInvalidationTags,
	getSkuStockInvalidationTags,
} from "../cache.utils";

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// cacheProducts
// ============================================================================

describe("cacheProducts", () => {
	it("sets products cache life and LIST tag", () => {
		cacheProducts();

		expect(mockCacheLife).toHaveBeenCalledWith("catalog");
		expect(mockCacheTag).toHaveBeenCalledWith("products-list");
	});
});

// ============================================================================
// cacheProductDetail
// ============================================================================

describe("cacheProductDetail", () => {
	it("sets productDetail cache life and DETAIL + LIST tags", () => {
		cacheProductDetail("bague-or");

		expect(mockCacheLife).toHaveBeenCalledWith("catalog");
		expect(mockCacheTag).toHaveBeenCalledWith("product-bague-or", "products-list");
	});

	it("uses the slug in the DETAIL tag", () => {
		cacheProductDetail("collier-argent");

		expect(mockCacheTag).toHaveBeenCalledWith("product-collier-argent", "products-list");
	});
});

// ============================================================================
// cacheProductSkus
// ============================================================================

describe("cacheProductSkus", () => {
	it("sets productDetail cache life and SKUS + SKUS_LIST tags", () => {
		cacheProductSkus("prod-123");

		expect(mockCacheLife).toHaveBeenCalledWith("catalog");
		expect(mockCacheTag).toHaveBeenCalledWith("product-prod-123-skus", "skus-list");
	});
});

// ============================================================================
// cacheSkuDetail
// ============================================================================

describe("cacheSkuDetail", () => {
	it("sets productDetail cache life and SKU_DETAIL + SKUS_LIST tags", () => {
		cacheSkuDetail("SKU-001");

		expect(mockCacheLife).toHaveBeenCalledWith("catalog");
		expect(mockCacheTag).toHaveBeenCalledWith("sku-SKU-001", "skus-list");
	});
});

// ============================================================================
// getProductInvalidationTags
// ============================================================================

describe("getProductInvalidationTags", () => {
	it("returns base tags without productId", () => {
		const tags = getProductInvalidationTags("bague-or");

		expect(tags).toContain("products-list");
		expect(tags).toContain("product-bague-or");
		expect(tags).toContain("max-product-price");
		expect(tags).toContain("product-counts");
		expect(tags).toContain("related-products-public");
		expect(tags).toContain("related-products-contextual-bague-or");
		expect(tags).toContain("admin-inventory-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toContain("sitemap-images");
		// `get-recent-products.ts` PROMETTAIT cette invalidation en JSDoc alors qu'aucune
		// mutation produit ne bustait le tag (seul le cron RGPD le faisait) :
		// un produit archivé restait dans « Vus récemment » jusqu'à expiration du profil.
		expect(tags).toContain("recent-products-list");
		// Le `hasProducts` d'un type de bijou se calcule sur les produits PUBLIC : sans ce
		// tag, publier le premier bijou d'un type ne le faisait pas apparaître au mega-menu.
		expect(tags).toContain("product-types-list");
		expect(tags).toHaveLength(11);
	});

	it("includes SKUS + COLLECTIONS tags when productId is provided", () => {
		const tags = getProductInvalidationTags("bague-or", "prod-abc");

		expect(tags).toContain("product-prod-abc-skus");
		expect(tags).toContain("product-prod-abc-collections");
		expect(tags).toHaveLength(13);
	});

	// L'assertion de longueur ci-dessus est le garde-fou : sans elle, un tag ajouté par
	// mégarde (ou un doublon) passerait inaperçu. On vérifie donc aussi l'unicité —
	// `updateTag` sur un doublon est inoffensif mais signale une liste mal maintenue.
	it("ne contient aucun tag en double", () => {
		const tags = getProductInvalidationTags("bague-or", "prod-abc");

		expect(new Set(tags).size).toBe(tags.length);
	});

	it("does not include SKUS or COLLECTIONS tags when productId is undefined", () => {
		const tags = getProductInvalidationTags("bague-or", undefined);

		const skusTags = tags.filter((t) => t.endsWith("-skus"));
		const collectionsTags = tags.filter((t) => t.endsWith("-collections"));
		expect(skusTags).toHaveLength(0);
		expect(collectionsTags).toHaveLength(0);
	});

	it("uses slug in DETAIL and RELATED_CONTEXTUAL tags", () => {
		const tags = getProductInvalidationTags("collier-perle");

		expect(tags).toContain("product-collier-perle");
		expect(tags).toContain("related-products-contextual-collier-perle");
	});
});

// ============================================================================
// getInventoryInvalidationTags
// ============================================================================

describe("getInventoryInvalidationTags", () => {
	it("returns base inventory tags without skuIds", () => {
		const tags = getInventoryInvalidationTags("bague-or", "prod-123");

		expect(tags).toContain("product-bague-or");
		expect(tags).toContain("product-prod-123-skus");
		expect(tags).toContain("admin-inventory-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toHaveLength(4);
	});

	it("includes SKU_STOCK tag for each skuId provided", () => {
		const tags = getInventoryInvalidationTags("bague-or", "prod-123", ["sku-1", "sku-2"]);

		expect(tags).toContain("sku-stock-sku-1");
		expect(tags).toContain("sku-stock-sku-2");
		expect(tags).toHaveLength(6);
	});

	it("handles empty skuIds array gracefully", () => {
		const tags = getInventoryInvalidationTags("bague-or", "prod-123", []);

		expect(tags).toHaveLength(4);
	});

	it("handles a single skuId", () => {
		const tags = getInventoryInvalidationTags("bague-or", "prod-123", ["sku-only"]);

		expect(tags).toContain("sku-stock-sku-only");
		expect(tags).toHaveLength(5);
	});
});

// ============================================================================
// getSkuStockInvalidationTags
// ============================================================================

describe("getSkuStockInvalidationTags", () => {
	it("returns a single SKU_STOCK tag", () => {
		const tags = getSkuStockInvalidationTags("sku-abc");

		expect(tags).toEqual(["sku-stock-sku-abc"]);
	});

	it("uses the skuId in the tag", () => {
		const tags = getSkuStockInvalidationTags("sku-xyz-999");

		expect(tags[0]).toBe("sku-stock-sku-xyz-999");
	});
});
