/**
 * Tests DIRECTS du builder de galerie — sa vraie logique (ordre canonique,
 * plafond, fallback, ALT) était jusqu'ici uniquement mockée dans
 * `gallery.test.tsx`, donc exécutée par rien.
 */
import { describe, expect, it } from "vitest";

import { MAX_GALLERY_IMAGES } from "@/modules/media/constants/media-limits.constants";
import { buildGallery } from "../gallery-builder.service";

import type { GetProductReturn } from "@/modules/products/types/product.types";

// ============================================================================
// FIXTURES
// ============================================================================

const makeMedia = (overrides: Partial<Record<string, unknown>> = {}) => ({
	id: "media-1",
	url: "https://utfs.io/f/photo1.jpg",
	alt: null,
	type: "IMAGE" as const,
	blurDataUrl: null,
	position: 0,
	...overrides,
});

const makeVariant = (overrides: Partial<Record<string, unknown>> = {}) => ({
	id: "variant-1",
	active: true,
	stock: 3,
	priceCents: null,
	size: null,
	color: { id: "c1", name: "Rose bonbon", hex: "#f472b6" },
	material: { id: "m1", name: "Acier inoxydable" },
	...overrides,
});

const makeProduct = (overrides: Partial<Record<string, unknown>> = {}) =>
	({
		id: "prod-1",
		name: "Boucles Nuage",
		media: [makeMedia()],
		variants: [makeVariant()],
		...overrides,
	}) as unknown as GetProductReturn;

// ============================================================================
// TESTS
// ============================================================================

describe("buildGallery", () => {
	it("retourne le fallback SVG (alt dédié) quand le produit n'a aucun média", () => {
		const result = buildGallery({ product: makeProduct({ media: [] }) });
		expect(result).toHaveLength(1);
		expect(result[0]!.id).toBe("fallback-image");
		expect(result[0]!.type).toBe("IMAGE");
		expect(result[0]!.alt).toBe("Boucles Nuage - Image bientôt disponible");
	});

	it("plafonne à MAX_GALLERY_IMAGES", () => {
		const media = Array.from({ length: MAX_GALLERY_IMAGES + 3 }, (_, i) =>
			makeMedia({ id: `media-${i}`, position: i }),
		);
		const result = buildGallery({ product: makeProduct({ media }) });
		expect(result).toHaveLength(MAX_GALLERY_IMAGES);
	});

	it("préserve l'ordre du select (position) et transporte blurDataUrl", () => {
		const media = [
			makeMedia({ id: "a", position: 0, blurDataUrl: "data:image/png;base64,AAA" }),
			makeMedia({ id: "b", position: 1, blurDataUrl: null }),
		];
		const result = buildGallery({ product: makeProduct({ media }) });
		expect(result.map((m) => m.id)).toEqual(["a", "b"]);
		expect(result[0]!.blurDataUrl).toBe("data:image/png;base64,AAA");
		expect(result[1]!.blurDataUrl).toBeNull();
	});

	it("un alt défini en base est conservé tel quel et flaggé _hasCustomAlt", () => {
		const result = buildGallery({
			product: makeProduct({ media: [makeMedia({ alt: "Gros plan sur le fermoir" })] }),
		});
		expect(result[0]!.alt).toBe("Gros plan sur le fermoir");
		expect(result[0]!._hasCustomAlt).toBe(true);
	});

	it("génère un ALT descriptif depuis variants[0] sans sélection", () => {
		const media = [
			makeMedia({ id: "a", position: 0 }),
			makeMedia({ id: "b", position: 1, url: "https://utfs.io/f/photo2.jpg" }),
		];
		const result = buildGallery({ product: makeProduct({ media }) });
		expect(result[0]!.alt).toBe("Boucles Nuage en Acier inoxydable Rose bonbon - Vue 1 sur 2");
		expect(result[0]!._hasCustomAlt).toBe(false);
	});

	/**
	 * L'ALT généré cite la variante AFFICHÉE, pas variants[0] : ignorer la
	 * sélection produisait « en Argent Bleu » sur la photo affichée en rose —
	 * un ALT WCAG factuellement faux. Même résolution que resolveGalleryAccent.
	 */
	it("résout la variante sélectionnée pour l'ALT (même résolution que l'accent)", () => {
		const product = makeProduct({
			variants: [
				makeVariant({
					id: "v-bleu",
					color: { id: "c1", name: "Bleu nuit", hex: "#1e3a8a" },
					material: { id: "m1", name: "Argent" },
				}),
				makeVariant({
					id: "v-rose",
					color: { id: "c2", name: "Rose bonbon", hex: "#f472b6" },
					material: { id: "m2", name: "Résine" },
				}),
			],
		});
		const result = buildGallery({
			product,
			selectedVariants: { colorSlug: "rose-bonbon" },
		});
		expect(result[0]!.alt).toContain("Résine Rose bonbon");
		expect(result[0]!.alt).not.toContain("Argent");
	});

	it("retombe sur variants[0] quand la sélection ne matche aucune variante", () => {
		const result = buildGallery({
			product: makeProduct(),
			selectedVariants: { colorSlug: "vert-inconnu" },
		});
		expect(result[0]!.alt).toContain("Acier inoxydable Rose bonbon");
	});
});
