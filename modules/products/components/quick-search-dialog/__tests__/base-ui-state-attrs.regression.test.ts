/**
 * @regression qs-dialog-base-ui-state-attrs
 *
 * Bug : `quick-search-dialog.tsx` déclarait ses transitions d'ouverture en
 * `data-[state=open]:` / `data-[state=closed]:` — la forme **Radix**. Le dépôt
 * est sur **Base UI**, qui expose ses états en attributs BOOLÉENS présents ou
 * absents : `data-open` / `data-closed`. Relevé sur le nœud réel au navigateur :
 * `["data-open", "data-base-ui-focusable", "data-slot=dialog-content"]` — il n'y
 * a pas de `data-state`. Les trois lignes ne matchaient donc jamais.
 *
 * Conséquence VISIBLE : ce sont les classes du wrapper partagé qui s'appliquaient
 * seules, celles d'un dialog CENTRÉ. La feuille plein écran mobile grossissait de
 * 95 % au centre à l'ouverture, et **rétrécissait en MONTANT** à la fermeture
 * (`slide-out-to-top-[2%]`) — à contre-sens exact du swipe vers le bas qui la
 * ferme. Le dialog codait un rejet vers le bas et l'animait vers le haut.
 *
 * ## Pourquoi ce test lit le SOURCE, et pas le rendu
 *
 * Rien ne signalait le défaut, et rien ne le signalerait davantage au rendu :
 *
 * - `tailwind-merge` ne fusionne PAS deux variantes de préfixes différents, donc
 *   aucun conflit n'était détecté — les deux jeux coexistaient en silence ;
 * - **toutes** les suites de ce dossier mockent `motion`, et aucune n'assert sur
 *   une classe d'animation. Un test de rendu verrait la classe morte passer
 *   exactement comme la bonne ;
 * - jsdom n'applique aucune feuille de style : `getComputedStyle` ne dirait rien
 *   de l'animation résolue.
 *
 * ⚠️ Le scan porte sur tout le dossier : le défaut se refait en copiant une
 * classe depuis un composant Radix d'une autre codebase, pas en éditant une
 * ligne précise.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const DIALOG_DIR = join(__dirname, "..");

/** `data-[state=open]:`, `data-[state=closed]:`, `data-[state=…]` — la forme Radix. */
const RADIX_STATE_ATTR = /data-\[state=/;

function sourceFiles(): string[] {
	return readdirSync(DIALOG_DIR)
		.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
		.sort();
}

describe("recherche rapide — attributs d'état Base UI", () => {
	it("n'emploie NULLE PART la forme Radix `data-[state=…]`", () => {
		const offenders = sourceFiles().filter((file) =>
			RADIX_STATE_ATTR.test(readFileSync(join(DIALOG_DIR, file), "utf8")),
		);

		expect(
			offenders,
			`Base UI expose \`data-open\` / \`data-closed\` en BOOLÉENS. Une classe ` +
				`\`data-[state=…]\` ne matche jamais, et rien ne le signale (tailwind-merge ` +
				`ne détecte pas le conflit, les tests mockent motion).`,
		).toEqual([]);
	});

	it("la feuille mobile entre par le bas ET sort par le bas", () => {
		const source = readFileSync(join(DIALOG_DIR, "quick-search-dialog.tsx"), "utf8");

		expect(source).toContain("motion-safe:data-open:slide-in-from-bottom");
		expect(source).toContain("motion-safe:data-closed:slide-out-to-bottom");
	});

	/**
	 * Le `slide-out-to-top-[2%]` du wrapper partagé n'est PAS neutralisable en le
	 * surchargeant : `cn()` est `twMerge`, qui ne connaît pas les utilitaires de
	 * `tw-animate-css` — les deux classes survivent au merge et écrivent toutes
	 * les deux `--tw-exit-translate-y`. Le gagnant serait décidé par l'ordre de la
	 * feuille de style. Il faut donc ÉTEINDRE le défaut à la source.
	 */
	it("éteint l'animation par défaut du wrapper au lieu de la surcharger", () => {
		const source = readFileSync(join(DIALOG_DIR, "quick-search-dialog.tsx"), "utf8");

		expect(source).toContain("defaultTransformAnimation={false}");
	});

	it("le wrapper partagé honore bien cette extinction", () => {
		const wrapper = readFileSync(
			join(__dirname, "../../../../../shared/components/ui/dialog.tsx"),
			"utf8",
		);

		expect(wrapper).toContain("defaultTransformAnimation");
		// Les classes éteignables sont bien SOUS la garde, pas inconditionnelles.
		expect(wrapper).toMatch(
			/defaultTransformAnimation && \[[\s\S]*?slide-out-to-top-\[2%\][\s\S]*?\]/,
		);
	});
});
