import { describe, expect, it } from "vitest";

import { SYSTEM_PRODUCT_TYPE_SLUGS } from "@/modules/product-types/constants/system-product-type-slugs";
import {
	PRODUCT_TEXTS,
	PRODUCT_TYPES_REQUIRING_SIZE,
	IMAGE_SIZES,
	MAX_COLOR_SWATCHES,
	ABOVE_FOLD_THRESHOLD,
} from "../product-texts.constants";

describe("product-texts.constants", () => {
	describe("PRODUCT_TEXTS.IMAGES", () => {
		it("DEFAULT_ALT includes title", () => {
			const alt = PRODUCT_TEXTS.IMAGES.DEFAULT_ALT("Bague Lune");
			expect(alt).toContain("Bague Lune");
		});

		it("DEFAULT_ALT includes product type when provided", () => {
			const alt = PRODUCT_TEXTS.IMAGES.DEFAULT_ALT("Lune", "Bague");
			expect(alt).toContain("Bague");
			expect(alt).toContain("Lune");
		});

		it("PLACEHOLDER_ALT includes title", () => {
			const alt = PRODUCT_TEXTS.IMAGES.PLACEHOLDER_ALT("Bague Lune");
			expect(alt).toContain("Bague Lune");
		});

		it("GALLERY_MAIN_ALT includes view info", () => {
			const alt = PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT("Bague Lune", 2, 5);
			expect(alt).toContain("Bague Lune");
			expect(alt).toContain("2");
			expect(alt).toContain("5");
		});

		it("GALLERY_THUMBNAIL_ALT differentiates video from image", () => {
			const imageAlt = PRODUCT_TEXTS.IMAGES.GALLERY_THUMBNAIL_ALT("Bague", 1, false);
			const videoAlt = PRODUCT_TEXTS.IMAGES.GALLERY_THUMBNAIL_ALT("Bague", 1, true);
			expect(imageAlt).toContain("Miniature");
			expect(videoAlt).toContain("Vidéo");
		});
	});

	describe("PRODUCT_TEXTS.PRICING", () => {
		it("SAVINGS returns a formatted string with amount", () => {
			const savings = PRODUCT_TEXTS.PRICING.SAVINGS("15,00 €");
			expect(savings).toContain("15,00 €");
		});
	});

	describe("PRODUCT_TYPES_REQUIRING_SIZE", () => {
		// ⚠️ Les trois assertions précédentes — `toContain("ring")`,
		// `toContain("bracelet")` — étaient VERTES pour la mauvaise raison : elles ne
		// rencontraient jamais un slug réel, et la constante a pointé des mois durant
		// vers des types qui n'existent dans aucune ligne. On confronte donc à la SSOT.
		it("is a non-empty array", () => {
			expect(PRODUCT_TYPES_REQUIRING_SIZE.length).toBeGreaterThan(0);
		});

		it("ne contient que des slugs de types système existants", () => {
			const known = Object.values(SYSTEM_PRODUCT_TYPE_SLUGS);
			for (const slug of PRODUCT_TYPES_REQUIRING_SIZE) {
				expect(known).toContain(slug);
			}
		});

		it("couvre les bagues et les bracelets", () => {
			expect(PRODUCT_TYPES_REQUIRING_SIZE).toContain(SYSTEM_PRODUCT_TYPE_SLUGS.RINGS);
			expect(PRODUCT_TYPES_REQUIRING_SIZE).toContain(SYSTEM_PRODUCT_TYPE_SLUGS.BRACELETS);
		});
	});

	describe("IMAGE_SIZES", () => {
		// `PRODUCT_GALLERY` retiré : jamais consommé — la galerie PDP utilise
		// `GALLERY_MAIN_SIZES` (modules/media/constants/image-config.constants).
		it("has all required size strings", () => {
			expect(typeof IMAGE_SIZES.PRODUCT_CARD).toBe("string");
			expect(typeof IMAGE_SIZES.PRODUCT_THUMBNAIL).toBe("string");
		});

		it("PRODUCT_CARD contains responsive breakpoints", () => {
			expect(IMAGE_SIZES.PRODUCT_CARD).toContain("max-width");
		});
	});

	describe("display constants", () => {
		it("MAX_COLOR_SWATCHES is a positive integer", () => {
			expect(MAX_COLOR_SWATCHES).toBeGreaterThan(0);
			expect(Number.isInteger(MAX_COLOR_SWATCHES)).toBe(true);
		});

		it("ABOVE_FOLD_THRESHOLD is a positive integer", () => {
			expect(ABOVE_FOLD_THRESHOLD).toBeGreaterThan(0);
			expect(Number.isInteger(ABOVE_FOLD_THRESHOLD)).toBe(true);
		});
	});
});
