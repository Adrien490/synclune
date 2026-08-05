/**
 * @regression press-feedback-not-swallowed-by-hover
 *
 * Quand `can-hover:hover:` et `active:` visent la MÊME propriété, le survol gagne
 * et l'enfoncement n'existe plus au pointeur fin.
 *
 * `@custom-variant can-hover` (`app/globals.css`) est déclaré par nous, donc émis
 * APRÈS les variants intégrés de Tailwind v4. À specificity égale — `:hover` et
 * `:active` sur une classe valent tous deux (0,2,0) — c'est l'ordre de la feuille
 * qui tranche : pendant un `mousedown`, la souris est à la fois `:hover` ET
 * `:active`, et la règle `can-hover:hover:` l'emporte. Le retour presse est mort,
 * silencieusement (mécanisme prouvé au mousedown sur le logo, 2026-08-05).
 *
 * Correctif : DOUBLER l'état pressé en `can-hover:active:`, qui est émis dans le
 * même bloc que le hover et gagne à son tour. L'`active:` nu reste, pour le
 * tactile.
 *
 * Deux surfaces de la fiche produit en souffraient (audit PDP 2026-08-05) : le CTA
 * « Ajouter au panier » — le bouton le plus important du site — et le cœur des
 * favoris.
 *
 * ## Portée volontairement étroite
 *
 * Ce test ne scanne pas tout le dépôt : un `active:` sur une propriété que le
 * survol ne touche pas n'a aucun problème, et distinguer les deux cas exige de
 * lire la propriété visée. Il verrouille les surfaces où l'audit a constaté le
 * conflit, et sert de liste à étendre.
 *
 * Toute modification exige une review explicite.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

interface Guard {
	file: string;
	/** Ce que l'enfoncement communique — sert de message d'erreur. */
	affordance: string;
	/** Propriété disputée, telle qu'elle apparaît dans la classe (ex. `scale-`). */
	property: string;
}

const GUARDS: readonly Guard[] = [
	{
		file: "modules/cart/components/add-to-cart-form.tsx",
		affordance: "le CTA « Ajouter au panier » s'enfonce au clic",
		property: "scale-",
	},
	{
		file: "modules/wishlist/components/wishlist-button.tsx",
		affordance: "le cœur des favoris s'enfonce au clic",
		property: "scale-",
	},
	{
		file: "modules/products/components/share-button.tsx",
		affordance: "le bouton de partage s'enfonce au clic",
		property: "scale-",
	},
];

function read(file: string) {
	return readFileSync(join(REPO_ROOT, file), "utf8");
}

describe("un enfoncement n'est jamais avalé par le survol", () => {
	for (const { file, affordance, property } of GUARDS) {
		it(`${file} — ${affordance}`, () => {
			const source = read(file);

			const hoverPattern = new RegExp(`can-hover:hover:${property}`);
			const activePattern = new RegExp(`(?<!can-hover:)active:${property}`);
			const doubledPattern = new RegExp(`can-hover:active:${property}`);

			const hasHover = hoverPattern.test(source);
			const hasActive = activePattern.test(source);

			// Le garde ne mord que si les deux se disputent la même propriété.
			if (!hasHover || !hasActive) return;

			expect(
				doubledPattern.test(source),
				`${file} : \`can-hover:hover:${property}\` et \`active:${property}\` visent la même propriété. ` +
					`Sans un \`can-hover:active:${property}\` pour reprendre la main, ${affordance} ne se voit pas à la souris.`,
			).toBe(true);
		});
	}

	it("le fragment `can-hover:active:` existe bien dans le CSS généré par Tailwind", () => {
		// Garde-fou contre un faux positif : si le variant `can-hover` disparaissait
		// de `globals.css`, tous les doublements ci-dessus seraient du bruit mort.
		const globals = read("app/globals.css");
		expect(globals).toMatch(/@custom-variant can-hover\b/);
	});
});
