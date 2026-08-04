/**
 * @regression focus-indicator-contrast
 *
 * WCAG 1.4.11 (Non-text Contrast, AA) : un indicateur de focus doit atteindre
 * **3:1** contre les couleurs adjacentes.
 *
 * `--ring` vaut `--primary`, le rose pastel `#fdb8e4` : mesuré ici, il plafonne
 * à **1,60:1 sur `--card`** et 1,55:1 sur `--background`. Tant que l'utility
 * `focus-ring` ne posait que cet anneau (`focus-visible:ring-ring` +
 * `focus-visible:border-ring`), tout élément SANS bordure — les liens de carte
 * du storefront, les libellés de la nav — n'avait, au clavier, aucun indicateur
 * de focus perceptible. Le défaut a survécu à la consolidation de l'anneau du
 * 2026-08-01, qui a unifié sa LARGEUR sans jamais mesurer sa COULEUR, et a été
 * relevé par l'audit CollectionCard du 2026-08-04.
 *
 * La forme du correctif n'est pas contrainte ici — deux tons, un token plus
 * sombre, autre chose. Ce qui l'est : **au moins une composante de l'indicateur
 * doit atteindre 3:1** contre la surface qu'elle borde. Un anneau de marque
 * pastel reste parfaitement légitime À CÔTÉ de cette composante.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GLOBALS = readFileSync(join(__dirname, "..", "..", "globals.css"), "utf-8");

const MIN_RATIO = 3;

// ============================================================================
// COULEUR — OKLCH → sRGB linéaire → luminance relative (WCAG 2.x)
// ============================================================================

function oklchToLinearRgb(l: number, c: number, hDeg: number): [number, number, number] {
	const h = (hDeg * Math.PI) / 180;
	const a = c * Math.cos(h);
	const b = c * Math.sin(h);

	const lCube = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const mCube = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const sCube = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

	return [
		4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube,
		-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube,
		-0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube,
	];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
}

function contrastRatio(a: number, b: number): number {
	const [hi, lo] = a > b ? [a, b] : [b, a];
	return (hi + 0.05) / (lo + 0.05);
}

/** Lit un token `--nom: oklch(L C H)` du bloc `:root` de globals.css. */
function tokenLuminance(name: string): number {
	const match = GLOBALS.match(
		new RegExp(`--${name}:\\s*oklch\\(\\s*([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`),
	);
	expect(match, `token --${name} introuvable ou plus exprimé en oklch()`).not.toBeNull();

	const [, l, c, h] = match!;
	return relativeLuminance(oklchToLinearRgb(Number(l), Number(c), Number(h)));
}

/** Corps de l'utility `@utility focus-ring { … }`. */
function focusRingBody(): string {
	const match = GLOBALS.match(/@utility\s+focus-ring\s*\{([\s\S]*?)\n\}/);
	expect(match, "@utility focus-ring introuvable dans app/globals.css").not.toBeNull();
	return match![1]!;
}

// ============================================================================
// TESTS
// ============================================================================

describe("@regression focus-indicator-contrast", () => {
	const surfaces = ["background", "card"] as const;

	it("mesure bien la surface : --card est quasi blanc, --foreground quasi noir", () => {
		// Sanity : si les tokens dérivent vers un thème sombre, les seuils ci-dessous
		// doivent être rejugés plutôt que de passer par accident.
		expect(tokenLuminance("card")).toBeGreaterThan(0.9);
		expect(tokenLuminance("foreground")).toBeLessThan(0.05);
	});

	it("documente pourquoi l'anneau rose ne peut pas porter l'information seul", () => {
		for (const surface of surfaces) {
			expect(
				contrastRatio(tokenLuminance("ring"), tokenLuminance(surface)),
				`--ring atteint désormais ${MIN_RATIO}:1 sur --${surface} : ce test peut être ` +
					`simplifié, et le second ton de focus-ring n'est plus une nécessité.`,
			).toBeLessThan(MIN_RATIO);
		}
	});

	it("l'utility focus-ring porte une composante à 3:1 minimum", () => {
		const body = focusRingBody();

		// La composante contrastée est déclarée en CSS brut (`outline: … var(--token)`)
		// plutôt qu'en `@apply` : `outline-none` pose `--tw-outline-style: none`, que
		// les utilities de largeur relisent — l'outline resterait invisible.
		const outline = body.match(/outline:\s*[^;]*var\(--([\w-]+)\)/);
		expect(
			outline,
			"aucune composante d'indicateur autre que l'anneau `ring-ring` : au clavier, " +
				"un élément sans bordure n'a alors qu'un halo rose à 1,6:1 (WCAG 1.4.11).",
		).not.toBeNull();

		const inkLuminance = tokenLuminance(outline![1]!);
		for (const surface of surfaces) {
			expect(
				contrastRatio(inkLuminance, tokenLuminance(surface)),
				`la composante contrastée de focus-ring (--${outline![1]}) doit atteindre ` +
					`${MIN_RATIO}:1 sur --${surface}`,
			).toBeGreaterThanOrEqual(MIN_RATIO);
		}
	});

	it("l'anneau de marque reste peint, à côté de la composante contrastée", () => {
		// Le correctif ne doit pas se solder par la disparition du rose : il porte la
		// signature en aplat, où il est excellent.
		expect(focusRingBody()).toMatch(/ring-ring/);
	});
});
