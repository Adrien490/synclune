/**
 * @regression menu-sheet-accent-as-stroke-2026-08-05
 *
 * Bug : le repère « tu es ici » du menu mobile était porté par la teinte seule —
 * pastille `bg-primary/15` mesurée à **1,06:1** contre le fond du volet (6
 * valeurs sur 255 en niveaux de gris), bordée d'un filet `border-primary` à
 * **1,00:1** contre la pastille qu'il borde (luminance strictement identique).
 * En niveaux de gris, sous `forced-colors` ou pour une vision déficiente au
 * rouge-vert, le volet défilait jusqu'à une ligne qui ressemblait à toutes les
 * autres. WCAG 1.4.11 demande 3:1.
 *
 * Le garde-fou voisin `navbar-ink-contrast.regression.test.ts` ne voyait rien :
 * il ne scanne que `text-primary`, pas les accents en BORDURE. C'est ce trou
 * que ce test ferme, sur le périmètre du volet (`menu-sheet*.tsx`).
 *
 * Règle verrouillée (la même que la bottom-bar, `bottom-bar-accent-is-a-surface`) :
 * un accent de marque est un APLAT sous encre `--foreground` (7,8–12,7:1),
 * jamais un trait. L'état courant s'écrit `bg-brand-lavender` + filet
 * `border-l-foreground` — l'aplat dit la salle, le filet en encre dit « tu es
 * ici » et survit au niveau de gris.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const NAVBAR_DIR = join(__dirname, "..");

/**
 * Tout accent de marque employé en bordure : `border-primary`,
 * `border-l-brand-lavender`, `border-t-primary/40`… Les bordures en
 * `--foreground` / `--border` / `transparent` restent libres — ce sont des
 * encres ou des neutres, pas des accents.
 */
const ACCENT_AS_STROKE = /\bborder(?:-[xylrtbes])?-(?:primary|brand-(?:rose|lavender|mint|sun))\b/;

function collectMenuSheetFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.filter((name) => /^menu-sheet.*\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
		.map((name) => join(dir, name));
}

describe("@regression menu-sheet-accent-as-stroke", () => {
	const files = collectMenuSheetFiles(NAVBAR_DIR);

	it("trouve bien les sources du volet (garde-fou du garde-fou)", () => {
		// menu-sheet, menu-sheet-nav, menu-sheet-nav-sections, menu-sheet-footer,
		// menu-sheet-navigate-context — un renommage qui viderait la liste rendrait
		// le scan silencieusement vert.
		expect(files.length).toBeGreaterThanOrEqual(5);
	});

	it("aucun accent de marque n'est employé en bordure dans le volet", () => {
		const offenders = files
			.map((file) => ({ file, source: readFileSync(file, "utf8") }))
			.filter(({ source }) => ACCENT_AS_STROKE.test(source))
			.map(({ file }) => file);

		expect(offenders).toEqual([]);
	});

	it("le repère courant existe bien sous sa forme conforme : aplat + filet en encre", () => {
		// Assertion positive — si la classe du repère disparaissait entièrement, le
		// scan négatif ci-dessus resterait vert alors que l'état « tu es ici »
		// n'existerait plus du tout.
		const sections = readFileSync(join(NAVBAR_DIR, "menu-sheet-nav-sections.tsx"), "utf8");
		expect(sections).toMatch(/bg-brand-lavender/);
		expect(sections).toMatch(/border-l-foreground/);
	});
});
