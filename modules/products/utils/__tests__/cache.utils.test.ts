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
	getStockInvalidationTags,
	getVariantStockInvalidationTags,
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
		expect(tags).toContain("product-counts");
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
		expect(tags).toHaveLength(12);
	});

	it("includes VARIANTS + COLLECTIONS + DETAIL_BY_ID tags when productId is provided", () => {
		const tags = getProductInvalidationTags("bague-or", "prod-abc");

		expect(tags).toContain("product-prod-abc-variants");
		expect(tags).toContain("product-prod-abc-collections");
		// Lecture de duplication : elle se cachait sous un tag fabriqué à la main
		// (`product-product-id-…`) qu'aucun mutateur n'émettait.
		expect(tags).toContain("product-id-prod-abc");
		expect(tags).toHaveLength(15);
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

// ============================================================================
// getStockInvalidationTags
// ============================================================================

/**
 * ⚠️ Ces 4 tests verrouillaient la version PAUVRE du helper (audit cache
 * 2026-07-31). Il existait deux `getStockInvalidationTags` homonymes — celui
 * de `modules/variants/utils/` couvrait `LIST`, `VARIANTS_LIST` et `VARIANT_DETAIL_BY_ID`,
 * celui-ci non — et `collectStockInvalidationTags` déléguait au second. Les
 * `toHaveLength(4/5/6)` ci-dessous gelaient donc l'absence des tags manquants :
 * ajouter la couverture correcte faisait rougir le test censé la protéger.
 *
 * Les deux implémentations sont désormais fusionnées (SSOT ici, ré-export côté
 * variants) et les comptes reflètent la couverture complète — celle qu'exige
 * STOCK-STALE-BASELINE-001.
 */
describe("getStockInvalidationTags", () => {
	const BASE_TAGS = [
		"product-bague-or",
		"product-prod-123-variants",
		"products-list",
		"variants-list",
		"admin-stock-list",
		"admin-badges",
	];

	it("returns base stock tags without variantIds", () => {
		const tags = getStockInvalidationTags("bague-or", "prod-123");

		expect(tags).toEqual(BASE_TAGS);
	});

	it("includes VARIANT_STOCK and VARIANT_DETAIL_BY_ID for each variantId provided", () => {
		const tags = getStockInvalidationTags("bague-or", "prod-123", ["variant-1", "variant-2"]);

		// VARIANT_DETAIL_BY_ID est le tag de `fetchVariantById` / `fetchVariantDetailById` : sans
		// lui, le formulaire d'édition rend un `originalStock` périmé et le delta
		// relatif diverge du stock réel (STOCK-STALE-BASELINE-001).
		expect(tags).toEqual([
			...BASE_TAGS,
			"variant-stock-variant-1",
			"variant-id-variant-1",
			"variant-stock-variant-2",
			"variant-id-variant-2",
		]);
	});

	it("handles empty variantIds array gracefully", () => {
		const tags = getStockInvalidationTags("bague-or", "prod-123", []);

		expect(tags).toEqual(BASE_TAGS);
	});

	it("handles a single variantId", () => {
		const tags = getStockInvalidationTags("bague-or", "prod-123", ["variant-only"]);

		expect(tags).toEqual([...BASE_TAGS, "variant-stock-variant-only", "variant-id-variant-only"]);
	});
});

// ============================================================================
// getVariantStockInvalidationTags
// ============================================================================

describe("getVariantStockInvalidationTags", () => {
	it("returns a single VARIANT_STOCK tag", () => {
		const tags = getVariantStockInvalidationTags("variant-abc");

		expect(tags).toEqual(["variant-stock-variant-abc"]);
	});

	it("uses the variantId in the tag", () => {
		const tags = getVariantStockInvalidationTags("variant-xyz-999");

		expect(tags[0]).toBe("variant-stock-variant-xyz-999");
	});
});
