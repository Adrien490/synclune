import { describe, it, expect, vi } from "vitest";

// Mock constants before importing the service
vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: {
		CRITICAL: 1,
		LOW: 3,
		NORMAL_MAX: 50,
	},
	SHARED_CACHE_TAGS: {},
}));

vi.mock("@/modules/media/constants/product-fallback-image.constants", () => ({
	FALLBACK_PRODUCT_IMAGE: {
		id: "fallback-image",
		url: "/fallback.svg",
		alt: "Image indisponible",
		mediaType: "IMAGE",
		blurDataUrl: undefined,
	},
}));

import { getProductCardData } from "./product-display.service";
import type { ProductFromList, SkuFromList } from "@/modules/products/types/product-list.types";

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Creates a mock SKU with sensible defaults
 */
function createMockSku(overrides: Partial<SkuFromList> = {}): SkuFromList {
	return {
		id: "sku-1",
		sku: "SKU-001",
		isActive: true,
		isDefault: true,
		inventory: 10,
		priceInclTax: 2500,
		compareAtPrice: null,
		color: {
			id: "color-1",
			slug: "gold",
			hex: "#FFD700",
			name: "Or",
		},
		material: {
			id: "material-1",
			name: "Argent 925",
		},
		images: [
			{
				id: "img-1",
				url: "/image.jpg",
				thumbnailUrl: "/image-thumb.jpg",
				altText: null,
				isPrimary: true,
				mediaType: "IMAGE",
				blurDataUrl: null,
			},
		],
		...overrides,
	};
}

/**
 * Creates a mock product with sensible defaults
 */
function createMockProduct(
	overrides: Partial<ProductFromList> = {},
	skus: SkuFromList[] = [createMockSku()]
): ProductFromList {
	return {
		id: "product-1",
		slug: "test-product",
		title: "Test Product",
		status: "ACTIVE",
		skus,
		type: { label: "Bague" },
		...overrides,
	} as ProductFromList;
}

// ============================================================================
// TESTS
// ============================================================================

describe("getProductCardData", () => {
	describe("Basic functionality", () => {
		it("should return correct data for a basic product with single SKU", () => {
			const sku = createMockSku({
				id: "sku-basic",
				priceInclTax: 3000,
				inventory: 5,
			});
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.defaultSku).toEqual(sku);
			expect(result.price).toBe(3000);
			expect(result.compareAtPrice).toBeNull();
			expect(result.hasValidSku).toBe(true);
			expect(result.primaryImage).toMatchObject({
				id: "img-1",
				url: "/image.jpg",
				mediaType: "IMAGE",
			});
			expect(result.stockInfo).toEqual({
				status: "in_stock",
				totalInventory: 5,
				availableSkus: 1,
				message: "En stock",
			});
		});

		it("should return hasValidSku false when no active SKUs", () => {
			const sku = createMockSku({ isActive: false, priceInclTax: 2500 });
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			// getPrimarySkuForList returns the inactive SKU as a fallback
			expect(result.defaultSku).not.toBeNull();
			expect(result.defaultSku?.isActive).toBe(false);
			// Price is still taken from the SKU (even if inactive)
			expect(result.price).toBe(2500);
			expect(result.compareAtPrice).toBeNull();
			// But hasValidSku is false (indicates product shouldn't be shown)
			expect(result.hasValidSku).toBe(false);
		});

		it("should return compareAtPrice when SKU has promotion", () => {
			const sku = createMockSku({
				priceInclTax: 2000,
				compareAtPrice: 3000,
			});
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.price).toBe(2000);
			expect(result.compareAtPrice).toBe(3000);
		});
	});

	describe("Stock status calculation", () => {
		it("should return out_of_stock when inventory is 0", () => {
			const sku = createMockSku({ inventory: 0 });
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.stockInfo.status).toBe("out_of_stock");
			expect(result.stockInfo.message).toBe("Rupture de stock");
			expect(result.stockInfo.totalInventory).toBe(0);
			expect(result.stockInfo.availableSkus).toBe(0);
		});

		it("should return low_stock when total inventory is 1", () => {
			const sku = createMockSku({ inventory: 1 });
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.stockInfo.status).toBe("low_stock");
			expect(result.stockInfo.message).toBe("Plus que 1 !");
			expect(result.stockInfo.totalInventory).toBe(1);
		});

		it("should return low_stock when total inventory is 3 (threshold)", () => {
			const sku1 = createMockSku({ id: "sku-1", inventory: 2 });
			const sku2 = createMockSku({ id: "sku-2", inventory: 1, isDefault: false });
			const product = createMockProduct({}, [sku1, sku2]);

			const result = getProductCardData(product);

			expect(result.stockInfo.status).toBe("low_stock");
			expect(result.stockInfo.message).toBe("Plus que 3 !");
			expect(result.stockInfo.totalInventory).toBe(3);
			expect(result.stockInfo.availableSkus).toBe(2);
		});

		it("should return in_stock when inventory > LOW threshold", () => {
			const sku = createMockSku({ inventory: 10 });
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.stockInfo.status).toBe("in_stock");
			expect(result.stockInfo.message).toBe("En stock");
			expect(result.stockInfo.totalInventory).toBe(10);
		});

		it("should aggregate inventory from multiple active SKUs", () => {
			const sku1 = createMockSku({ id: "sku-1", inventory: 5 });
			const sku2 = createMockSku({ id: "sku-2", inventory: 3, isDefault: false });
			const sku3 = createMockSku({ id: "sku-3", inventory: 2, isDefault: false });
			const product = createMockProduct({}, [sku1, sku2, sku3]);

			const result = getProductCardData(product);

			expect(result.stockInfo.totalInventory).toBe(10);
			expect(result.stockInfo.availableSkus).toBe(3);
			expect(result.stockInfo.status).toBe("in_stock");
		});

		it("should exclude inactive SKUs from stock calculation", () => {
			const sku1 = createMockSku({ id: "sku-1", inventory: 5, isActive: true });
			const sku2 = createMockSku({ id: "sku-2", inventory: 100, isActive: false });
			const product = createMockProduct({}, [sku1, sku2]);

			const result = getProductCardData(product);

			expect(result.stockInfo.totalInventory).toBe(5);
			expect(result.stockInfo.availableSkus).toBe(1);
		});
	});

	describe("Color swatches", () => {
		it("should extract unique colors from active SKUs", () => {
			const sku1 = createMockSku({
				id: "sku-1",
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Or" },
			});
			const sku2 = createMockSku({
				id: "sku-2",
				isDefault: false,
				color: { id: "c2", slug: "silver", hex: "#C0C0C0", name: "Argent" },
			});
			const product = createMockProduct({}, [sku1, sku2]);

			const result = getProductCardData(product);

			expect(result.colors).toHaveLength(2);
			expect(result.colors).toContainEqual({
				slug: "gold",
				hex: "#FFD700",
				name: "Or",
				inStock: true,
			});
			expect(result.colors).toContainEqual({
				slug: "silver",
				hex: "#C0C0C0",
				name: "Argent",
				inStock: true,
			});
		});

		it("should mark color as out of stock when inventory is 0", () => {
			const sku = createMockSku({
				inventory: 0,
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Or" },
			});
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.colors).toHaveLength(1);
			expect(result.colors[0]?.inStock).toBe(false);
		});

		it("should merge duplicate colors and mark inStock if any has inventory", () => {
			const sku1 = createMockSku({
				id: "sku-1",
				inventory: 0,
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Or" },
			});
			const sku2 = createMockSku({
				id: "sku-2",
				inventory: 5,
				isDefault: false,
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Or" },
			});
			const product = createMockProduct({}, [sku1, sku2]);

			const result = getProductCardData(product);

			expect(result.colors).toHaveLength(1);
			expect(result.colors[0]).toEqual({
				slug: "gold",
				hex: "#FFD700",
				name: "Or",
				inStock: true,
			});
		});

		it("should filter out invalid hex colors", () => {
			const sku1 = createMockSku({
				id: "sku-1",
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Or" },
			});
			const sku2 = createMockSku({
				id: "sku-2",
				isDefault: false,
				color: { id: "c2", slug: "malicious", hex: "javascript:alert(1)", name: "Invalid" },
			});
			const sku3 = createMockSku({
				id: "sku-3",
				isDefault: false,
				color: { id: "c3", slug: "empty", hex: "", name: "Empty" },
			});
			const product = createMockProduct({}, [sku1, sku2, sku3]);

			const result = getProductCardData(product);

			expect(result.colors).toHaveLength(1);
			expect(result.colors[0]?.hex).toBe("#FFD700");
		});

		it("should accept lowercase hex colors", () => {
			const sku = createMockSku({
				color: { id: "c1", slug: "gold", hex: "#ffd700", name: "Or" },
			});
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.colors).toHaveLength(1);
			expect(result.colors[0]?.hex).toBe("#ffd700");
		});

		it("should ignore SKUs without color", () => {
			const sku1 = createMockSku({
				id: "sku-1",
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Or" },
			});
			const sku2 = createMockSku({
				id: "sku-2",
				isDefault: false,
				color: null,
			});
			const product = createMockProduct({}, [sku1, sku2]);

			const result = getProductCardData(product);

			expect(result.colors).toHaveLength(1);
		});
	});

	describe("Images", () => {
		it("should return primary image from default SKU", () => {
			const sku = createMockSku({
				images: [
					{
						id: "img-primary",
						url: "/primary.jpg",
						thumbnailUrl: "/primary-thumb.jpg",
						altText: "Custom alt",
						isPrimary: true,
						mediaType: "IMAGE",
						blurDataUrl: "blur-data",
					},
				],
			});
			const product = createMockProduct({ title: "Beautiful Ring" }, [sku]);

			const result = getProductCardData(product);

			expect(result.primaryImage).toMatchObject({
				id: "img-primary",
				url: "/primary.jpg",
				mediaType: "IMAGE",
				alt: "Custom alt",
				blurDataUrl: "blur-data",
			});
		});

		it("should use first image when no primary is marked", () => {
			const sku = createMockSku({
				images: [
					{
						id: "img-1",
						url: "/image1.jpg",
						thumbnailUrl: null,
						altText: null,
						isPrimary: false,
						mediaType: "IMAGE",
						blurDataUrl: null,
					},
				],
			});
			const product = createMockProduct({ title: "Ring" }, [sku]);

			const result = getProductCardData(product);

			expect(result.primaryImage.id).toBe("img-1");
		});

		it("should generate alt text when missing", () => {
			const sku = createMockSku({
				images: [
					{
						id: "img-1",
						url: "/image.jpg",
						thumbnailUrl: null,
						altText: null,
						isPrimary: true,
						mediaType: "IMAGE",
						blurDataUrl: null,
					},
				],
				material: { id: "m1", name: "Sterling Silver" },
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Gold" },
			});
			const product = createMockProduct({ title: "Ring" }, [sku]);

			const result = getProductCardData(product);

			expect(result.primaryImage.alt).toBe("Ring - Sterling Silver");
		});

		it("should fallback to placeholder when SKU has no images", () => {
			const sku = createMockSku({ images: [] });
			const product = createMockProduct({ title: "No Image Product" }, [sku]);

			const result = getProductCardData(product);

			expect(result.primaryImage).toMatchObject({
				id: "fallback-image",
				url: "/fallback.svg",
				mediaType: "IMAGE",
			});
			expect(result.primaryImage.alt).toContain("No Image Product");
		});

		it("should return secondary image when SKU has multiple images", () => {
			const sku = createMockSku({
				images: [
					{
						id: "img-1",
						url: "/primary.jpg",
						thumbnailUrl: null,
						altText: null,
						isPrimary: true,
						mediaType: "IMAGE",
						blurDataUrl: null,
					},
					{
						id: "img-2",
						url: "/secondary.jpg",
						thumbnailUrl: null,
						altText: null,
						isPrimary: false,
						mediaType: "IMAGE",
						blurDataUrl: null,
					},
				],
			});
			const product = createMockProduct({ title: "Ring" }, [sku]);

			const result = getProductCardData(product);

			expect(result.secondaryImage).not.toBeNull();
			expect(result.secondaryImage?.id).toBe("img-2");
			expect(result.secondaryImage?.url).toBe("/secondary.jpg");
		});

		it("should return null secondary image when only one image exists", () => {
			const sku = createMockSku({
				images: [
					{
						id: "img-1",
						url: "/primary.jpg",
						thumbnailUrl: null,
						altText: null,
						isPrimary: true,
						mediaType: "IMAGE",
						blurDataUrl: null,
					},
				],
			});
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.secondaryImage).toBeNull();
		});

		it("should skip VIDEO media types when finding images", () => {
			const sku = createMockSku({
				images: [
					{
						id: "vid-1",
						url: "/video.mp4",
						thumbnailUrl: null,
						altText: null,
						isPrimary: true,
						mediaType: "VIDEO",
						blurDataUrl: null,
					},
					{
						id: "img-1",
						url: "/image.jpg",
						thumbnailUrl: null,
						altText: null,
						isPrimary: false,
						mediaType: "IMAGE",
						blurDataUrl: null,
					},
				],
			});
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.primaryImage.id).toBe("img-1");
			expect(result.primaryImage.mediaType).toBe("IMAGE");
		});
	});

	describe("Active color preference", () => {
		it("should select SKU with preferred color when activeColorSlug is provided", () => {
			const sku1 = createMockSku({
				id: "sku-gold",
				isDefault: true,
				priceInclTax: 2000,
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Or" },
			});
			const sku2 = createMockSku({
				id: "sku-silver",
				isDefault: false,
				priceInclTax: 1800,
				color: { id: "c2", slug: "silver", hex: "#C0C0C0", name: "Argent" },
			});
			const product = createMockProduct({}, [sku1, sku2]);

			const result = getProductCardData(product, "silver");

			expect(result.defaultSku?.id).toBe("sku-silver");
			expect(result.price).toBe(1800);
		});

		it("should fallback to default SKU when preferred color is not found", () => {
			const sku1 = createMockSku({
				id: "sku-gold",
				isDefault: true,
				color: { id: "c1", slug: "gold", hex: "#FFD700", name: "Or" },
			});
			const product = createMockProduct({}, [sku1]);

			const result = getProductCardData(product, "nonexistent-color");

			expect(result.defaultSku?.id).toBe("sku-gold");
		});
	});

	describe("Edge cases", () => {
		it("should handle product with empty skus array", () => {
			const product = createMockProduct({}, []);

			const result = getProductCardData(product);

			expect(result.defaultSku).toBeNull();
			expect(result.price).toBe(0);
			expect(result.compareAtPrice).toBeNull();
			expect(result.hasValidSku).toBe(false);
			expect(result.stockInfo.status).toBe("out_of_stock");
			expect(result.colors).toHaveLength(0);
		});

		it("should handle product with null skus", () => {
			const product = createMockProduct({ skus: null as unknown as SkuFromList[] });

			const result = getProductCardData(product);

			expect(result.defaultSku).toBeNull();
			expect(result.price).toBe(0);
			expect(result.hasValidSku).toBe(false);
		});

		it("should handle mix of active and inactive SKUs correctly", () => {
			const sku1 = createMockSku({
				id: "sku-inactive",
				isActive: false,
				isDefault: true,
				inventory: 100,
			});
			const sku2 = createMockSku({
				id: "sku-active",
				isActive: true,
				isDefault: false,
				inventory: 2,
			});
			const product = createMockProduct({}, [sku1, sku2]);

			const result = getProductCardData(product);

			expect(result.defaultSku?.id).toBe("sku-active");
			expect(result.stockInfo.totalInventory).toBe(2);
			expect(result.stockInfo.status).toBe("low_stock");
			expect(result.hasValidSku).toBe(true);
		});

		it("should handle very long alt text by truncating", () => {
			const longAltText = "A".repeat(200);
			const sku = createMockSku({
				images: [
					{
						id: "img-1",
						url: "/image.jpg",
						thumbnailUrl: null,
						altText: longAltText,
						isPrimary: true,
						mediaType: "IMAGE",
						blurDataUrl: null,
					},
				],
			});
			const product = createMockProduct({}, [sku]);

			const result = getProductCardData(product);

			expect(result.primaryImage.alt).toBeDefined();
			expect(result.primaryImage.alt!.length).toBeLessThanOrEqual(120);
			expect(result.primaryImage.alt).toContain("...");
		});
	});
});
