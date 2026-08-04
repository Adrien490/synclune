import { describe, expect, it } from "vitest";

import {
	PRODUCTS_CACHE_TAGS,
	RECENT_PRODUCTS_CACHE_TAGS,
	getRecentProductsInvalidationTags,
} from "../cache";

describe("cache constants", () => {
	describe("PRODUCTS_CACHE_TAGS", () => {
		it("has a LIST tag string", () => {
			expect(typeof PRODUCTS_CACHE_TAGS.LIST).toBe("string");
			expect(PRODUCTS_CACHE_TAGS.LIST.length).toBeGreaterThan(0);
		});

		it("DETAIL returns unique tags per slug", () => {
			const tag1 = PRODUCTS_CACHE_TAGS.DETAIL("bague-lune");
			const tag2 = PRODUCTS_CACHE_TAGS.DETAIL("collier-etoile");
			expect(tag1).not.toBe(tag2);
			expect(tag1).toContain("bague-lune");
		});

		it("SKUS returns unique tags per product ID", () => {
			const tag1 = PRODUCTS_CACHE_TAGS.SKUS("id-1");
			const tag2 = PRODUCTS_CACHE_TAGS.SKUS("id-2");
			expect(tag1).not.toBe(tag2);
			expect(tag1).toContain("id-1");
		});

		it("SKU_STOCK returns unique tags per SKU ID", () => {
			const tag = PRODUCTS_CACHE_TAGS.SKU_STOCK("sku-123");
			expect(tag).toContain("sku-123");
		});

		it("RELATED_CONTEXTUAL returns unique tags per product slug", () => {
			const tag = PRODUCTS_CACHE_TAGS.RELATED_CONTEXTUAL("bague-lune");
			expect(tag).toContain("bague-lune");
		});

		it("static tags are non-empty strings", () => {
			expect(PRODUCTS_CACHE_TAGS.MAX_PRICE.length).toBeGreaterThan(0);
			expect(PRODUCTS_CACHE_TAGS.COUNTS.length).toBeGreaterThan(0);
			expect(PRODUCTS_CACHE_TAGS.SKUS_LIST.length).toBeGreaterThan(0);
			expect(PRODUCTS_CACHE_TAGS.RELATED_PUBLIC.length).toBeGreaterThan(0);
		});

		it("all tags are distinct", () => {
			const staticTags = [
				PRODUCTS_CACHE_TAGS.LIST,
				PRODUCTS_CACHE_TAGS.MAX_PRICE,
				PRODUCTS_CACHE_TAGS.COUNTS,
				PRODUCTS_CACHE_TAGS.SKUS_LIST,
				PRODUCTS_CACHE_TAGS.RELATED_PUBLIC,
			];
			const unique = new Set(staticTags);
			expect(unique.size).toBe(staticTags.length);
		});
	});

	describe("RECENT_PRODUCTS_CACHE_TAGS", () => {
		it("has a LIST tag", () => {
			expect(typeof RECENT_PRODUCTS_CACHE_TAGS.LIST).toBe("string");
			expect(RECENT_PRODUCTS_CACHE_TAGS.LIST.length).toBeGreaterThan(0);
		});
	});

	describe("getRecentProductsInvalidationTags", () => {
		it("returns an array containing the LIST tag", () => {
			const tags = getRecentProductsInvalidationTags();
			expect(tags).toContain(RECENT_PRODUCTS_CACHE_TAGS.LIST);
			expect(tags.length).toBeGreaterThan(0);
		});
	});

	/**
	 * `getRecentSearchesInvalidationTags` était testé ici — et le test se contentait
	 * de vérifier que le helper rendait un tableau non vide, sans jamais demander si
	 * un lecteur posait le tag. Personne ne le posait : trois Server Actions
	 * invalidaient dans le vide (audit cache catalogue 2026-07-31). Helper et tag
	 * supprimés ; le contrat « un tag a un lecteur ET un mutateur » est désormais
	 * verrouillé repo-wide par
	 * `shared/lib/__tests__/no-orphan-catalogue-cache-tags.regression.test.ts`.
	 */

	describe("DETAIL_BY_ID", () => {
		it("produit un tag distinct de DETAIL pour un même identifiant", () => {
			// Le bug corrigé : `DETAIL(\`product-id-${id}\`)` fabriquait un tag à double
			// préfixe qu'aucun mutateur n'émettait.
			expect(PRODUCTS_CACHE_TAGS.DETAIL_BY_ID("abc")).toBe("product-id-abc");
			expect(PRODUCTS_CACHE_TAGS.DETAIL("product-id-abc")).toBe("product-product-id-abc");
			expect(PRODUCTS_CACHE_TAGS.DETAIL_BY_ID("abc")).not.toBe(
				PRODUCTS_CACHE_TAGS.DETAIL("product-id-abc"),
			);
		});
	});
});
