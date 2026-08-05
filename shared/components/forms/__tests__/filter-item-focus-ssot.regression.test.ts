/**
 * @regression filter-item-focus-ssot
 *
 * Les lignes de filtre (`checkbox-filter-item`, `radio-filter-item`) portaient
 * un anneau de focus maison `focus-within:ring-ring ring-2` : rose pastel à
 * 1,55:1 sur `--background` (sous le seuil 3:1 de WCAG 1.4.11), DOUBLÉ de
 * l'anneau SSOT `focus-ring` du contrôle interne, et déclenché par
 * `focus-within` — donc peint aussi après un simple clic souris, là où
 * `:focus-visible` ne s'active qu'au clavier.
 *
 * Le correctif (lot 0 filtres, 2026-08-05) : AUCUN anneau de ligne — le seul
 * indicateur de focus est l'utilitaire SSOT `focus-ring` porté par le contrôle
 * (la Checkbox via sa primitive, le radio natif directement). Ces fichiers
 * vivent dans `shared/components/forms/`, hors du périmètre scanné par
 * `focus-ring-ssot.regression.test.ts` (`shared/components/ui/` uniquement) —
 * d'où ce garde dédié.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FORMS_DIR = join(__dirname, "..");

const FILES = ["checkbox-filter-item.tsx", "radio-filter-item.tsx"] as const;

describe("@regression filter-item-focus-ssot", () => {
	for (const file of FILES) {
		describe(file, () => {
			const source = readFileSync(join(FORMS_DIR, file), "utf-8");

			it("ne réintroduit pas d'anneau de ligne focus-within", () => {
				expect(
					/focus-within:ring/.test(source),
					"`focus-within:ring-*` sur la ligne : anneau sous 3:1 qui double le " +
						"`focus-ring` du contrôle et survit au clic souris. Le focus est " +
						"porté par l'utilitaire SSOT du contrôle interne.",
				).toBe(false);
			});

			it("n'invente pas d'anneau à la main (ring-ring hors utilitaire)", () => {
				expect(
					/(?:focus[^"']*:|has-focus[^"']*:)ring-ring/.test(source),
					"anneau de focus réimplémenté à la main — utiliser l'utilitaire SSOT `focus-ring`.",
				).toBe(false);
			});
		});
	}

	it("le radio natif de radio-filter-item passe par l'utilitaire SSOT focus-ring", () => {
		const source = readFileSync(join(FORMS_DIR, "radio-filter-item.tsx"), "utf-8");
		expect(
			/"focus-ring"/.test(source),
			"l'input radio doit porter l'utilitaire `focus-ring` (SSOT app/globals.css).",
		).toBe(true);
	});
});
