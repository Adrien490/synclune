import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SkuDataForInvalidation } from "../../types/sku.types";

// ============================================================================
// Mocks
// ============================================================================

const mockCacheLife = vi.fn();
const mockCacheTag = vi.fn();
const mockUpdateTag = vi.fn();

vi.mock("next/cache", () => ({
	cacheLife: (...args: unknown[]) => mockCacheLife(...args),
	cacheTag: (...args: unknown[]) => mockCacheTag(...args),
	updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// ============================================================================
// Import after mocks
// ============================================================================

import {
	cacheProductSkus,
	cacheSkuDetailById,
	getSkuInvalidationTags,
	getInventoryInvalidationTags,
	collectBulkInvalidationTags,
	invalidateTags,
} from "../cache.utils";

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// cacheProductSkus
// ============================================================================

describe("cacheProductSkus", () => {
	it("sets productDetail cache life and tags", () => {
		cacheProductSkus("product-123");

		expect(mockCacheLife).toHaveBeenCalledWith("catalog");
		expect(mockCacheTag).toHaveBeenCalledWith("product-product-123-skus", "skus-list");
	});
});

// ============================================================================
// cacheSkuDetailById
// ============================================================================

describe("cacheSkuDetailById", () => {
	it("sets user cache life (admin freshness) and tags", () => {
		cacheSkuDetailById("sku-456");

		expect(mockCacheLife).toHaveBeenCalledWith("user");
		expect(mockCacheTag).toHaveBeenCalledWith("sku-id-sku-456", "skus-list");
	});
});

// ============================================================================
// getSkuInvalidationTags
// ============================================================================

describe("getSkuInvalidationTags", () => {
	it("returns base tags with only sku code", () => {
		const tags = getSkuInvalidationTags("SKU-001");

		expect(tags).toContain("skus-list");
		expect(tags).toContain("sku-SKU-001");
		expect(tags).toContain("max-product-price");
		expect(tags).toContain("admin-inventory-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toHaveLength(5);
	});

	it("includes SKU_STOCK and SKU_DETAIL_BY_ID when skuId is provided", () => {
		const tags = getSkuInvalidationTags("SKU-001", undefined, undefined, "id-123");

		expect(tags).toContain("sku-stock-id-123");
		expect(tags).toContain("sku-id-id-123");
		expect(tags).toHaveLength(7);
	});

	it("includes SKUS(productId) when productId is provided", () => {
		const tags = getSkuInvalidationTags("SKU-001", "prod-123");

		expect(tags).toContain("product-prod-123-skus");
		expect(tags).toHaveLength(6);
	});

	it("includes DETAIL and LIST when productSlug is provided", () => {
		const tags = getSkuInvalidationTags("SKU-001", undefined, "bague-or");

		expect(tags).toContain("product-bague-or");
		expect(tags).toContain("products-list");
		expect(tags).toHaveLength(7);
	});

	it("includes all optional tags when all params provided", () => {
		const tags = getSkuInvalidationTags("SKU-001", "prod-123", "bague-or", "id-123");

		expect(tags).toContain("skus-list");
		expect(tags).toContain("sku-SKU-001");
		expect(tags).toContain("max-product-price");
		expect(tags).toContain("admin-inventory-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toContain("sku-stock-id-123");
		expect(tags).toContain("sku-id-id-123");
		expect(tags).toContain("product-prod-123-skus");
		expect(tags).toContain("product-bague-or");
		expect(tags).toContain("products-list");
		expect(tags).toHaveLength(10);
	});

	it("cascades to colors-list + color-${slug} when affectedColorSlugs provided", () => {
		const tags = getSkuInvalidationTags("SKU-001", undefined, undefined, undefined, [
			"or",
			"argent",
		]);

		expect(tags).toContain("colors-list");
		expect(tags).toContain("color-or");
		expect(tags).toContain("color-argent");
	});

	it("cascades to color-${id}-product-count when affectedColorIds provided", () => {
		const tags = getSkuInvalidationTags("SKU-001", undefined, undefined, undefined, undefined, [
			"color-cuid-1",
			"color-cuid-2",
		]);

		expect(tags).toContain("color-color-cuid-1-product-count");
		expect(tags).toContain("color-color-cuid-2-product-count");
	});

	it("cascades to materials-list + material-${slug} when affectedMaterialSlugs provided", () => {
		const tags = getSkuInvalidationTags(
			"SKU-001",
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			["or-18k", "argent-925"],
		);

		expect(tags).toContain("materials-list");
		expect(tags).toContain("material-or-18k");
		expect(tags).toContain("material-argent-925");
	});

	it("cascades to material-${id}-product-count when affectedMaterialIds provided (parité couleur)", () => {
		const tags = getSkuInvalidationTags(
			"SKU-001",
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			["mat-cuid-1", "mat-cuid-2"],
		);

		expect(tags).toContain("material-mat-cuid-1-product-count");
		expect(tags).toContain("material-mat-cuid-2-product-count");
	});

	it("skips cross-module cascade when arrays are empty", () => {
		const tags = getSkuInvalidationTags("SKU-001", undefined, undefined, undefined, [], [], [], []);

		expect(tags).not.toContain("colors-list");
		expect(tags).not.toContain("materials-list");
		// Base set unchanged
		expect(tags).toHaveLength(5);
	});
});

// ============================================================================
// getInventoryInvalidationTags
// ============================================================================

describe("getInventoryInvalidationTags", () => {
	// STOCK-STALE-BASELINE-001 : `skus-list` et `sku-id-*` ont été AJOUTÉS au set.
	// Les longueurs attendues ici encodaient l'omission : le formulaire d'édition
	// (tagué `sku-id-*` + `skus-list`) restait stale après un ajustement de stock,
	// et son `originalInventory` périmé faussait le delta. Le contrat « le mutateur
	// couvre les tags du lecteur » est verrouillé par
	// `inventory-invalidation-covers-reader.regression.test.ts`.
	it("returns base inventory tags without skuIds (including products-list)", () => {
		const tags = getInventoryInvalidationTags("bague-or", "prod-123");

		expect(tags).toContain("product-bague-or");
		expect(tags).toContain("product-prod-123-skus");
		expect(tags).toContain("products-list");
		expect(tags).toContain("skus-list");
		expect(tags).toContain("admin-inventory-list");
		expect(tags).toContain("admin-badges");
		expect(tags).toHaveLength(6);
	});

	it("includes SKU_STOCK and SKU_DETAIL_BY_ID tags for each skuId", () => {
		const tags = getInventoryInvalidationTags("bague-or", "prod-123", ["sku-1", "sku-2"]);

		expect(tags).toContain("sku-stock-sku-1");
		expect(tags).toContain("sku-stock-sku-2");
		// Le détail par id est ce que lit le formulaire d'édition.
		expect(tags).toContain("sku-id-sku-1");
		expect(tags).toContain("sku-id-sku-2");
		expect(tags).toHaveLength(10);
	});

	it("handles empty skuIds array", () => {
		const tags = getInventoryInvalidationTags("bague-or", "prod-123", []);

		expect(tags).toHaveLength(6);
	});
});

// ============================================================================
// collectBulkInvalidationTags
// ============================================================================

describe("collectBulkInvalidationTags", () => {
	const makeSku = (overrides: Partial<SkuDataForInvalidation> = {}): SkuDataForInvalidation => ({
		id: "sku-id-1",
		sku: "SKU-001",
		productId: "prod-1",
		product: { slug: "bague-1" },
		...overrides,
	});

	it("returns a Set of tags for a single SKU", () => {
		const tags = collectBulkInvalidationTags([makeSku()]);

		expect(tags).toBeInstanceOf(Set);
		expect(tags.size).toBeGreaterThan(0);
		expect(tags.has("skus-list")).toBe(true);
		expect(tags.has("sku-SKU-001")).toBe(true);
		expect(tags.has("sku-stock-sku-id-1")).toBe(true);
		expect(tags.has("sku-id-sku-id-1")).toBe(true);
		expect(tags.has("product-prod-1-skus")).toBe(true);
		expect(tags.has("product-bague-1")).toBe(true);
	});

	it("deduplicates tags from SKUs of the same product", () => {
		const skus = [
			makeSku({ id: "sku-1", sku: "SKU-001" }),
			makeSku({ id: "sku-2", sku: "SKU-002" }),
		];

		const tags = collectBulkInvalidationTags(skus);

		// Product-level tags should appear only once despite 2 SKUs
		const tagsArray = Array.from(tags);
		const productSkusTags = tagsArray.filter((t) => t === "product-prod-1-skus");
		expect(productSkusTags).toHaveLength(1);

		// But SKU-specific tags should be distinct
		expect(tags.has("sku-SKU-001")).toBe(true);
		expect(tags.has("sku-SKU-002")).toBe(true);
		expect(tags.has("sku-stock-sku-1")).toBe(true);
		expect(tags.has("sku-stock-sku-2")).toBe(true);
	});

	it("handles SKUs from different products", () => {
		const skus = [
			makeSku({ id: "sku-1", sku: "SKU-001", productId: "prod-1", product: { slug: "bague" } }),
			makeSku({ id: "sku-2", sku: "SKU-002", productId: "prod-2", product: { slug: "collier" } }),
		];

		const tags = collectBulkInvalidationTags(skus);

		expect(tags.has("product-prod-1-skus")).toBe(true);
		expect(tags.has("product-prod-2-skus")).toBe(true);
		expect(tags.has("product-bague")).toBe(true);
		expect(tags.has("product-collier")).toBe(true);
	});

	it("returns empty Set for empty input", () => {
		const tags = collectBulkInvalidationTags([]);
		expect(tags.size).toBe(0);
	});
});

// ============================================================================
// invalidateTags
// ============================================================================

describe("invalidateTags", () => {
	it("calls updateTag for each tag in the Set", () => {
		const tags = new Set(["tag-1", "tag-2", "tag-3"]);

		invalidateTags(tags);

		expect(mockUpdateTag).toHaveBeenCalledTimes(3);
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-2");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-3");
	});

	it("does nothing for an empty Set", () => {
		invalidateTags(new Set());

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});
});
