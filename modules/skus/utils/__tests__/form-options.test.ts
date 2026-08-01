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
		colors: [{ colorId: "color-1", position: 0, color: { id: "color-1", name: "Rose" } }],
		materials: [
			{ materialId: "mat-1", position: 0, material: { id: "mat-1", name: "Argent 925" } },
		],
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

	it("merges images into a single ordered media[] (1er = principal)", () => {
		const primary = makeSkuImage({ isPrimary: true, url: "https://utfs.io/f/primary.jpg" });
		const gallery1 = makeSkuImage({ isPrimary: false, url: "https://utfs.io/f/g1.jpg" });
		const result = getUpdateProductSkuFormOpts(makeSku({ images: [primary, gallery1] }));

		expect(result.defaultValues.media).toHaveLength(2);
		expect(result.defaultValues.media[0]!.url).toBe("https://utfs.io/f/primary.jpg");
		expect(result.defaultValues.media[1]!.url).toBe("https://utfs.io/f/g1.jpg");
	});

	it("returns empty media[] when sku has no images", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ images: [] }));
		expect(result.defaultValues.media).toEqual([]);
	});

	// Les actions font deleteMany + recréation des SkuMedia : un remap qui omet
	// width/height remettait les colonnes à NULL à chaque édition de variante
	// (et effaçait le backfill de scripts/backfill-media-metadata.ts).
	it("préserve width/height des images existantes (round-trip édition)", () => {
		const img = makeSkuImage({ width: 1600, height: 1200 });
		const result = getUpdateProductSkuFormOpts(makeSku({ images: [img] }));
		expect(result.defaultValues.media[0]).toMatchObject({ width: 1600, height: 1200 });
	});

	it("converts null to undefined in media fields", () => {
		const img = makeSkuImage({
			thumbnailUrl: null,
			blurDataUrl: null,
			altText: null,
		});
		const result = getUpdateProductSkuFormOpts(makeSku({ images: [img] }));

		expect(result.defaultValues.media[0]!.thumbnailUrl).toBeUndefined();
		expect(result.defaultValues.media[0]!.blurDataUrl).toBeUndefined();
		expect(result.defaultValues.media[0]!.altText).toBeUndefined();
	});

	it("falls back to empty array when SKU has no colors (M2M)", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ colors: [] }));
		expect(result.defaultValues.colorIds).toEqual([]);
	});

	it("falls back to empty array when SKU has no materials (M2M)", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ materials: [] }));
		expect(result.defaultValues.materialIds).toEqual([]);
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
		// isActive est converti en string pour matcher le RadioGroupField
		expect(result.defaultValues.isActive).toBe("false");
	});

	it("converts isActive boolean true → string 'true'", () => {
		const result = getUpdateProductSkuFormOpts(makeSku({ isActive: true }));
		expect(result.defaultValues.isActive).toBe("true");
	});
});
