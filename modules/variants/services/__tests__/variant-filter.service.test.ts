import { describe, it, expect } from "vitest";

import {
	matchColor,
	matchMaterial,
	matchSize,
	matchVariantSelectors,
	filterCompatibleVariants,
} from "../variant-filter.service";
import type { BaseProductVariant } from "@/shared/types/product-variant.types";

function createVariant(overrides?: Partial<BaseProductVariant>): BaseProductVariant {
	return {
		id: "variant-1",
		active: true,
		stock: 5,
		priceCents: null,
		size: null,
		color: { id: "color-1", name: "Or Rose", hex: "#B76E79" },
		material: { id: "material-1", name: "Acier inoxydable" },
		...overrides,
	};
}

describe("matchColor", () => {
	it("matches when no color selector is provided", () => {
		expect(matchColor(createVariant(), {})).toBe(true);
	});

	it("matches by slugified name", () => {
		expect(matchColor(createVariant(), { colorSlug: "or-rose" })).toBe(true);
	});

	it("is tolerant to a non-slugified input (re-slugified before compare)", () => {
		expect(matchColor(createVariant(), { colorSlug: "Or Rose" })).toBe(true);
	});

	it("rejects a different color slug", () => {
		expect(matchColor(createVariant(), { colorSlug: "argent" })).toBe(false);
	});

	it("matches by hex, case- and hash-insensitive", () => {
		expect(matchColor(createVariant(), { colorHex: "b76e79" })).toBe(true);
		expect(matchColor(createVariant(), { colorHex: "#B76E79" })).toBe(true);
	});

	it("matches by color id", () => {
		expect(matchColor(createVariant(), { colorId: "color-1" })).toBe(true);
		expect(matchColor(createVariant(), { colorId: "color-2" })).toBe(false);
	});

	it("rejects a variant without color when a hex or id is requested", () => {
		const variant = createVariant({ color: null });
		expect(matchColor(variant, { colorHex: "#B76E79" })).toBe(false);
		expect(matchColor(variant, { colorId: "color-1" })).toBe(false);
	});

	it("falls back to the material name for a color-less variant (selector UX)", () => {
		// extractVariantInfo expose le matériau comme « couleur » quand la
		// variante n'a pas de couleur — le matcher doit suivre.
		const variant = createVariant({ color: null });
		expect(matchColor(variant, { colorSlug: "acier-inoxydable" })).toBe(true);
		expect(matchColor(variant, { colorSlug: "resine" })).toBe(false);
	});
});

describe("matchMaterial", () => {
	it("matches when no material selector is provided", () => {
		expect(matchMaterial(createVariant(), {})).toBe(true);
	});

	it("matches by slugified name", () => {
		expect(matchMaterial(createVariant(), { materialSlug: "acier-inoxydable" })).toBe(true);
	});

	it("matches by plain material name", () => {
		expect(matchMaterial(createVariant(), { material: "Acier inoxydable" })).toBe(true);
	});

	it("rejects a different material", () => {
		expect(matchMaterial(createVariant(), { materialSlug: "resine" })).toBe(false);
	});

	it("rejects a variant without material when one is requested", () => {
		expect(matchMaterial(createVariant({ material: null }), { materialSlug: "resine" })).toBe(
			false,
		);
	});
});

describe("matchSize", () => {
	it("matches when no size selector is provided", () => {
		expect(matchSize(createVariant(), {})).toBe(true);
	});

	it("matches case-insensitively", () => {
		const variant = createVariant({ size: "Ajustable" });
		expect(matchSize(variant, { size: "ajustable" })).toBe(true);
	});

	it("rejects a different size", () => {
		const variant = createVariant({ size: "52" });
		expect(matchSize(variant, { size: "54" })).toBe(false);
	});

	it("rejects a size selector on a size-less variant", () => {
		expect(matchSize(createVariant({ size: null }), { size: "52" })).toBe(false);
	});
});

describe("matchVariantSelectors", () => {
	it("requires ALL selectors to match", () => {
		const variant = createVariant({ size: "52" });
		expect(
			matchVariantSelectors(variant, {
				colorSlug: "or-rose",
				materialSlug: "acier-inoxydable",
				size: "52",
			}),
		).toBe(true);
		expect(
			matchVariantSelectors(variant, {
				colorSlug: "or-rose",
				materialSlug: "resine",
				size: "52",
			}),
		).toBe(false);
	});
});

describe("filterCompatibleVariants", () => {
	const product = {
		variants: [
			createVariant({ id: "v1", color: { id: "c1", name: "Or Rose", hex: "#B76E79" } }),
			createVariant({ id: "v2", color: { id: "c2", name: "Argent", hex: "#C0C0C0" } }),
			createVariant({
				id: "v3",
				color: { id: "c2", name: "Argent", hex: "#C0C0C0" },
				stock: 0,
			}),
			createVariant({
				id: "v4",
				color: { id: "c2", name: "Argent", hex: "#C0C0C0" },
				active: false,
			}),
		],
	};

	it("returns only active, in-stock variants matching the selectors", () => {
		const result = filterCompatibleVariants(product, { colorSlug: "argent" });
		expect(result.map((v) => v.id)).toEqual(["v2"]);
	});

	it("returns every addable variant when no selector is provided", () => {
		const result = filterCompatibleVariants(product, {});
		expect(result.map((v) => v.id)).toEqual(["v1", "v2"]);
	});

	it("returns an empty array when product has no variants", () => {
		expect(filterCompatibleVariants({ variants: null }, {})).toEqual([]);
	});
});
