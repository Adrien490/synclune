/**
 * @regression entrance-reduced-motion
 *
 * Le repli reduced-motion de `app/styles/entrance.css` n'était couvert par
 * AUCUN test (audit HandDrawnAccent 2026-08-05) : le killswitch central
 * (`reduced-motion-killswitch.regression.test.ts`) ne scanne que
 * `animations.css` et le motif `.animate-*` — les classes `.enter-*` et
 * `.hand-draw-*` vivent dans un autre fichier et n'y matchent pas. Supprimer
 * le bloc `@media (prefers-reduced-motion: reduce)` d'entrance.css passait
 * vert : tous les fades d'entrée et tous les tracés « fait main » restaient
 * animés sous reduced-motion.
 *
 * Le même audit a résorbé deux doublons de SSOT que ce test verrouille aussi :
 * a) le défaut CSS de `--hand-duration` valait 800 ms alors que le composant
 *    pose toujours 500 ms en inline (`HAND_DRAWN_DURATIONS_MS.trait`) — un
 *    défaut mort qui mentait sur la vitesse réelle ;
 * b) la courbe `cubic-bezier(0, 0, 0.2, 1)` vivait en deux sources non
 *    synchronisées (entrance.css en dur ↔ `MOTION_CONFIG.easing.easeOut`) —
 *    désormais le token `--ease-hand` (globals.css), que ce test compare aux
 *    deux consommateurs.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { HAND_DRAWN_DURATIONS_MS } from "@/shared/components/hand-drawn/constants";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const entranceCss = readFileSync(join(REPO_ROOT, "app/styles/entrance.css"), "utf8");
const globalsCss = readFileSync(join(REPO_ROOT, "app/globals.css"), "utf8");

/** Extrait le contenu du bloc `@media (prefers-reduced-motion: reduce)` (accolades appariées). */
function extractReducedMotionBlock(css: string): string {
	const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
	expect(start, "entrance.css doit contenir un bloc prefers-reduced-motion").toBeGreaterThan(-1);
	const open = css.indexOf("{", start);
	let depth = 1;
	let i = open + 1;
	while (depth > 0 && i < css.length) {
		if (css[i] === "{") depth++;
		if (css[i] === "}") depth--;
		i++;
	}
	return css.slice(open + 1, i - 1);
}

describe("entrance.css — repli reduced-motion", () => {
	const block = extractReducedMotionBlock(entranceCss);

	it.each([".enter-load", ".enter-inview", ".hand-draw-load", ".hand-draw-inview"])(
		"neutralise %s (animation: none)",
		(selector) => {
			expect(block).toContain(selector);
			// Chaque règle du bloc doit couper l'animation — un bloc qui liste le
			// sélecteur sans `animation: none` serait un repli décoratif.
			const rule = block.split("}").find((chunk) => chunk.includes(selector));
			expect(rule, `règle du bloc reduced-motion pour ${selector}`).toBeDefined();
			expect(rule).toContain("animation: none");
		},
	);

	it("fige les tracés à l'état DESSINÉ (stroke-dashoffset: 0), pas caché", () => {
		const handRule = block.split("}").find((chunk) => chunk.includes(".hand-draw-load"));
		expect(handRule).toContain("stroke-dashoffset: 0");
		expect(handRule).toContain("fill-opacity: var(--hand-fill-opacity, 0)");
	});
});

describe("entrance.css — SSOT vitesses et courbe du dessin", () => {
	it(`le défaut CSS de --hand-duration vaut la vitesse réelle du trait (${HAND_DRAWN_DURATIONS_MS.trait}ms)`, () => {
		const fallbacks = [...entranceCss.matchAll(/var\(--hand-duration,\s*(\d+)ms\)/g)].map((m) =>
			Number(m[1]),
		);
		// Les deux modes (load + inview) portent le fallback.
		expect(fallbacks.length).toBeGreaterThanOrEqual(2);
		for (const value of fallbacks) {
			expect(value).toBe(HAND_DRAWN_DURATIONS_MS.trait);
		}
	});

	it("les deux règles hand-draw consomment le token --ease-hand (plus de cubic-bezier en dur)", () => {
		const handRules = entranceCss
			.split("}")
			.filter((chunk) => chunk.includes("animation: hand-draw"));
		expect(handRules.length).toBeGreaterThanOrEqual(2);
		for (const rule of handRules) {
			expect(rule).toContain("var(--ease-hand)");
			expect(rule).not.toMatch(/animation:[^;]*cubic-bezier/);
		}
	});

	it("--ease-hand (globals.css) === MOTION_CONFIG.easing.easeOut — une seule courbe, deux consommateurs", () => {
		const match = globalsCss.match(/--ease-hand:\s*cubic-bezier\(([^)]+)\)/);
		expect(match, "globals.css doit définir --ease-hand").not.toBeNull();
		const cssPoints = match![1]!.split(",").map((point) => Number(point.trim()));
		expect(cssPoints).toEqual([...MOTION_CONFIG.easing.easeOut]);
	});
});
