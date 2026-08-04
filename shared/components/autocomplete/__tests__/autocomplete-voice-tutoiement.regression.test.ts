import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression autocomplete-voice-tutoiement-2026-08-03
 *
 * Le composant partagé embarquait deux copies vouvoyantes rendues dans le
 * tunnel de paiement (son unique consommateur, via le champ adresse) :
 *
 *  - le hint « **Tapez** encore N caractère(s) » — affiché au checkout dès
 *    1 caractère saisi (minQueryLength=2) ;
 *  - le défaut `noResultsDescription` « **Essayez** de modifier **votre**
 *    recherche ».
 *
 * Le garde-fou du tunnel (`checkout-voice-tutoiement.regression.test.ts`) ne
 * scanne que `modules/payments/**` + `app/paiement` : un composant `shared/`
 * rendu dans le tunnel lui échappe. D'où ce scan local au composant.
 *
 * Convention repo : tutoiement (cf. CLAUDE.md § Conventions). « Réessayer »
 * (infinitif, libellé de bouton) reste autorisé — seul l'impératif vouvoyant
 * est fautif.
 *
 * Audit UI/UX autocomplete 2026-08-03.
 */

const REPO_ROOT = process.cwd();

const SCANNED_DIR = "shared/components/autocomplete";

/**
 * `vous` / `votre` / `vos` en mot entier, insensible à la casse, plus les
 * impératifs vouvoyants sans pronom — avec variantes SANS accent : c'est
 * ainsi que « Reessayez » a échappé au scan checkout (audit 2026-08-03).
 */
const VOUVOIEMENT =
	/\b(vous|votre|vos|veuillez|r[ée]essayez|tapez|essayez|saisissez|s[ée]lectionnez|v[ée]rifiez|choisissez|modifiez|entrez|cliquez)\b/i;

function collectSourceFiles(relativeDir: string): string[] {
	const absolute = join(REPO_ROOT, relativeDir);
	const found: string[] = [];

	for (const entry of readdirSync(absolute, { withFileTypes: true })) {
		if (entry.name === "__tests__" || entry.name === "node_modules") continue;
		const relativePath = join(relativeDir, entry.name);
		if (entry.isDirectory()) {
			found.push(...collectSourceFiles(relativePath));
		} else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
			found.push(relativePath);
		}
	}

	return found;
}

/**
 * Retire les commentaires AVANT la recherche : le scan vise la copie
 * réellement affichée, pas la prose des docblocks.
 */
function stripComments(source: string): string {
	return source
		.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");
}

const FILES = collectSourceFiles(SCANNED_DIR);

describe("Autocomplete — voix unique (tutoiement)", () => {
	it("le scan couvre bien les fichiers attendus (garde-fou du garde-fou)", () => {
		expect(FILES.length).toBeGreaterThanOrEqual(6);
		expect(FILES).toContain(join(SCANNED_DIR, "autocomplete.tsx"));
		expect(FILES).toContain(join(SCANNED_DIR, "constants.ts"));
		expect(FILES).toContain(join(SCANNED_DIR, "autocomplete-list-content.tsx"));
	});

	it("le regex de détection mord réellement (garde-fou du garde-fou)", () => {
		// Les deux offenders exacts de l'audit 2026-08-03.
		expect(VOUVOIEMENT.test("Tapez encore 2 caractères")).toBe(true);
		expect(VOUVOIEMENT.test("Essayez de modifier votre recherche")).toBe(true);
		// Variantes sans accent (leçon « Reessayez » du scan checkout).
		expect(VOUVOIEMENT.test("Selectionnez une adresse")).toBe(true);
		expect(VOUVOIEMENT.test("Veuillez réessayer plus tard.")).toBe(true);
		// Pas de faux positif : infinitif de bouton, tutoiement, sous-chaînes.
		expect(VOUVOIEMENT.test("Réessayer")).toBe(false);
		expect(VOUVOIEMENT.test("Essaie de modifier ta recherche")).toBe(false);
		expect(VOUVOIEMENT.test("Encore 2 caractères")).toBe(false);
		expect(VOUVOIEMENT.test("Nous avons envoyé un e-mail")).toBe(false);
	});

	it("aucune copie vouvoyante ne subsiste dans le composant", () => {
		const offenders: string[] = [];

		for (const file of FILES) {
			const stripped = stripComments(readFileSync(join(REPO_ROOT, file), "utf-8"));

			for (const [index, line] of stripped.split("\n").entries()) {
				if (VOUVOIEMENT.test(line)) {
					offenders.push(`${file}:${index + 1} — ${line.trim()}`);
				}
			}
		}

		expect(offenders).toEqual([]);
	});
});
