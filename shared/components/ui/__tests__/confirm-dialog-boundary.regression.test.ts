/**
 * @regression confirm-dialog-boundary
 *
 * Une confirmation standard passe par `ConfirmDialog`, pas par un ré-assemblage
 * des primitives.
 *
 * ## Contexte
 *
 * Avant le 2026-08-06, 26 fichiers ré-assemblaient la MÊME carcasse de contrôle :
 * garde `if (!open && !isPending)`, ordre DOM Cancel→Action, `aria-busy`, ternaire
 * de libellé, `<form>` autour du header et du footer. Deux confirmations voisines
 * différaient de 13 lignes sur 70, dont 6 renommages mécaniques. Chaque invariant
 * a11y y était recopié à 26 exemplaires, et le seul test qui les couvrait portait
 * sur les primitives NUES — un site qui inversait l'ordre Cancel/Action passait le
 * CI sans bruit.
 *
 * Une abstraction existait déjà (`DeleteConfirmationDialog`) et n'avait que 3
 * clients sur 26, parce qu'elle imposait le store ET un `<form action>`. Ce n'est
 * pas l'existence de l'abstraction qui fait tenir la règle, c'est ce garde-fou.
 *
 * ## La règle
 *
 * Toute surface dont le footer est exactement `[Annuler, Confirmer]` passe par
 * `ConfirmDialog`. On ne descend aux primitives que si l'un de ces invariants est
 * faux — et chaque dérogation doit dire lequel :
 *
 *   1. un seul écran ;
 *   2. exactement deux boutons, dans l'ordre Annuler puis Confirmer ;
 *   3. tout le contenu vit dans le formulaire ;
 *   4. l'ouverture est pilotée du dehors (pas de déclencheur interne).
 *
 * `AlertDialogFooter` est le marqueur : aucune confirmation standard n'a plus de
 * raison de l'importer, et il n'a aucun autre usage légitime.
 *
 * ⚠️ Une allowlist, pas une interdiction : les primitives sont une destination
 * légitime. Un garde-fou qui hurlerait sur chaque cas riche serait désactivé en
 * une semaine — c'est précisément ce qui a tué `DeleteConfirmationDialog`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__", "__tests__"]);

/** Ni la primitive ni l'abstraction ne sont des call sites. */
const NOT_CALL_SITES = new Set([
	"shared/components/ui/alert-dialog.tsx",
	"shared/components/dialogs/confirm-dialog.tsx",
]);

/** Call sites autorisés → l'invariant de la frontière qu'ils violent. */
const ALLOWED = new Map<string, string>([
	[
		"modules/auth/components/logout-alert-dialog.tsx",
		"invariant 4 — expose son propre déclencheur (`children` → AlertDialogTrigger, 5 consommateurs)",
	],
	[
		"shared/components/filter-sheet-wrapper.tsx",
		"invariant 4 — confirmation interne d'un wrapper générique, ouverte depuis son propre état de panneau",
	],
	[
		"modules/products/components/product-filter-rail.tsx",
		"invariant 4 — idem filter-sheet-wrapper : confirmation « Tout effacer » interne au rail",
	],
	[
		"shared/components/navigation/unsaved-changes-dialog.tsx",
		"invariant 4 — pilotée par le contexte `useNavigationGuard`, pas par un état d'appelant",
	],
]);

/** L'import du footer — le `}` évite de compter les mentions en prose. */
const FOOTER_IMPORT = /\bAlertDialogFooter[,\s}]/;

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
			if (abs.endsWith(".tsx")) files.push(abs);
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files;
}

function toRepoPath(abs: string): string {
	return relative(REPO_ROOT, abs).split(sep).join("/");
}

describe("frontière ConfirmDialog / primitives", () => {
	it("aucun call site ne ré-assemble un footer de confirmation hors allowlist", () => {
		const offenders = collectSourceFiles()
			.map(toRepoPath)
			.filter((path) => !NOT_CALL_SITES.has(path) && !ALLOWED.has(path))
			.filter((path) => FOOTER_IMPORT.test(readFileSync(join(REPO_ROOT, path), "utf8")));

		expect(offenders).toEqual([]);
	});

	it("chaque dérogation nomme l'invariant qu'elle viole", () => {
		for (const [path, reason] of ALLOWED) {
			expect(reason, `${path} doit nommer son invariant`).toMatch(/invariant [1-4] —/);
		}
	});

	it("l'allowlist ne référence que des fichiers existants", () => {
		const existing = new Set(collectSourceFiles().map(toRepoPath));

		for (const path of ALLOWED.keys()) {
			expect(existing.has(path), `${path} n'existe plus : retirer l'entrée`).toBe(true);
		}
	});

	it("la couche fantôme `responsive-alert-dialog` ne revient pas", () => {
		const offenders = collectSourceFiles()
			.map(toRepoPath)
			.filter((path) =>
				/responsive-alert-dialog/.test(readFileSync(join(REPO_ROOT, path), "utf8")),
			);

		// Elle ne basculait rien malgré son préfixe : 7 de ses 9 exports étaient des
		// pass-through dont le seul effet était de throw. Un fichier `responsive-*`
		// n'existe que s'il rend une primitive DIFFÉRENTE selon le viewport.
		expect(offenders).toEqual([]);
	});
});
