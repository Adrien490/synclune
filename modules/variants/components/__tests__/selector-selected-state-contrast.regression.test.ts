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
 * ⚠️ Ce garde est volontairement LOCAL à ces quelques fichiers. Un scan de tout le
 * dépôt toucherait 78 fichiers dont la plupart utilisent `--primary` légitimement
 * comme aplat ; trier aplat contre encre partout est un chantier transverse à part.
 *
 * ⚠️ MISE À JOUR 2026-08-19 (audit du module variants) — l'invariant est INCHANGÉ,
 * seul son PORTEUR a bougé : matériau et taille étaient deux copies de la même
 * mécanique (420 lignes jumelles), désormais unifiées dans `variant-option-group.tsx`.
 * C'est ce fichier qui rend le ternaire `isSelected`, donc c'est lui qui doit porter
 * `brand-rose-strong` — et les deux sélecteurs restent scannés pour qu'aucun
 * `border-primary` ne repousse dans leurs surfaces propres. Le motif du garde tient
 * toujours : la duplication est précisément ce qui avait laissé ces sélecteurs en
 * arrière du reste du design system (audit PDP 2026-08-05).
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
	{
		label: "groupe d'options partagé",
		path: "modules/variants/components/variant-option-group.tsx",
	},
] as const;

/** Le rendu de l'état sélectionné de matériau ET de taille vit désormais ici. */
const SHARED_OPTION_GROUP = "modules/variants/components/variant-option-group.tsx";

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

	it("le groupe d'options (matériau + taille) porte son état en `brand-rose-strong`", () => {
		const source = read(SHARED_OPTION_GROUP);
		expect(source).toContain("border-brand-rose-strong");
		expect(source).toContain("text-brand-rose-strong");
	});

	it("matériau et taille rendent bien ce groupe partagé (le garde ci-dessus les couvre)", () => {
		for (const path of [SELECTORS[0].path, SELECTORS[1].path]) {
			expect(read(path)).toContain("VariantOptionGroup");
		}
	});

	it("le nuancier porte son état en `ring-foreground` (l'aplat appartient au bijou)", () => {
		expect(read(SELECTORS[2].path)).toContain("ring-foreground");
	});
});
