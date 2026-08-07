/**
 * @regression card-surface-transition-covers-individual-transform-properties
 *
 * En Tailwind v4, `translate-*`, `rotate-*` et `scale-*` alimentent les
 * propriétés CSS AUTONOMES `translate` / `rotate` / `scale` — pas `transform`
 * (vérifié dans le CSS compilé : `.-rotate-1{rotate:-1deg}`). Une liste
 * arbitraire `transition-[transform,…]` ne les anime donc PAS : le lift/tilt
 * de la surface polaroid, le zoom photo, le swap de la 2ᵉ photo et le
 * slide-up de la pastille panier sautaient à la frame 1 pendant que bordure,
 * ombre et opacity s'animaient normalement sur 300 ms (audit polaroid
 * 2026-08-06, 66/100). L'utilitaire NOMMÉ `transition-transform` n'est pas
 * concerné : il compile vers `transition-property: transform, translate,
 * scale, rotate`.
 *
 * Ce test verrouille le périmètre de la famille de cartes Atelier : la SSOT
 * `CARD_SURFACE_POLAROID` et les sites inline corrigés, plus l'interdiction
 * de réintroduire `transform` dans une liste arbitraire de ces fichiers.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");

const read = (relPath: string) => readFileSync(join(ROOT, relPath), "utf8");

/** Fichiers de la famille : tout `transition-[…]` y anime des propriétés autonomes. */
const FAMILY_FILES = [
	"shared/components/card-surface.constants.ts",
	"modules/products/components/product-card.tsx",
	"modules/cart/components/add-to-cart-card-button.tsx",
	"modules/collections/components/collection-chapter.tsx",
] as const;

describe("card surface — transitions des propriétés transform autonomes (TW v4)", () => {
	it("la SSOT CARD_SURFACE_POLAROID transitionne translate et rotate (le lift/tilt de la carte)", () => {
		const source = read("shared/components/card-surface.constants.ts");
		expect(source).toContain("transition-[translate,rotate,border-color,box-shadow]");
	});

	it("le zoom et le swap photo de ProductCard transitionnent scale, pas transform", () => {
		const source = read("modules/products/components/product-card.tsx");
		expect(source).toContain("motion-safe:transition-[scale]");
		expect(source).toContain("motion-safe:transition-[opacity,scale]");
	});

	it("le slide-up de la pastille panier transitionne translate, pas transform", () => {
		const source = read("modules/cart/components/add-to-cart-card-button.tsx");
		expect(source).toContain("motion-safe:transition-[opacity,translate]");
	});

	it("le redressement des tirages de CollectionChapter transitionne rotate, pas transform", () => {
		const source = read("modules/collections/components/collection-chapter.tsx");
		expect(source).toContain("motion-safe:transition-[rotate,box-shadow]");
	});

	it.each(FAMILY_FILES)(
		"%s ne réintroduit pas `transform` dans une liste transition-[…] arbitraire",
		(relPath) => {
			const source = read(relPath);
			// Les listes arbitraires du fichier, ex. `transition-[opacity,scale]`.
			const arbitraryLists = source.match(/transition-\[[^\]]+\]/g) ?? [];
			const offenders = arbitraryLists.filter((list) =>
				list
					.slice("transition-[".length, -1)
					.split(",")
					.some((property) => property.trim() === "transform"),
			);
			expect(offenders).toEqual([]);
		},
	);
});
