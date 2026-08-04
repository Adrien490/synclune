import { describe, expect, it, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/modules/skus/services/sku-variant-finder.service", () => ({
	findSkuByVariants: vi.fn(),
}));

import { normalizeAccentHex, resolveGalleryAccent } from "../gallery-accent.service";
import { findSkuByVariants } from "@/modules/skus/services/sku-variant-finder.service";

// ============================================================================
// Helpers
// ============================================================================

function makeSku(
	id: string,
	colors: { slug: string; hex: string }[],
	overrides: Record<string, unknown> = {},
) {
	return {
		id,
		isActive: true,
		images: [],
		materials: [],
		size: null,
		colors: colors.map((c, position) => ({
			colorId: `c-${c.slug}`,
			position,
			color: { id: `c-${c.slug}`, slug: c.slug, name: c.slug, hex: c.hex },
		})),
		...overrides,
	};
}

function makeProduct(skus: ReturnType<typeof makeSku>[]) {
	// Le cast reflète le select réel (`GET_PRODUCT_SELECT`), la fixture n'en
	// porte que les champs lus par le service.
	return { title: "Papilloux Cristal Fée", type: { label: "Papilloux" }, skus } as never;
}

/** Extrait les trois canaux d'une chaîne `oklch(L C H)`. */
function parseOklch(value: string): { l: number; c: number; h: number } {
	const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
	if (!match) throw new Error(`Format oklch inattendu : ${value}`);
	return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

// ============================================================================
// normalizeAccentHex
// ============================================================================

describe("normalizeAccentHex", () => {
	it("rend null sur une entrée vide ou illisible", () => {
		expect(normalizeAccentHex(null)).toBeNull();
		expect(normalizeAccentHex(undefined)).toBeNull();
		expect(normalizeAccentHex("")).toBeNull();
		expect(normalizeAccentHex("rouge")).toBeNull();
		expect(normalizeAccentHex("#ABC")).toBeNull();
	});

	it("accepte le hex avec ou sans dièse, en toute casse", () => {
		expect(normalizeAccentHex("#50C878")).toBe(normalizeAccentHex("50c878"));
	});

	// La raison d'être du service : les hex du catalogue vont du quasi-blanc au
	// quasi-noir, et aucun des deux n'est utilisable tel quel en halo.

	it("remonte la clarté d'une couleur trop sombre (noir #1A1A1A)", () => {
		const { l } = parseOklch(normalizeAccentHex("#1A1A1A")!);
		expect(l).toBeGreaterThanOrEqual(0.62);
	});

	it("abaisse la clarté d'une couleur trop claire (cristal #E8F4F8)", () => {
		const { l } = parseOklch(normalizeAccentHex("#E8F4F8")!);
		expect(l).toBeLessThanOrEqual(0.84);
	});

	it("remonte la chroma d'une teinte discernable mais délavée (cristal)", () => {
		const { c } = parseOklch(normalizeAccentHex("#E8F4F8")!);
		expect(c).toBeGreaterThanOrEqual(0.07);
	});

	it("borne la chroma d'une couleur saturée (or jaune #FFD700)", () => {
		const { c } = parseOklch(normalizeAccentHex("#FFD700")!);
		expect(c).toBeLessThanOrEqual(0.16);
	});

	// Un bijou argenté donne un carton neutre : remonter la chroma d'un gris
	// reviendrait à lui inventer une teinte qu'il n'a pas.

	it("garde un gris achromatique (argent #C0C0C0)", () => {
		const { c, h } = parseOklch(normalizeAccentHex("#C0C0C0")!);
		expect(c).toBe(0);
		expect(h).toBe(0);
	});

	it("garde le blanc et le noir achromatiques", () => {
		expect(parseOklch(normalizeAccentHex("#FFFFFF")!).c).toBe(0);
		expect(parseOklch(normalizeAccentHex("#000000")!).c).toBe(0);
	});

	it("préserve la teinte : émeraude reste verte, rose reste rose", () => {
		const emeraude = parseOklch(normalizeAccentHex("#50C878")!);
		const rose = parseOklch(normalizeAccentHex("#E8B4B8")!);
		// Angles OKLCh : le vert est autour de 150°, le rose autour de 15-25°.
		expect(emeraude.h).toBeGreaterThan(120);
		expect(emeraude.h).toBeLessThan(180);
		expect(rose.h).toBeLessThan(60);
	});

	it("rend deux teintes distinctes pour deux couleurs distinctes", () => {
		expect(normalizeAccentHex("#E8F4F8")).not.toBe(normalizeAccentHex("#50C878"));
	});
});

// ============================================================================
// resolveGalleryAccent
// ============================================================================

describe("resolveGalleryAccent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(findSkuByVariants).mockReturnValue(null);
	});

	it("retombe sur le premier SKU quand aucune variante n'est sélectionnée", () => {
		const product = makeProduct([
			makeSku("sku-1", [{ slug: "emeraude", hex: "#50C878" }]),
			makeSku("sku-2", [{ slug: "or-jaune", hex: "#FFD700" }]),
		]);

		const accent = resolveGalleryAccent({ product, selectedVariants: {} });

		expect(findSkuByVariants).not.toHaveBeenCalled();
		expect(accent).toBe(normalizeAccentHex("#50C878"));
	});

	it("prend le SKU de la variante sélectionnée", () => {
		const sku2 = makeSku("sku-2", [{ slug: "or-jaune", hex: "#FFD700" }]);
		const product = makeProduct([makeSku("sku-1", [{ slug: "emeraude", hex: "#50C878" }]), sku2]);
		vi.mocked(findSkuByVariants).mockReturnValue(sku2 as never);

		const accent = resolveGalleryAccent({
			product,
			selectedVariants: { colorSlug: "or-jaune" },
		});

		expect(accent).toBe(normalizeAccentHex("#FFD700"));
	});

	// `matchColor` est tolérant any-of sur le M2M : un SKU bicolore matche un
	// slug unique. Prendre `colors[0]` teinterait alors le cadre de la MAUVAISE
	// couleur — celle qu'on n'a pas demandée.
	it("prend la couleur DEMANDÉE sur un SKU multicolore, pas la première", () => {
		const bicolore = makeSku("sku-1", [
			{ slug: "or-rose", hex: "#E8B4B8" },
			{ slug: "emeraude", hex: "#50C878" },
		]);
		const product = makeProduct([bicolore]);
		vi.mocked(findSkuByVariants).mockReturnValue(bicolore as never);

		const accent = resolveGalleryAccent({
			product,
			selectedVariants: { colorSlug: "emeraude" },
		});

		expect(accent).toBe(normalizeAccentHex("#50C878"));
	});

	it("retombe sur la couleur de position 0 quand le slug demandé est absent du SKU", () => {
		const sku = makeSku("sku-1", [{ slug: "or-rose", hex: "#E8B4B8" }]);
		const product = makeProduct([sku]);
		vi.mocked(findSkuByVariants).mockReturnValue(sku as never);

		const accent = resolveGalleryAccent({
			product,
			selectedVariants: { colorSlug: "inconnu" },
		});

		expect(accent).toBe(normalizeAccentHex("#E8B4B8"));
	});

	it("rend null quand le produit n'a aucun SKU", () => {
		expect(resolveGalleryAccent({ product: makeProduct([]), selectedVariants: {} })).toBeNull();
	});

	it("rend null quand le SKU n'a aucune couleur", () => {
		const product = makeProduct([makeSku("sku-1", [])]);
		expect(resolveGalleryAccent({ product, selectedVariants: {} })).toBeNull();
	});

	// Garde de couture : la teinte doit désigner le MÊME bijou que la photo.
	// `buildGallery` résout « variantes sélectionnées, sinon premier SKU » — si
	// cette priorité change d'un côté seulement, le cadre se teinte de la couleur
	// d'une autre photo, et rien d'autre ne le dirait.
	it("interroge findSkuByVariants avec exactement les variantes reçues", () => {
		const product = makeProduct([makeSku("sku-1", [{ slug: "emeraude", hex: "#50C878" }])]);
		const selectedVariants = {
			colorCombo: "argent__or-rose",
			colorSlug: "or-rose",
			materialSlug: "argent-925",
			size: "M",
		};

		resolveGalleryAccent({ product, selectedVariants });

		expect(findSkuByVariants).toHaveBeenCalledWith(product, selectedVariants);
	});
});
