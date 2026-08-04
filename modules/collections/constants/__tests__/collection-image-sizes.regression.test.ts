/**
 * @regression collection-image-sizes-capped
 *
 * Un attribut `sizes` qui se termine en `vw` continue de croître avec le
 * viewport — alors que la grille `/collections` vit dans un conteneur
 * `max-w-6xl` (1152px) : au-delà, la carte ne grandit plus.
 *
 * Avant l'audit CollectionCard du 2026-08-04, les six `sizes` par défaut de
 * `collection-images-grid.tsx` finissaient tous en `vw`, hérités d'une grille
 * qui n'existait plus. Mesuré à 1920px :
 *
 * | image             | déclaré        | réel   | facteur |
 * | ----------------- | -------------- | ------ | ------- |
 * | bento principale  | `33vw` → 634px | 165px  | ×3,8    |
 * | bento secondaire  | `15vw` → 288px | 84px   | ×3,4    |
 * | layout 2 images   | `25vw` → 480px | 114px  | ×4,2    |
 *
 * Chaque facteur est une transformation `/_next/image` facturée pour des pixels
 * jetés — et l'optimiseur d'images est explicitement une frontière de
 * facturation (cf. CLAUDE.md, § Security → images.remotePatterns).
 *
 * La règle : la DERNIÈRE clause d'un `sizes` (celle qui s'applique sur les grands
 * écrans) doit être une largeur en px. Les clauses intermédiaires restent en `vw`,
 * c'est leur rôle — le conteneur grandit encore là.
 */

import { describe, expect, it } from "vitest";

import {
	COLLECTION_IMAGE_SIZES_CARD,
	COLLECTION_IMAGE_SIZES_COMPACT,
} from "../image-sizes.constants";

/** Dernière clause d'un attribut `sizes` (la valeur par défaut, sans media query). */
function fallbackClause(sizes: string): string {
	return sizes.split(",").at(-1)!.trim();
}

describe("@regression collection-image-sizes-capped", () => {
	describe.each(Object.entries(COLLECTION_IMAGE_SIZES_CARD))(
		"COLLECTION_IMAGE_SIZES_CARD.%s",
		(key, sizes) => {
			it("borne les grands écrans par une largeur en px, pas en vw", () => {
				expect(
					fallbackClause(sizes),
					`${key} : la clause par défaut doit être une largeur fixe — le conteneur ` +
						`est plafonné à max-w-6xl, un vw continuerait de croître dans le vide`,
				).toMatch(/^\d+px$/);
			});

			it("n'exprime aucune borne en px dans ses media queries", () => {
				// Les seuils DOIVENT rester alignés sur les breakpoints Tailwind, qui sont
				// en rem : une `(max-width: …px)` d'un `sizes` décrit une largeur de
				// VIEWPORT (comme le fait le navigateur pour srcset) et non un breakpoint
				// de layout — c'est la seule forme que la spec HTML accepte. On vérifie
				// simplement que les valeurs correspondent bien aux paliers de la grille.
				const thresholds = [...sizes.matchAll(/max-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
				for (const threshold of thresholds) {
					expect(
						[374, 639, 767, 1151],
						`${key} : seuil ${threshold}px inconnu — les paliers de la grille sont ` +
							`375 (xs), 640 (sm), 768 (md) et 1152 (max-w-6xl), donc les bornes ` +
							`hautes valent 374 / 639 / 767 / 1151`,
					).toContain(threshold);
				}
			});
		},
	);

	it("les tailles du mega-menu restent entièrement fixes", () => {
		// Le mega-menu a une largeur connue (`w-[min(46rem,…)]`, 3 colonnes figées) :
		// rien n'y justifie une expression en viewport.
		for (const [key, sizes] of Object.entries(COLLECTION_IMAGE_SIZES_COMPACT)) {
			expect(sizes, `COLLECTION_IMAGE_SIZES_COMPACT.${key}`).toMatch(/^\d+px$/);
		}
	});
});
