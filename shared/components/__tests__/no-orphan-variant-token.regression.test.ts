/**
 * @regression no-orphan-variant-token
 *
 * Garde-fou repo-wide contre la corruption « broken concat » de className :
 * un fragment de variant Tailwind orphelin (`=xxx]:` sans son `[…` ouvrant),
 * typiquement le reliquat d'un variant `dark:…` ou `data-[…]:…` retiré à la
 * main. Tailwind n'émet alors AUCUNE des classes du token — le style disparaît
 * en silence, invisible à `tsc`, au lint et au rendu (la classe est simplement
 * ignorée).
 *
 * ## Historique
 *
 * - 2026-05-28 (audit UI/UX, finding A1) : `TabsTrigger` —
 *   `bg-background=active]:text-foreground` → onglet actif sans fond.
 *   Verrouillé par `tabs-active-state.regression.test.tsx`… sur tabs.tsx SEUL.
 * - 2026-08-01 (audit UI design system) : trois autres fichiers portaient la
 *   même signature depuis des mois, hors du périmètre du garde :
 *   - `ui/field.tsx` — `…border-primary=checked]:bg-primary/10` (le fond d'un
 *     `FieldLabel` coché ne s'appliquait jamais) ;
 *   - `ui/input-group.tsx` — `…border-destructive=true]]:ring-destructive/40`
 *     (la bordure d'erreur de l'InputGroup ne s'appliquait jamais) ;
 *   - `ui/dropdown-menu.tsx` — deux lignes entièrement orphelines
 *     `=destructive]:…`.
 *
 * Leçon : un garde partiel laisse vivre le bug qu'il connaît. Celui-ci scanne
 * tout `app/`, `modules/`, `shared/`.
 *
 * ## Détection
 *
 * Un token est corrompu si un motif `=mot]` (ou `=mot]]`) suivi de `:` s'y
 * trouve à profondeur de crochets ≤ 0 — c'est-à-dire sans `[` ouvrant encore
 * actif. `data-[state=checked]:bg-x` est légitime (le `=` est à profondeur 1) ;
 * `border-primary=checked]:bg-x` ne l'est pas (profondeur 0).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

function collectFiles(): string[] {
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
			// Les tests n'expédient rien, et ceux qui documentent ce bug citent
			// littéralement les signatures interdites.
			if (/\.(test|spec)\.tsx?$/.test(entry) || entry.endsWith(".d.ts")) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.sort();
}

/** Tokens corrompus d'une ligne source (`[]` si aucun). */
function findOrphanVariantTokens(line: string): string[] {
	const broken: string[] = [];

	// Un token className = séquence sans espace ni délimiteur de chaîne.
	for (const token of line.split(/[\s"'`,()]+/)) {
		if (!token.includes("]:")) continue;

		const fragment = /=[A-Za-z0-9-]+\]\]?:/g;
		let match: RegExpExecArray | null;
		while ((match = fragment.exec(token)) !== null) {
			let depth = 0;
			for (let i = 0; i < match.index; i++) {
				if (token[i] === "[") depth++;
				else if (token[i] === "]") depth--;
			}
			if (depth <= 0) {
				broken.push(token);
				break;
			}
		}
	}

	return broken;
}

describe("@regression no-orphan-variant-token", () => {
	const sourceFiles = collectFiles();

	it("scans a meaningful number of files", () => {
		// Sanity check : si le walker casse, le test suivant passerait à vide.
		expect(sourceFiles.length).toBeGreaterThan(500);
	});

	it("détecte les 4 signatures historiques (preuve que le garde attrape le bug)", () => {
		// TabsTrigger 2026-05-28
		expect(findOrphanVariantTokens("bg-background=active]:text-foreground")).toHaveLength(1);
		// field.tsx 2026-08-01
		expect(
			findOrphanVariantTokens(
				"has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary=checked]:bg-primary/10",
			),
		).toHaveLength(1);
		// input-group.tsx 2026-08-01
		expect(
			findOrphanVariantTokens(
				"has-[[data-slot][aria-invalid=true]]:border-destructive=true]]:ring-destructive/40",
			),
		).toHaveLength(1);
		// dropdown-menu.tsx 2026-08-01 (token entièrement orphelin)
		expect(findOrphanVariantTokens("=destructive]:focus:bg-destructive/20")).toHaveLength(1);
	});

	it("ne signale pas les variants légitimes", () => {
		for (const legit of [
			"data-[state=checked]:bg-primary",
			"has-data-[state=checked]:border-primary",
			"has-[[data-slot][aria-invalid=true]]:ring-destructive/20",
			"data-[variant=destructive]:*:[svg]:!text-destructive",
			"supports-[display=grid]:grid",
			"group-data-[disabled=true]:opacity-50",
		]) {
			expect(findOrphanVariantTokens(legit), legit).toEqual([]);
		}
	});

	it("aucun token de variant orphelin dans app/, modules/, shared/", () => {
		const offenders: string[] = [];

		for (const relativePath of sourceFiles) {
			const lines = readFileSync(join(REPO_ROOT, relativePath), "utf-8").split("\n");
			lines.forEach((line, index) => {
				for (const token of findOrphanVariantTokens(line)) {
					offenders.push(`${relativePath}:${index + 1} — ${token}`);
				}
			});
		}

		expect(
			offenders,
			"Fragment de variant Tailwind orphelin (`=xxx]:` sans `[…` ouvrant) — " +
				"reliquat d'une concaténation cassée : Tailwind n'émettra AUCUNE de ces " +
				"classes. Recoller ou supprimer le fragment.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});
});
