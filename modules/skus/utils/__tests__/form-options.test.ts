import { describe, it, expect } from "vitest";
import { getUpdateProductSkuFormOpts } from "../form-options";

// ============================================================================
// Helpers
// ============================================================================

function makeSkuImage(overrides: Record<string, unknown> = {}) {
	return {
		id: "img-1",
		url: "https://utfs.io/f/image.jpg",
		thumbnailUrl: null,
		blurDataUrl: null,
		altText: null,
		mediaType: "IMAGE" as const,
		isPrimary: false,
		...overrides,
	};
}

function makeSku(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku-1",
		priceInclTax: 2500, // 25.00 EUR in cents
		compareAtPrice: null,
		inventory: 10,
		isDefault: false,
		isActive: true,
		color: { id: "color-1", name: "Rose" },
		materialId: "mat-1",
		size: "52",
		images: [],
		...overrides,
	} as never;
}

// ============================================================================
// getUpdateProductSkuFormOpts
// ============================================================================

describe("getUpdateProductSkuFormOpts", () => {
	it("converts priceInclTax from cents to euros", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ priceInclTax: 4999 }));
		expect(result.defaultValues.priceInclTaxEuros).toBe(49.99);
	});

	it("converts compareAtPrice from cents to euros when present", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ compareAtPrice: 5999 }));
		expect(result.defaultValues.compareAtPriceEuros).toBe(59.99);
	});

	it("sets compareAtPriceEuros to undefined when compareAtPrice is null", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ compareAtPrice: null }));
		expect(result.defaultValues.compareAtPriceEuros).toBeUndefined();
	});

	it("extracts primary image correctly", () => {
		const primary = makeSkuImage({ isPrimary: true, url: "https://utfs.io/f/primary.jpg" });
		const result = getUpdateProductSkuFormOpts(makeSku({ images: [primary] }));

		expect(result.defaultValues.primaryImage).toBeDefined();
		expect(result.defaultValues.primaryImage!.url).toBe("https://utfs.io/f/primary.jpg");
	});

	it("sets primaryImage to undefined when no primary image exists", () => {
		const gallery = makeSkuImage({ isPrimary: false });
		const result = getUpdateProductSkuFormOpts(makeSku({ images: [gallery] }));

		expect(result.defaultValues.primaryImage).toBeUndefined();
	});

	it("only includes non-primary images in galleryMedia", () => {
		const primary = makeSkuImage({ isPrimary: true, id: "primary" });
		const gallery1 = makeSkuImage({ isPrimary: false, id: "gallery-1" });
		const gallery2 = makeSkuImage({ isPrimary: false, id: "gallery-2" });
		const result = getUpdateProductSkuFormOpts(makeSku({ images: [primary, gallery1, gallery2] }));

		expect(result.defaultValues.galleryMedia).toHaveLength(2);
	});

	it("converts null to undefined in gallery media fields", () => {
		const gallery = makeSkuImage({
			isPrimary: false,
			thumbnailUrl: null,
			blurDataUrl: null,
			altText: null,
		});
		const result = getUpdateProductSkuFormOpts(makeSku({ images: [gallery] }));

		expect(result.defaultValues.galleryMedia[0]!.thumbnailUrl).toBeUndefined();
		expect(result.defaultValues.galleryMedia[0]!.blurDataUrl).toBeUndefined();
		expect(result.defaultValues.galleryMedia[0]!.altText).toBeUndefined();
	});

	it("falls back to empty string for missing colorId", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ color: null }));
		expect(result.defaultValues.colorId).toBe("");
	});

	it("falls back to empty string for missing materialId", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ materialId: null }));
		expect(result.defaultValues.materialId).toBe("");
	});

	it("falls back to empty string for missing size", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ size: null }));
		expect(result.defaultValues.size).toBe("");
	});

	it("passes through inventory, isDefault, isActive", () => {
		const result = getUpdateProductSkuFormOpts(
			makeSku({ inventory: 42, isDefault: true, isActive: false }),
		);
		expect(result.defaultValues.inventory).toBe(42);
		expect(result.defaultValues.isDefault).toBe(true);
		expect(result.defaultValues.isActive).toBe(false);
	});
});
