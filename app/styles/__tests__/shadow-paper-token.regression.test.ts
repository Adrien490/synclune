/**
 * @regression shadow-paper-token-2026-08-05
 *
 * Direction « Relief réel » du panneau du panier : ses lignes sont en `bg-card` (oklch 1)
 * sur un panneau `bg-background` (oklch 0.99), soit **1,03:1**. La surface ne peut donc
 * pas porter la séparation — c'est `shadow-paper` qui la porte.
 *
 * ⚠️ **Pourquoi ce test existe** : une classe `shadow-paper` dont le token `--shadow-paper`
 * n'est pas déclaré dans le `@theme` se compile **sans erreur et sans effet**. Ni `tsc`, ni
 * ESLint, ni le build ne bronchent : Tailwind émet simplement `box-shadow: var(--shadow-paper)`,
 * la variable est vide, et le relief disparaît en silence. C'est exactement la famille de
 * défaut que cet audit a passé sa journée à corriger — un mécanisme écrit, documenté, et
 * jamais vérifié.
 *
 * Le second test verrouille la CALIBRATION, pas juste la présence : l'ombre doit rendre
 * ΔL ≈ 0,060 au pixel le plus sombre, la valeur que fournissait l'ancien fond `bg-muted`
 * (`bg-card` sur `bg-muted` = ΔL 0,0600 / 1,19:1). Trop clair, la ligne redevient invisible ;
 * trop sombre, on retombe sur le filet gris franc qui a été refusé.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GLOBALS = readFileSync(join(__dirname, "..", "..", "globals.css"), "utf-8");

/** oklch → sRGB linéaire (canaux non écrêtés). */
function oklchToLinearSrgb(L: number, C: number, h: number): [number, number, number] {
	const hr = (h * Math.PI) / 180;
	const a = C * Math.cos(hr);
	const b = C * Math.sin(hr);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

/** Clarté OKLab d'une couleur sRGB linéaire — la grandeur perceptuelle comparée ici. */
function oklabLightness([r, g, b]: [number, number, number]): number {
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

/** Composition alpha en lumière linéaire — ce que fait réellement le compositeur. */
function over(
	fg: [number, number, number],
	bg: [number, number, number],
	alpha: number,
): [number, number, number] {
	return [
		alpha * fg[0] + (1 - alpha) * bg[0],
		alpha * fg[1] + (1 - alpha) * bg[1],
		alpha * fg[2] + (1 - alpha) * bg[2],
	];
}

function readToken(name: string): string {
	const match = GLOBALS.match(new RegExp(`--${name}:\\s*([^;]+);`));
	if (!match?.[1]) throw new Error(`Token --${name} absent de globals.css`);
	return match[1].trim();
}

describe("@regression shadow-paper", () => {
	it("le token `--shadow-paper` est déclaré (sinon la classe est un no-op muet)", () => {
		expect(GLOBALS).toMatch(/--shadow-paper:\s*[^;]+;/);
	});

	it("le token vit dans le bloc `@theme`, seul endroit où Tailwind génère l'utilitaire", () => {
		// Déclaré dans `:root` uniquement, `--shadow-paper` existerait en CSS mais la classe
		// `shadow-paper` ne serait jamais générée — même symptôme muet.
		const themeBlock = GLOBALS.match(/@theme[^{]*\{[\s\S]*?\n\}/)?.[0] ?? "";
		expect(themeBlock).toContain("--shadow-paper:");
	});

	it("est calibrée sur la séparation que fournissait l'ancien fond `bg-muted`", () => {
		const background = oklchToLinearSrgb(0.99, 0.005, 270);
		const card = oklchToLinearSrgb(1, 0, 0);
		const muted = oklchToLinearSrgb(0.94, 0.01, 270);

		// La cible : ce que `bg-card` sur `bg-muted` donnait avant le retrait du gris.
		const target = oklabLightness(card) - oklabLightness(muted);

		// Les alphas de chaque couche de l'ombre ; elles se composent là où elles se
		// superposent, au plus près du bord.
		const alphas = [...readToken("shadow-paper").matchAll(/oklch\([^)]*\/\s*([\d.]+)\s*\)/g)].map(
			(m) => Number(m[1]),
		);
		expect(alphas.length, "les deux couches de l'ombre doivent être lisibles").toBe(2);

		const effectiveAlpha = 1 - alphas.reduce((acc, a) => acc * (1 - a), 1);
		const ink = oklchToLinearSrgb(0.13, 0.01, 270);
		const darkest = over(ink, background, effectiveAlpha);
		const actual = oklabLightness(background) - oklabLightness(darkest);

		// ±0,012 : de quoi ajuster le flou ou l'offset sans casser le test, mais pas de quoi
		// laisser l'ombre devenir invisible (≈0,02) ni franchement grise (≈0,10).
		expect(actual).toBeGreaterThan(target - 0.012);
		expect(actual).toBeLessThan(target + 0.012);
	});

	it("est bien consommée — un token sans lecteur est du poids mort", () => {
		const consumers = [
			"modules/cart/components/cart-sheet-item-row.tsx",
			"modules/cart/components/cart-sheet-footer.tsx",
			"modules/cart/components/cart-sheet-skeleton.tsx",
		];
		for (const rel of consumers) {
			const src = readFileSync(join(__dirname, "..", "..", "..", rel), "utf-8");
			expect(src, `${rel} doit consommer shadow-paper`).toContain("shadow-paper");
		}
	});
});
