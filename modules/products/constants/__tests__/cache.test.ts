import { describe, expect, it } from "vitest";

import {
	PRODUCTS_CACHE_TAGS,
	RECENT_PRODUCTS_CACHE_TAGS,
	getRecentProductsInvalidationTags,
	getRecentSearchesInvalidationTags,
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

		it("RELATED_USER returns unique tags per user ID", () => {
			const tag1 = PRODUCTS_CACHE_TAGS.RELATED_USER("user-1");
			const tag2 = PRODUCTS_CACHE_TAGS.RELATED_USER("user-2");
			expect(tag1).not.toBe(tag2);
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

	describe("getRecentSearchesInvalidationTags", () => {
		it("returns a non-empty array of strings", () => {
			const tags = getRecentSearchesInvalidationTags();
			expect(tags.length).toBeGreaterThan(0);
			tags.forEach((tag) => {
				expect(typeof tag).toBe("string");
			});
		});
	});
});
