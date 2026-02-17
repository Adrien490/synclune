import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/utils/generate-slug", () => ({
	slugify: (str: string) => str.toLowerCase().replace(/\s+/g, "-"),
}));

import type { BaseProductSku } from "@/shared/types/product-sku.types";
import { findSkuByVariants } from "../sku-variant-finder.service";

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

describe("findSkuByVariants", () => {
	it("should find the exact SKU matching all variant selectors", () => {
		const skus = [
			makeSku({
				id: "sku-1",
				color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
				size: "S",
			}),
			makeSku({
				id: "sku-2",
				color: { id: "c2", slug: "argent", hex: "#C0C0C0", name: "Argent" },
				size: "M",
			}),
		];

		const result = findSkuByVariants({ skus }, { colorSlug: "argent", size: "M" });

		expect(result?.id).toBe("sku-2");
	});

	it("should ignore inactive SKUs", () => {
		const skus = [
			makeSku({
				id: "sku-1",
				isActive: false,
				color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
			}),
			makeSku({
				id: "sku-2",
				isActive: true,
				color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" },
			}),
		];

		const result = findSkuByVariants({ skus }, { colorSlug: "or-rose" });

		expect(result?.id).toBe("sku-2");
	});

	it("should return null when no SKU matches", () => {
		const skus = [
			makeSku({ color: { id: "c1", slug: "or-rose", hex: "#B76E79", name: "Or Rose" } }),
		];

		const result = findSkuByVariants({ skus }, { colorSlug: "bleu" });

		expect(result).toBeNull();
	});

	it("should return null when product has no SKUs", () => {
		expect(findSkuByVariants({ skus: null }, { colorSlug: "or-rose" })).toBeNull();
		expect(findSkuByVariants({ skus: undefined }, { colorSlug: "or-rose" })).toBeNull();
	});

	it("should match when no selectors are provided (returns first active)", () => {
		const skus = [
			makeSku({ id: "sku-1", isActive: true }),
		];

		const result = findSkuByVariants({ skus }, {});

		expect(result?.id).toBe("sku-1");
	});

	it("should match by material", () => {
		const skus = [
			makeSku({ id: "sku-1", material: { id: "m1", name: "Argent 925" } }),
			makeSku({ id: "sku-2", material: { id: "m2", name: "Or 18K" } }),
		];

		const result = findSkuByVariants({ skus }, { material: "Or 18K" });

		expect(result?.id).toBe("sku-2");
	});
});
