/**
 * @regression navbar-primary-as-ink-2026-08-04
 *
 * Bug : `mega-menu-creations.tsx` peignait le CTA « Découvrir la collection » en
 * `text-primary`, soit le rose PASTEL employé comme ENCRE — **1,60:1** sur
 * `--popover`, mesuré par le harnais de
 * `shared/components/__tests__/token-contrast.regression.test.ts`. WCAG 1.4.3
 * exige 4,5:1 pour du texte de cette taille : le CTA n'existait pas à l'œil.
 *
 * Le dépôt a déjà le jeton prévu pour ce cas — `--color-brand-rose-strong`
 * (`app/globals.css`, § « ROSE PROFOND »), le MÊME rose (teinte 340.78) à la
 * luminosité qui passe : **5,30:1** sur `--popover`. La règle d'usage y est
 * écrite noir sur blanc : « `--primary` pour les surfaces (aplats, boutons,
 * halos) ; `--color-brand-rose-strong` dès que le rose doit être VU ».
 *
 * ## Pourquoi un scan de dossier, et pas une assertion sur un fichier
 *
 * C'est la TROISIÈME fois que le pastel est employé en encre dans cette
 * codebase (point du radio, case cochée, puis ce CTA), et la deuxième dans cette
 * navbar après le trait d'`aria-current` de `SquiggleUnderline`. Le motif se
 * refait parce que `text-primary` se tape naturellement et qu'aucun outil ne le
 * relève : axe-core ne mesure le contraste que sur du texte RENDU, or ce CTA ne
 * s'affiche que dans la branche `hasSpotlight` — c'est-à-dire quand le catalogue
 * n'a aucune création publiée. Un test de rendu ne l'aurait pas vu davantage.
 *
 * ⚠️ Le scan est volontairement limité au dossier de la navbar. Le porter au
 * dépôt entier demanderait de trier les usages LÉGITIMES de `text-primary`
 * (aplats sombres, surfaces `bg-primary` où l'encre est `--primary-foreground`),
 * ce qui est un chantier à part. Ici la règle est absolue : la navbar n'a aucune
 * surface teintée qui justifierait le pastel en encre.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const NAVBAR_DIR = join(__dirname, "..");

/**
 * `text-primary`, `text-primary/70`… mais PAS `text-primary-foreground`, qui est
 * l'encre légitime d'un aplat `bg-primary` (badge « Nouveau » du mega-menu).
 * Le `(?!-)` est la seule chose qui les distingue : `\b` matche aussi devant le
 * tiret, donc sans lui l'assertion serait rouge sur du code correct.
 */
const PRIMARY_AS_INK = /\btext-primary\b(?!-)/;

function collectSourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === "__tests__" ? [] : collectSourceFiles(full);
		if (!/\.tsx?$/.test(entry.name)) return [];
		if (/\.test\.tsx?$/.test(entry.name)) return [];
		return [full];
	});
}

describe("@regression navbar-primary-as-ink", () => {
	const files = collectSourceFiles(NAVBAR_DIR);

	it("trouve bien les sources de la navbar (garde-fou du garde-fou)", () => {
		// Sans ça, un renommage de dossier rendrait le scan vide — donc vert — en
		// silence, ce qui est la pire propriété possible pour un filet.
		expect(files.length).toBeGreaterThan(10);
	});

	it("n'emploie nulle part le rose PASTEL comme encre", () => {
		const offenders = files
			.filter((file) => PRIMARY_AS_INK.test(readFileSync(file, "utf8")))
			.map((file) => file.slice(NAVBAR_DIR.length + 1));

		expect(offenders).toEqual([]);
	});

	it("peint le CTA du panneau vedette en rose PROFOND", () => {
		const code = readFileSync(join(NAVBAR_DIR, "mega-menu-creations.tsx"), "utf8");
		expect(code).toContain("text-brand-rose-strong");
	});

	it("laisse vivre `text-primary-foreground`, l'encre légitime d'un aplat", () => {
		// Documente l'exception : le badge « Nouveau » est un aplat `bg-primary/90`,
		// où le pastel est excellent et l'encre est son propre jeton.
		const code = readFileSync(join(NAVBAR_DIR, "mega-menu-creations.tsx"), "utf8");
		expect(code).toContain("text-primary-foreground");
	});
});
