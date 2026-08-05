/**
 * @regression overlay-handle-only-allowlist
 *
 * `handleOnly` reste une exception justifiée, jamais un défaut.
 *
 * ## Contexte
 *
 * La règle projet était « pas de `handleOnly` sur Drawer/Sheet », et le code la
 * contredisait sur trois surfaces — chacune avec une justification écrite sur
 * place. Audit « Overlays » 2026-07-26 : la règle a été **assouplie** plutôt que
 * le code corrigé, parce que les trois cas décrivent une vraie collision de
 * gestes (plusieurs interactions se disputant les mêmes pixels, où un drag
 * involontaire fermait la surface en plein usage).
 *
 * ## La règle
 *
 * `handleOnly` est autorisé UNIQUEMENT là où une collision de gestes est
 * constatée et décrite en commentaire sur le call site. Jamais « par prudence »,
 * jamais par copier-coller depuis une sheet voisine : il supprime le
 * swipe-to-dismiss depuis le contenu, qui est l'affordance de fermeture
 * attendue sur mobile.
 *
 * Ce garde-fou verrouille la dérive inverse de celle qu'on vient d'accepter —
 * que l'exception se répande jusqu'à devenir le défaut de fait. Ajouter une
 * entrée à `ALLOWED` exige d'écrire la collision constatée.
 *
 * Volontairement une allowlist, et non une interdiction repo-wide : un
 * garde-fou qui hurle sur chaque nouvelle bottom-sheet serait désactivé en une
 * semaine.
 *
 * ## Retrait du 2026-08-04 — `admin-menu-sheet.tsx`
 *
 * Le menu admin mobile est SORTI de l'allowlist. Sa justification (« navigation
 * longue et scrollable, chaque touch compte ») décrivait une collision constatée
 * **sous Vaul**, dont l'arbitrage scroll↔swipe reposait sur `scrollLockTimeout`.
 * Base UI arbitre sur la DIRECTION du geste et n'a aucun équivalent de ce
 * réglage : la prémisse n'a pas survécu à la migration. Combiné à
 * `showCloseButton={false}` et à la bottom bar qui se dépublie à l'ouverture, il
 * ne restait aucune sortie atteignable au pouce sur un panneau de 92 dvh.
 *
 * ⚠️ Si la fermeture accidentelle pendant le scroll revient sous Base UI, c'est
 * un vrai signal de réouverture — mais il faudra alors la CONSTATER, et la
 * réinscription devra s'accompagner d'une sortie visible dans l'en-tête, comme
 * le font déjà le panier et le panneau de filtres.
 *
 * ⚠️ Migration Base UI : le PROP survit, son MÉCANISME s'est inversé. Vaul avait
 * une liste blanche (« seule la poignée drague ») ; Base UI a une liste noire
 * (`data-base-ui-swipe-ignore` sur les descendants à exclure). Les wrappers
 * traduisent — l'arbitrage produit, lui, est inchangé, et c'est ce que ce
 * garde-fou verrouille.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

/**
 * Les deux wrappers déclarent et forwardent la prop — ils ne la *consomment*
 * pas. Les exclure du scan, pas de l'allowlist : ils ne sont pas des call sites.
 */
const WRAPPERS = new Set(["shared/components/ui/sheet.tsx", "shared/components/ui/drawer.tsx"]);

/** Call sites autorisés → collision de gestes qui le justifie. */
const ALLOWED = new Map<string, string>([
	[
		"modules/cart/components/cart-sheet.tsx",
		"swipe-to-delete des lignes vs scroll de liste vs drag-to-dismiss du panneau",
	],
	[
		"shared/components/filter-sheet-wrapper.tsx",
		"sliders de prix et accordéons — un drag sur un slider fermait la sheet",
	],
	[
		"shared/components/responsive-dialog.tsx",
		"le contenu de tout ResponsiveDialog est un scroller vertical — un drag dedans refermait le panneau",
	],
]);

/**
 * Wrappers d'overlay GÉNÉRIQUES : ils rendent le `{children}` de n'importe quelle
 * surface appelante, donc y poser l'attribut brut revient à décider `handleOnly`
 * pour tout le site, en une ligne que personne ne relit.
 *
 * ⚠️ C'est exactement ce qui s'est produit : `responsive-dialog.tsx` a porté
 * `data-base-ui-swipe-ignore` à la main sur le conteneur de tous ses enfants, avec
 * l'effet EXACT de `handleOnly` — mais invisible à l'allowlist ci-dessus, qui cherche
 * le mot. La règle paraissait respectée partout alors qu'elle était contournée par
 * l'orthographe (audit design du sélecteur de variante, 2026-08-04).
 *
 * Ailleurs, l'attribut reste parfaitement légitime : posé sur un sous-élément précis
 * (une ligne swipe-to-delete, un slider, une zone de défilement), il résout une
 * collision locale sans neutraliser le geste sur tout le panneau.
 */
const GENERIC_OVERLAY_WRAPPERS = ["shared/components/responsive-dialog.tsx"] as const;

/** L'attribut POSÉ sur un élément — le `=` évite de compter les mentions en prose. */
const RAW_SWIPE_IGNORE_ATTRIBUTE = /data-base-ui-swipe-ignore=/;

function collectSourceFiles(): string[] {
	const files: string[] = [];

	function walk(absDir: string) {
		for (const entry of readdirSync(absDir)) {
			if (SKIP_DIRS.has(entry)) continue;
			const abs = join(absDir, entry);
			if (statSync(abs).isDirectory()) {
				walk(abs);
				continue;
			}
			if (!/\.tsx?$/.test(entry)) continue;
			// Les tests citent librement la prop (mocks, assertions de forwarding).
			if (/\.(test|spec)\.tsx?$/.test(entry) || entry.endsWith(".d.ts")) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.sort();
}

describe("@regression overlay-handle-only-allowlist", () => {
	const sourceFiles = collectSourceFiles();

	const callSites = sourceFiles
		.filter((file) => !WRAPPERS.has(file))
		.filter((file) => /\bhandleOnly\b/.test(readFileSync(join(REPO_ROOT, file), "utf-8")));

	it("scanne un nombre significatif de fichiers", () => {
		// Sanity check : si le walker casse, les assertions suivantes passeraient à
		// vide — un garde-fou vert pour la mauvaise raison ne garde rien.
		expect(sourceFiles.length).toBeGreaterThan(500);
		expect(sourceFiles).toContain("shared/components/ui/sheet.tsx");
	});

	it("n'introduit aucun usage de handleOnly hors allowlist", () => {
		const unexpected = callSites.filter((file) => !ALLOWED.has(file));

		expect(
			unexpected,
			"`handleOnly` supprime le swipe-to-dismiss depuis le contenu — l'affordance " +
				"de fermeture attendue sur mobile. Il n'est autorisé que sur une collision " +
				"de gestes constatée, décrite en commentaire sur le call site, puis inscrite " +
				"dans ALLOWED ici.\n" +
				unexpected.join("\n"),
		).toEqual([]);
	});

	it.each(GENERIC_OVERLAY_WRAPPERS)(
		"%s décide le handle-only par la prop, jamais par l'attribut brut",
		(file) => {
			const code = readFileSync(join(REPO_ROOT, file), "utf-8");

			expect(
				RAW_SWIPE_IGNORE_ATTRIBUTE.test(code),
				`${file} rend le \`{children}\` de toutes les surfaces appelantes : y poser ` +
					"`data-base-ui-swipe-ignore` décide `handleOnly` pour tout le site sans " +
					"apparaître dans ALLOWED. Passer la prop au `<Drawer>` racine à la place " +
					"(c'est lui qui la porte, pas `DrawerContent` — elle transite par le contexte).",
			).toBe(false);

			// Corollaire : si le wrapper neutralise bien le geste, il doit le dire.
			expect(code).toMatch(/\bhandleOnly\b/);
		},
	);

	it("garde l'allowlist exacte — une entrée devenue morte doit être retirée", () => {
		const stale = [...ALLOWED.keys()].filter((file) => !callSites.includes(file));

		expect(
			stale,
			"Entrées d'allowlist sans usage réel : la collision de gestes a disparu " +
				"(ou le fichier a bougé). Retirer l'entrée plutôt que la laisser autoriser " +
				"un futur usage non examiné.\n" +
				stale.join("\n"),
		).toEqual([]);
	});
});
