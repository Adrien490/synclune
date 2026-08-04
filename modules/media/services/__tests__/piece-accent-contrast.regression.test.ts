/**
 * @regression piece-accent-contrast
 *
 * `--piece-accent` a cessé d'être un simple halo autour de la photo : depuis la
 * refonte « Le nuancier », la teinte du bijou affiché porte aussi l'aplat du prix,
 * les plaquettes du nuancier et le liseré du CTA (`ProductAccentScope`). Une
 * couleur de catalogue arbitraire devient donc un **fond de texte**.
 *
 * Ce qui rend l'opération sûre n'est pas une intention, c'est la normalisation de
 * `normalizeAccentHex` : elle ramène la clarté dans `[MIN_LIGHTNESS, MAX_LIGHTNESS]`
 * et plafonne la chroma. Tant que ce plancher tient, `--foreground` posé sur
 * n'importe quel aplat d'accent reste au-dessus d'AA.
 *
 * ⚠️ Le corollaire est l'invariant que ce test verrouille dans les deux sens :
 * l'accent est une **surface**, jamais une **encre**. Les mêmes couleurs employées
 * en texte sur `--background` tombent entre 1,2 et 2,5:1 — très en dessous d'AA.
 * Baisser `MIN_LIGHTNESS` ou peindre du texte avec l'accent casse ce test.
 */

import { describe, expect, it } from "vitest";

import { normalizeAccentHex } from "../gallery-accent.service";

// ─── Tokens de `app/globals.css`, en OKLCh ──────────────────────────────────
const FOREGROUND = { l: 0.13, c: 0.01, h: 270 };
const BACKGROUND = { l: 0.99, c: 0.005, h: 270 };

/** Seuil WCAG 1.4.3 AA pour du texte de taille normale. */
const AA_TEXT = 4.5;

// ─── Conversion OKLCh → sRGB (matrices de Björn Ottosson) ───────────────────

function gamma(x: number): number {
	return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

function oklchToRgb({
	l: L,
	c: C,
	h: H,
}: {
	l: number;
	c: number;
	h: number;
}): [number, number, number] {
	const hRad = (H * Math.PI) / 180;
	const a = C * Math.cos(hRad);
	const b = C * Math.sin(hRad);

	const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s_ = (L - 0.089484177 * a - 1.291485548 * b) ** 3;

	return [
		gamma(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
		gamma(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
		gamma(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
	].map((v) => Math.min(1, Math.max(0, v))) as [number, number, number];
}

function parseOklch(value: string): { l: number; c: number; h: number } {
	const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
	if (!match) throw new Error(`Format oklch inattendu : ${value}`);
	return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
	const lin = (channel: number) =>
		channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: { l: number; c: number; h: number }, b: typeof a): number {
	const lumA = relativeLuminance(oklchToRgb(a));
	const lumB = relativeLuminance(oklchToRgb(b));
	const hi = Math.max(lumA, lumB);
	const lo = Math.min(lumA, lumB);
	return (hi + 0.05) / (lo + 0.05);
}

/** Les 8 couleurs réellement présentes dans `prisma/seed.ts`. */
const CATALOGUE_HEXES = {
	"Or jaune": "#FFD700",
	"Or rose": "#E8B4B8",
	"Or blanc": "#F5F5F5",
	Argent: "#C0C0C0",
	Noir: "#1A1A1A",
	Perle: "#FDEEF4",
	Cristal: "#E8F4F8",
	Émeraude: "#50C878",
} as const;

describe("--piece-accent : l'accent est une surface, jamais une encre", () => {
	describe("les couleurs du catalogue, normalisées, portent du texte en --foreground", () => {
		for (const [name, hex] of Object.entries(CATALOGUE_HEXES)) {
			it(`${name} (${hex})`, () => {
				const normalized = normalizeAccentHex(hex);
				expect(normalized).not.toBeNull();

				const ratio = contrastRatio(parseOklch(normalized!), FOREGROUND);
				expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
			});
		}
	});

	it("tient sur TOUTE la plage atteignable après normalisation, pas seulement sur le seed", () => {
		// Le catalogue évolue ; c'est le domaine de sortie du service qui doit être
		// sûr, pas l'échantillon du jour. On balaie la plage bornée par
		// MIN_LIGHTNESS / MAX_LIGHTNESS / MAX_CHROMA.
		let worst = Number.POSITIVE_INFINITY;
		let worstAt = "";

		for (let l = 0.62; l <= 0.8401; l += 0.01) {
			for (let c = 0; c <= 0.1601; c += 0.01) {
				for (let h = 0; h < 360; h += 5) {
					const ratio = contrastRatio({ l, c, h }, FOREGROUND);
					if (ratio < worst) {
						worst = ratio;
						worstAt = `oklch(${l.toFixed(2)} ${c.toFixed(2)} ${h})`;
					}
				}
			}
		}

		expect(worst, `pire aplat atteignable : ${worstAt}`).toBeGreaterThanOrEqual(AA_TEXT);
	});

	it("les mêmes couleurs en ENCRE sur --background échouent — d'où l'invariant", () => {
		// Ce test n'est pas décoratif : il documente pourquoi la règle est
		// « aplat + --foreground dessus » et pas « texte coloré ». Si un jour il
		// devenait vert, c'est que la normalisation aurait assombri les accents au
		// point de ne plus être des pastels — la marque aurait changé, pas le code.
		for (const [name, hex] of Object.entries(CATALOGUE_HEXES)) {
			const normalized = normalizeAccentHex(hex);
			const asInk = contrastRatio(parseOklch(normalized!), BACKGROUND);
			expect(asInk, `${name} employé en encre`).toBeLessThan(AA_TEXT);
		}
	});

	it("une couleur achromatique reste un gris — on n'invente pas une teinte", () => {
		// Argent, Or blanc et Noir n'ont pas de teinte exploitable : la fiche se
		// repeint alors en gris neutre. C'est le coût assumé du nuancier, et il
		// doit rester visible plutôt que masqué par une teinte fabriquée.
		for (const hex of ["#C0C0C0", "#F5F5F5", "#1A1A1A"]) {
			const { c } = parseOklch(normalizeAccentHex(hex)!);
			expect(c).toBe(0);
		}
	});
});
