import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Conversion OKLCH → sRGB et contraste WCAG, pour les tests.
 *
 * ⚠️ **SSOT volontaire.** Cette arithmétique vivait en copie locale dans
 * `token-contrast.regression.test.ts`. Une seconde implémentation ailleurs, c'est
 * la garantie qu'un jour les deux divergent et qu'un seuil ment quelque part —
 * exactement ce qui s'était produit quand la version d'alors ÉCRÊTAIT les canaux
 * hors gamut au lieu de réduire le chroma : elle mesurait une autre couleur
 * (2,58 contre 2,63:1 sur la menthe), assez pour faire mentir un seuil posé à 3.
 *
 * ⚠️ **OKLab, jamais CIE Lab.** Les deux espaces ont un `L` qui ne veut pas dire
 * la même chose. La confusion est silencieuse et rend des gris trop clairs et
 * trop violacés : c'est elle qui avait mis `#1a1a2e` dans l'apparence Stripe là
 * où `oklch(0.13 0.01 270)` vaut `#06070b`.
 */

const ROOT = join(__dirname, "../..");
const GLOBALS = readFileSync(join(ROOT, "app/globals.css"), "utf8");

export type Oklch = [L: number, C: number, H: number];

/**
 * `--token: oklch(L C H)` lu dans `app/globals.css`. Ignore une éventuelle alpha.
 *
 * ⚠️ Elle ne l'ignorait PAS : `oklch\(([^)/]+)\)` exclut le `/` de la classe de
 * caractères **puis** exige la parenthèse fermante, donc aucune longueur ne
 * matchait sur `oklch(0.86 0.1 341 / 0.4)` — le helper levait
 * « Jeton introuvable ou non littéral » sur tout jeton à alpha, contre ce que son
 * propre JSDoc affirmait. Trouvé en voulant lire `--color-glow-pink` (audit du
 * premier écran, 2026-08-05) : aucun appelant n'en avait eu besoin jusque-là, donc
 * l'écart entre la doc et le code n'avait jamais eu de témoin.
 */
export function readOklch(token: string): Oklch {
	const match = new RegExp(`${token}:\\s*oklch\\(([^)]+)\\)`).exec(GLOBALS);
	if (!match?.[1]) throw new Error(`Jeton introuvable ou non littéral dans globals.css : ${token}`);
	// L'alpha est séparée par `/` — on la jette, les appelants raisonnent en opaque.
	match[1] = match[1].split("/")[0] as string;
	const parts = match[1].trim().split(/\s+/).map(Number);
	if (parts.length < 2 || parts.some(Number.isNaN)) {
		throw new Error(`Valeur oklch illisible pour ${token} : « ${match[1]} »`);
	}
	// La teinte est omise sur les gris purs (`oklch(1 0 0)` s'écrit parfois `oklch(1 0)`).
	return [parts[0] as number, parts[1] as number, parts[2] ?? 0];
}

export type Oklab = [L: number, a: number, b: number];

/** OKLCH → OKLab (coordonnées cartésiennes). */
export function oklchToOklab([L, C, hDeg]: Oklch): Oklab {
	const h = (hDeg * Math.PI) / 180;
	return [L, C * Math.cos(h), C * Math.sin(h)];
}

/** OKLab → OKLCH, pour repasser par la mise en gamut de `oklchToLinearSrgb`. */
export function oklabToOklch([L, a, b]: Oklab): Oklch {
	const hDeg = (Math.atan2(b, a) * 180) / Math.PI;
	return [L, Math.hypot(a, b), hDeg < 0 ? hDeg + 360 : hDeg];
}

/**
 * `color-mix(in oklab, <a> <ratio>%, <b>)` — interpolation LINÉAIRE en OKLab.
 *
 * ⚠️ Distinct de `blendHex`, qui composite une alpha en sRGB gamma-encodé (le
 * modèle d'un `bg-token/N`). Un `color-mix(in oklab, …)` ne passe pas par sRGB :
 * mesurer l'un avec l'autre décale la luminance, donc le ΔE et le contraste.
 */
export function mixOklab(a: Oklab, b: Oklab, ratioOfA: number): Oklab {
	return [0, 1, 2].map((i) => a[i]! * ratioOfA + b[i]! * (1 - ratioOfA)) as Oklab;
}

/**
 * ΔE OKLab — distance euclidienne dans l'espace, la métrique perceptuelle du
 * même nom. Repères mesurés sur les jetons du dépôt : `--card` vs `--background`
 * ≈ 0,011 (invisible, les cartes s'appuient sur leur ombre), `--muted` ≈ 0,050
 * (lit comme un panneau).
 */
export function deltaEOk(a: Oklab, b: Oklab): number {
	return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Conversion brute, sans mise en gamut — un canal peut en sortir hors [0, 1]. */
function oklchToLinearSrgbRaw(L: number, C: number, hDeg: number): [number, number, number] {
	const h = (hDeg * Math.PI) / 180;
	const a = C * Math.cos(h);
	const b = C * Math.sin(h);

	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

const IN_GAMUT_EPSILON = 0.0005;
const inGamut = (rgb: number[]) =>
	rgb.every((c) => c >= -IN_GAMUT_EPSILON && c <= 1 + IN_GAMUT_EPSILON);

/**
 * oklch → sRGB LINÉAIRE, avec mise en gamut à la manière des navigateurs.
 *
 * On s'arrête au linéaire à dessein : la luminance relative WCAG se calcule sur des
 * composantes linéaires, donc ré-encoder en gamma pour les décoder aussitôt
 * n'ajouterait qu'une source d'erreur d'arrondi.
 *
 * ⚠️ Un `oklch()` peut désigner une couleur HORS du gamut sRGB — l'ex-jeton
 * `--gradient-hero-to` (retiré le 2026-08-05 avec le mot d'accent dégradé)
 * demandait un chroma de 0,14 là où sRGB n'en tient que ~0,128, et c'est ce cas
 * qui a exigé cette mise en gamut. CSS Color 4 impose alors de réduire le CHROMA
 * à L et H constants ; écrêter les canaux donnerait une AUTRE couleur, donc un
 * autre ratio.
 */
export function oklchToLinearSrgb(L: number, C: number, hDeg: number): [number, number, number] {
	let chroma = C;

	if (!inGamut(oklchToLinearSrgbRaw(L, C, hDeg))) {
		let lo = 0;
		let hi = C;
		// 40 bissections : la précision dépasse largement celle d'un canal 8 bits.
		for (let i = 0; i < 40; i++) {
			const mid = (lo + hi) / 2;
			if (inGamut(oklchToLinearSrgbRaw(L, mid, hDeg))) lo = mid;
			else hi = mid;
		}
		chroma = lo;
	}

	// Filet de sécurité : absorbe l'epsilon de la bissection, jamais un vrai dépassement.
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	const [r, g, b] = oklchToLinearSrgbRaw(L, chroma, hDeg);
	return [clamp(r), clamp(g), clamp(b)];
}

/** Encodage gamma sRGB d'un canal linéaire. */
const encodeGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
/** Décodage gamma sRGB d'un canal 0-255. */
const decodeGamma = (v: number) => {
	const c = v / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** oklch → `#rrggbb`, la forme qu'exigent les `Appearance` de Stripe. */
export function oklchToHex(L: number, C: number, hDeg: number): string {
	const channels = oklchToLinearSrgb(L, C, hDeg)
		.map((c) => Math.round(encodeGamma(c) * 255))
		.map((v) => v.toString(16).padStart(2, "0"));
	return `#${channels.join("")}`;
}

/** `#rrggbb` → sRGB linéaire. */
function hexToLinearSrgb(hex: string): [number, number, number] {
	const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
	if (!m?.[1]) throw new Error(`Hex illisible : « ${hex} »`);
	const int = parseInt(m[1], 16);
	return [decodeGamma((int >> 16) & 255), decodeGamma((int >> 8) & 255), decodeGamma(int & 255)];
}

export function relativeLuminance([r, g, b]: [number, number, number]): number {
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre deux couleurs données en sRGB linéaire. */
export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	const [hi, lo] = la > lb ? [la, lb] : [lb, la];
	return (hi + 0.05) / (lo + 0.05);
}

/** Ratio entre deux hex. */
export const contrastHex = (a: string, b: string) =>
	contrastRatio(hexToLinearSrgb(a), hexToLinearSrgb(b));

/**
 * Aplatit `color` posée à `alpha` sur `over` — l'équivalent d'un `bg-token/N`.
 * Le mélange se fait en sRGB **gamma-encodé**, comme le compositing d'un
 * navigateur, pas en linéaire.
 */
export function blendHex(color: string, over: string, alpha: number): string {
	const parse = (hex: string) => {
		const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
		if (!m?.[1]) throw new Error(`Hex illisible : « ${hex} »`);
		const int = parseInt(m[1], 16);
		return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
	};
	const [fr, fg, fb] = parse(color) as [number, number, number];
	const [br, bg, bb] = parse(over) as [number, number, number];
	const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
	return `#${[mix(fr, br), mix(fg, bg), mix(fb, bb)]
		.map((v) => v.toString(16).padStart(2, "0"))
		.join("")}`;
}
