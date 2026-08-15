import { describe, expect, it } from "vitest";

import {
	FIVE_PATH,
	GLOSS_PATH,
	HEART_PATH,
	SPARK_ANCHORS,
	SPARK_LEFT_PATH,
	SPARK_RIGHT_PATH,
} from "../logo-mark.paths";

/**
 * Filet sur les deux fragilités de `logo-mark.paths.ts` (audit logo 2026-08-05) :
 *
 * 1. Les paths sont des données OPAQUES pour tsc — une virgule mangée ou un
 *    nombre tronqué ne casse ni le typecheck ni le rendu jsdom, seulement le
 *    dessin en production.
 * 2. `SPARK_ANCHORS` (le `transformOrigin` du scintillement) et les paths des
 *    étincelles sont DEUX sources de vérité écrites à la main. Retoucher un
 *    path sans retoucher son ancre ne casse rien de visible en test : l'étoile
 *    se met à DÉRIVER au scale au lieu de pulser sur place — précisément le
 *    défaut que l'ancre existe pour prévenir (cf. le commentaire de `Sparkle`).
 */

const VIEWBOX = 256;
/** 2 % de la boîte : assez lâche pour une retouche de courbe, assez serré pour attraper une dérive. */
const ANCHOR_EPSILON = VIEWBOX * 0.02;

const ALL_PATHS = {
	HEART_PATH,
	FIVE_PATH,
	GLOSS_PATH,
	SPARK_LEFT_PATH,
	SPARK_RIGHT_PATH,
} as const;

function tokenize(d: string) {
	const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
	const commands = tokens.filter((t) => /^[A-Za-z]$/.test(t));
	const numbers = tokens.filter((t) => !/^[A-Za-z]$/.test(t)).map(Number);
	return { commands, numbers };
}

/** Boîte englobante de TOUS les points (ancres et contrôles confondus). */
function bboxCenter(numbers: number[]) {
	const xs = numbers.filter((_, i) => i % 2 === 0);
	const ys = numbers.filter((_, i) => i % 2 === 1);
	return {
		x: (Math.min(...xs) + Math.max(...xs)) / 2,
		y: (Math.min(...ys) + Math.max(...ys)) / 2,
	};
}

describe("logo-mark.paths — validité", () => {
	it.each(Object.entries(ALL_PATHS))("%s est un path absolu bien formé", (_, d) => {
		const { commands, numbers } = tokenize(d);

		// Commandes absolues uniquement — les coordonnées sont celles du raster
		// d'origine décalées de (−4,5, +5,5) (recentrage optique 2026-08-15),
		// cf. l'en-tête de `logo-mark.paths.ts` pour re-comparer à une mesure.
		expect(commands[0]).toBe("M");
		expect(commands.at(-1)).toBe("Z");
		for (const c of commands) expect(["M", "L", "C", "Z"]).toContain(c);

		// Chaque nombre parse, et les coordonnées vont par paires (x y).
		expect(numbers.length).toBeGreaterThan(0);
		expect(numbers.length % 2).toBe(0);
		for (const n of numbers) expect(Number.isFinite(n)).toBe(true);
	});

	it.each(Object.entries(ALL_PATHS))("%s reste dans la viewBox 0 0 256 256", (_, d) => {
		const { numbers } = tokenize(d);
		for (const n of numbers) {
			expect(n).toBeGreaterThanOrEqual(0);
			expect(n).toBeLessThanOrEqual(VIEWBOX);
		}
	});
});

describe("logo-mark.paths — cohérence ancres ↔ géométrie", () => {
	it.each([
		["left", SPARK_LEFT_PATH],
		["right", SPARK_RIGHT_PATH],
	] as const)("l'ancre %s est le centre de son étoile (ε 2 %%)", (side, d) => {
		const center = bboxCenter(tokenize(d).numbers);
		const anchor = SPARK_ANCHORS[side];

		expect(Math.abs(center.x - anchor.x * VIEWBOX)).toBeLessThanOrEqual(ANCHOR_EPSILON);
		expect(Math.abs(center.y - anchor.y * VIEWBOX)).toBeLessThanOrEqual(ANCHOR_EPSILON);
	});

	it("les ancres sont des fractions de la boîte, dans [0, 1]", () => {
		for (const { x, y } of Object.values(SPARK_ANCHORS)) {
			expect(x).toBeGreaterThan(0);
			expect(x).toBeLessThan(1);
			expect(y).toBeGreaterThan(0);
			expect(y).toBeLessThan(1);
		}
	});
});
