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
		"swipe-to-delete des lignes vs scroll de liste vs drag-to-dismiss Vaul",
	],
	[
		"shared/components/filter-sheet-wrapper.tsx",
		"sliders de prix et accordéons — un drag sur un slider fermait la sheet",
	],
	[
		"app/admin/_components/admin-menu-sheet.tsx",
		"navigation longue et scrollable, chaque touch compte",
	],
]);

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
