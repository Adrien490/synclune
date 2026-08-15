/**
 * @regression selector-selected-state-contrast
 *
 * L'état « sélectionné » des trois sélecteurs de variante de la fiche produit ne
 * doit JAMAIS être porté par `--primary`.
 *
 * `--primary` est un rose pastel à **1,6:1** sur `--background`
 * (`app/globals.css`, « aplat seulement ») : c'est une SURFACE, jamais une encre ni
 * un trait d'état. WCAG 1.4.11 demande 3:1 pour un composant, et le dépôt a déjà
 * tranché exactement ce point dans `shared/components/ui/radio-group.tsx` et
 * `checkbox.tsx` — « Rose PROFOND, pas `--primary` […] le pastel n'était qu'à
 * 1,6:1 » — avec le token `--color-brand-rose-strong` (5,15:1).
 *
 * Les sélecteurs maison de la PDP étaient restés en arrière : matériau et taille
 * signalaient la sélection par `border-primary` + une coche `text-primary`, soit
 * trois porteurs à 1,6:1 (audit PDP 2026-08-05).
 *
 * ⚠️ Ce garde est volontairement LOCAL à ces trois fichiers. Un scan de tout le
 * dépôt toucherait 78 fichiers dont la plupart utilisent `--primary` légitimement
 * comme aplat ; trier aplat contre encre partout est un chantier transverse à part.
 *
 * Toute modification exige une review explicite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SELECTORS = [
	{ label: "matériau", path: "modules/variants/components/material-selector.tsx" },
	{ label: "taille", path: "modules/variants/components/size-selector.tsx" },
	{ label: "couleur", path: "modules/colors/components/color-selector.tsx" },
] as const;

function read(path: string) {
	return readFileSync(join(process.cwd(), path), "utf8");
}

/** Les lignes du ternaire `isSelected ? … : …` et sa branche « sélectionné ». */
function selectedStateLines(source: string) {
	return source
		.split("\n")
		.filter((line) => /(border|text|ring|bg)-primary\b/.test(line))
		.filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"));
}

describe("l'état sélectionné d'un sélecteur de variante n'est pas porté par --primary", () => {
	for (const { label, path } of SELECTORS) {
		it(`sélecteur de ${label} : aucune bordure ni encre en \`--primary\``, () => {
			const lines = selectedStateLines(read(path));
			const offenders = lines.filter((line) => /\b(border|text|ring)-primary\b/.test(line));
			expect(offenders).toEqual([]);
		});
	}

	it("matériau et taille portent leur état en `brand-rose-strong`", () => {
		for (const path of [SELECTORS[0].path, SELECTORS[1].path]) {
			const source = read(path);
			expect(source).toContain("border-brand-rose-strong");
			expect(source).toContain("text-brand-rose-strong");
		}
	});

	it("le nuancier porte son état en `ring-foreground` (l'aplat appartient au bijou)", () => {
		expect(read(SELECTORS[2].path)).toContain("ring-foreground");
	});
});
