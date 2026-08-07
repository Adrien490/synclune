/**
 * @regression skeleton-card-ratio-parity
 *
 * Le média de `ProductCard` est en `aspect-4/5` UNIFIÉ tous viewports
 * (product-card.tsx). Trois skeletons avaient dérivé (`aspect-3/4` ou
 * `aspect-square` en mobile) : au swap skeleton → contenu réel, chaque carte
 * changeait de hauteur et toute la grille se décalait — CLS réel sur
 * `/produits` et la wishlist mobile (audit « Animations & reduced motion »
 * 2026-08-03).
 *
 * Depuis l'audit ProductCard 2026-08-03, la parité est STRUCTURELLE : tous les
 * skeletons de grille délèguent au SSOT `ProductCardSkeleton` (seul détenteur
 * du ratio). Le contrat devient donc :
 * 1. le SSOT porte exactement le(s) ratio(s) de `product-card.tsx` ;
 * 2. aucun autre skeleton de carte ne définit de `aspect-*` en propre — un
 *    skeleton qui ré-inline une carte (le bug d'origine) redevient rouge ici ;
 * 3. chaque skeleton de grille importe bien le SSOT.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const CARD_SOURCE = "modules/products/components/product-card.tsx";

/** Seul fichier autorisé à définir le ratio du média d'une carte produit. */
const CARD_SKELETON_SSOT = "modules/products/components/product-card-skeleton.tsx";

/** Skeletons de grille : ils délèguent la carte au SSOT, sans ratio en propre. */
const DELEGATING_SKELETONS = [
	"modules/products/components/product-list-skeleton.tsx",
	"modules/products/components/related-products-skeleton.tsx",
	"modules/products/components/search-fallback-suggestions.tsx",
	"modules/wishlist/components/wishlist-grid-skeleton.tsx",
	// Squelette de la grille de l'accueil (l'étal, 2026-08-04) — enregistré ici
	// dès sa création : une grille de plus que le garde-fou ne voyait pas est
	// exactement ce qui a laissé les trois skeletons d'origine dériver.
	"app/(shop)/(home)/_components/hero/hero-grid.tsx",
] as const;

/**
 * Cellules NON-produit qui vivent dans une grille de `ProductCard` et doivent
 * donc porter le MÊME ratio de média — sans quoi elles dépareillent la rangée le
 * jour où le ratio des cartes change. Elles ne délèguent pas au SSOT (ce ne sont
 * pas des squelettes : leur « photo » a un contenu propre).
 */
const MEDIA_RATIO_MIRRORS = [
	// Dernière cellule de l'étal : l'aplat des 4 couleurs de marque.
	"app/(shop)/(home)/_components/hero/hero-all-creations-card.tsx",
] as const;

function read(relativePath: string): string {
	return readFileSync(join(REPO_ROOT, relativePath), "utf-8");
}

function aspectTokens(relativePath: string): string[] {
	// Capture aussi les variantes responsive (`sm:aspect-…`) : un skeleton qui
	// ne diverge qu'en mobile est précisément le bug d'origine.
	const tokens = read(relativePath).match(/[A-Za-z-]*:?aspect-[^\s"'`]+/g) ?? [];
	return [...new Set(tokens)].sort();
}

describe("@regression skeleton-card-ratio-parity", () => {
	const cardTokens = aspectTokens(CARD_SOURCE);

	it("ProductCard définit un ratio de média", () => {
		expect(cardTokens.length).toBeGreaterThan(0);
	});

	it(`${CARD_SKELETON_SSOT} utilise exactement le(s) ratio(s) de ProductCard`, () => {
		expect(
			aspectTokens(CARD_SKELETON_SSOT),
			`Ratio divergent entre ${CARD_SKELETON_SSOT} et ${CARD_SOURCE} — au swap ` +
				"skeleton → carte réelle, la grille entière se décale (CLS). " +
				"Aligner le skeleton SSOT sur le ratio de product-card.tsx.",
		).toEqual(cardTokens);
	});

	for (const skeleton of DELEGATING_SKELETONS) {
		it(`${skeleton} délègue la carte au SSOT (import présent, aucun aspect-* en propre)`, () => {
			const source = read(skeleton);

			expect(
				source,
				`${skeleton} ne rend plus le SSOT ProductCardSkeleton — la parité ` +
					"anti-CLS avec ProductCard n'est plus garantie structurellement.",
			).toMatch(/from ["'][^"']*product-card-skeleton["']/);

			expect(
				aspectTokens(skeleton),
				`${skeleton} définit son propre ratio de carte au lieu de déléguer au ` +
					"SSOT ProductCardSkeleton — c'est exactement la dérive (aspect-3/4 " +
					"mobile) qui a causé le CLS d'origine. Rendre <ProductCardSkeleton /> " +
					"à la place.",
			).toEqual([]);
		});
	}

	for (const mirror of MEDIA_RATIO_MIRRORS) {
		it(`${mirror} porte exactement le ratio de média de ProductCard`, () => {
			expect(
				aspectTokens(mirror),
				`${mirror} est une cellule d'une grille de ProductCard : son ratio de ` +
					"média doit suivre celui de product-card.tsx, sinon elle dépareille " +
					"la rangée dès que le ratio des cartes change.",
			).toEqual(cardTokens);
		});
	}
});
