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
	cacheProductDetailById,
	getProductInvalidationTags,
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
// cacheProductDetailById
// ============================================================================

/**
 * `cacheProductVariants` et `cacheVariantDetail` étaient testés ici. Ils ont été SUPPRIMÉS
 * (audit cache catalogue 2026-07-31) : aucun appelant en production, alors que les
 * tags qu'ils posaient étaient invalidés par une dizaine de mutateurs. Ces deux
 * `describe` verrouillaient donc la forme de tags que personne ne posait — le même
 * mode d'échec que les `toHaveLength` de `getStockInvalidationTags` plus bas.
 */
describe("cacheProductDetailById", () => {
	it("pose DETAIL_BY_ID + LIST sous le profil catalog", () => {
		cacheProductDetailById("prod-123");

		expect(mockCacheLife).toHaveBeenCalledWith("catalog");
		expect(mockCacheTag).toHaveBeenCalledWith("product-id-prod-123", "products-list");
	});

	// Contre-épreuve du bug corrigé : `get-product-for-duplication.ts` appelait
	// `cacheProductDetail(\`product-id-${id}\`)`, qui produisait un tag à DOUBLE
	// préfixe (`product-product-id-…`) qu'aucun mutateur n'émettait.
	it("n'émet PAS le tag à double préfixe de l'ancienne implémentation", () => {
		cacheProductDetailById("prod-123");

		expect(mockCacheTag).not.toHaveBeenCalledWith("product-product-id-prod-123", expect.anything());
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
		expect(tags).toContain("related-products-public");
		expect(tags).toContain("related-products-contextual-bague-or");
		expect(tags).toContain("admin-stock-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toContain("sitemap-images");
		// Le `hasProducts` d'un type de bijou se calcule sur les produits PUBLIC : sans ce
		// tag, publier le premier bijou d'un type ne le faisait pas apparaître au mega-menu.
		expect(tags).toContain("product-types-list");
		// Les bento collections (/collections + mega-menu) montrent des images de
		// PRODUITS lues sous `collections-list` : changer l'image d'un bijou doit les
		// rafraîchir (remplace l'ex-tag `navbar-menu`, déposé avec le scope cache
		// agrégé de `getNavbarMenuData` — CACHE-DEGRADED-VALUE-001).
		expect(tags).toContain("collections-list");
		// `fetchVariantDetailById` embarque product.name/status/_count.variants sous `variants-list`.
		expect(tags).toContain("variants-list");
		// 12 depuis le retrait de `recent-products-list` avec la feature « produits
		// récemment vus » (2026-08-06).
		expect(tags).toHaveLength(11);
	});

	it("includes VARIANTS + COLLECTIONS + DETAIL_BY_ID tags when productId is provided", () => {
		const tags = getProductInvalidationTags("bague-or", "prod-abc");

		expect(tags).toContain("product-prod-abc-variants");
		expect(tags).toContain("product-prod-abc-collections");
		// Lecture de duplication : elle se cachait sous un tag fabriqué à la main
		// (`product-product-id-…`) qu'aucun mutateur n'émettait.
		expect(tags).toContain("product-id-prod-abc");
		expect(tags).toHaveLength(14);
	});

	// Cascade couleurs/matériaux : le KPI « produits distincts » des listes couleurs
	// et matériaux ne bougeait que sur mutation VARIANT, jamais sur suppression,
	// duplication ou changement de statut du PRODUIT.
	it("cascade les compteurs couleurs/matériaux quand ils sont fournis", () => {
		const tags = getProductInvalidationTags("bague-or", "prod-abc", {
			affectedColorIds: ["col-1", "col-2"],
			affectedMaterialIds: ["mat-1"],
		});

		expect(tags).toContain("color-col-1-product-count");
		expect(tags).toContain("color-col-2-product-count");
		expect(tags).toContain("material-mat-1-product-count");
	});

	it("n'ajoute aucun tag couleur/matériau sans options", () => {
		const tags = getProductInvalidationTags("bague-or", "prod-abc");

		expect(tags.filter((t) => t.endsWith("-product-count"))).toHaveLength(0);
	});

	// L'assertion de longueur ci-dessus est le garde-fou : sans elle, un tag ajouté par
	// mégarde (ou un doublon) passerait inaperçu. On vérifie donc aussi l'unicité —
	// `updateTag` sur un doublon est inoffensif mais signale une liste mal maintenue.
	it("ne contient aucun tag en double", () => {
		const tags = getProductInvalidationTags("bague-or", "prod-abc");

		expect(new Set(tags).size).toBe(tags.length);
	});

	it("does not include VARIANTS or COLLECTIONS tags when productId is undefined", () => {
		const tags = getProductInvalidationTags("bague-or", undefined);

		const variantsTags = tags.filter((t) => t.endsWith("-variants"));
		const collectionsTags = tags.filter((t) => t.endsWith("-collections"));
		expect(variantsTags).toHaveLength(0);
		expect(collectionsTags).toHaveLength(0);
	});

	it("uses slug in DETAIL and RELATED_CONTEXTUAL tags", () => {
		const tags = getProductInvalidationTags("collier-perle");

		expect(tags).toContain("product-collier-perle");
		expect(tags).toContain("related-products-contextual-collier-perle");
	});
});
