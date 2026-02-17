import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/utils/generate-slug", () => ({
	slugify: (str: string) => str.toLowerCase().replace(/\s+/g, "-"),
}));

import type { BaseProductSku } from "@/shared/types/product-sku.types";
import { extractVariantInfo } from "../sku-info-extraction.service";

function makeSku(overrides: Partial<BaseProductSku> = {}): BaseProductSku {
	return {
		id: "sku-1",
		sku: "SKU-001",
		isActive: true,
		isDefault: false,
		inventory: 5,
		priceInclTax: 2000,
		compareAtPrice: null,
		size: null,
		color: {
			id: "color-1",
			slug: "or-rose",
			hex: "#B76E79",
			name: "Or Rose",
		},
		material: {
			id: "mat-1",
			name: "Argent 925",
		},
		images: [],
		...overrides,
	};
}

describe("extractVariantInfo", () => {
	it("should extract colors from active SKUs", () => {
		const product = {
			skus: [
				makeSku({ color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" } }),
				makeSku({ id: "sku-2", color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" } }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.availableColors).toHaveLength(2);
		expect(info.availableColors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "Or Rose", slug: "or-rose" }),
				expect.objectContaining({ name: "Argent", slug: "argent" }),
			])
		);
	});

	it("should extract materials from active SKUs", () => {
		const product = {
			skus: [
				makeSku({ material: { id: "m1", name: "Argent 925" } }),
				makeSku({ id: "sku-2", material: { id: "m2", name: "Or 18K" } }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.availableMaterials).toHaveLength(2);
		expect(info.availableMaterials).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "Argent 925" }),
				expect.objectContaining({ name: "Or 18K" }),
			])
		);
	});

	it("should extract sizes from active SKUs", () => {
		const product = {
			skus: [
				makeSku({ size: "S" }),
				makeSku({ id: "sku-2", size: "M" }),
				makeSku({ id: "sku-3", size: null }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.availableSizes).toHaveLength(2);
		expect(info.availableSizes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ size: "S" }),
				expect.objectContaining({ size: "M" }),
			])
		);
	});

	it("should compute price range correctly", () => {
		const product = {
			skus: [
				makeSku({ priceInclTax: 1500 }),
				makeSku({ id: "sku-2", priceInclTax: 3000 }),
				makeSku({ id: "sku-3", priceInclTax: 2000 }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.priceRange.min).toBe(1500);
		expect(info.priceRange.max).toBe(3000);
	});

	it("should return 0 for price range when no active SKUs", () => {
		const product = {
			skus: [makeSku({ isActive: false })],
		};

		const info = extractVariantInfo(product);

		expect(info.priceRange.min).toBe(0);
		expect(info.priceRange.max).toBe(0);
	});

	it("should compute total stock from active SKUs only", () => {
		const product = {
			skus: [
				makeSku({ inventory: 3 }),
				makeSku({ id: "sku-2", inventory: 7 }),
				makeSku({ id: "sku-3", isActive: false, inventory: 100 }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.totalStock).toBe(10);
	});

	it("should handle product with no SKUs", () => {
		const info = extractVariantInfo({ skus: null });

		expect(info.availableColors).toEqual([]);
		expect(info.availableMaterials).toEqual([]);
		expect(info.availableSizes).toEqual([]);
		expect(info.priceRange).toEqual({ min: 0, max: 0 });
		expect(info.totalStock).toBe(0);
	});

	it("should use material name as color fallback when no color is set", () => {
		const product = {
			skus: [
				makeSku({ color: null, material: { id: "m1", name: "Or 18K" } }),
			],
		};

		const info = extractVariantInfo(product);

		expect(info.availableColors).toHaveLength(1);
		expect(info.availableColors[0].name).toBe("Or 18K");
		expect(info.availableColors[0].slug).toBe("or-18k");
	});

	it("should count availableSkus per color", () => {
		const product = {
			skus: [
				makeSku({ id: "sku-1", color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" } }),
				makeSku({ id: "sku-2", color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" }, size: "M" }),
				makeSku({ id: "sku-3", color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" } }),
			],
		};

		const info = extractVariantInfo(product);

		const orRose = info.availableColors.find((c) => c.name === "Or Rose");
		const argent = info.availableColors.find((c) => c.name === "Argent");

		expect(orRose?.availableSkus).toBe(2);
		expect(argent?.availableSkus).toBe(1);
	});
});
