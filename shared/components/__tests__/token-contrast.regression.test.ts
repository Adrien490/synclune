/**
 * @regression token-contrast
 *
 * Les jetons de couleur qui portent une INFORMATION doivent atteindre le seuil WCAG.
 *
 * ## Pourquoi ce test existe
 *
 * Rien, dans tout l'outillage du dépôt, ne mesurait un contraste. axe-core (lancé par
 * `admin-accessibility.spec.ts`) ne teste **ni** les indicateurs de focus **ni** les
 * indicateurs d'état d'un contrôle : il regarde le texte. Deux défauts ont donc vécu
 * longtemps sans qu'aucune suite ne rougisse —
 *
 * - le point du radio et la case cochée peints en `--primary`, un rose pastel à
 *   **1,6:1** sur une carte blanche, alors que WCAG 1.4.11 exige 3:1 pour l'état
 *   d'un composant d'interface ;
 * - et, pire, ce même `--primary` posé sur un aplat `bg-primary` dans la barre
 *   d'établi du formulaire de création, soit **1:1** — jeton identique, indicateur
 *   littéralement invisible au moment de publier.
 *
 * Le premier était antérieur, le second a été introduit par une refonte et n'a été
 * trouvé qu'au ré-audit. D'où ce filet : il fait le calcul, sur les valeurs réelles
 * de `app/globals.css`, plutôt que de faire confiance à l'œil.
 *
 * ## Ce qu'il vérifie
 *
 * 1. Les ratios eux-mêmes, en convertissant les `oklch()` du fichier en sRGB linéaire.
 * 2. Que les deux contrôles à état n'ont pas re-glissé vers `--primary` — un test
 *    numérique seul ne verrait pas un composant qui change de jeton.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../..");
const GLOBALS = readFileSync(join(ROOT, "app/globals.css"), "utf8");

/** `--token: oklch(L C H)` → [L, C, H]. Ignore une éventuelle composante alpha. */
function readOklch(token: string): [number, number, number] {
	const match = new RegExp(`${token}:\\s*oklch\\(([^)/]+)\\)`).exec(GLOBALS);
	if (!match?.[1]) throw new Error(`Jeton introuvable ou non littéral dans globals.css : ${token}`);
	const parts = match[1].trim().split(/\s+/).map(Number);
	if (parts.length < 2 || parts.some(Number.isNaN)) {
		throw new Error(`Valeur oklch illisible pour ${token} : « ${match[1]} »`);
	}
	// La teinte est omise sur les gris purs (`oklch(1 0 0)` s'écrit parfois `oklch(1 0)`).
	return [parts[0] as number, parts[1] as number, parts[2] ?? 0];
}

/**
 * oklch → sRGB LINÉAIRE.
 *
 * On s'arrête au linéaire à dessein : la luminance relative WCAG se calcule sur des
 * composantes linéaires, donc ré-encoder en gamma pour les décoder aussitôt
 * n'ajouterait qu'une source d'erreur d'arrondi.
 */
function oklchToLinearSrgb(L: number, C: number, hDeg: number): [number, number, number] {
	const h = (hDeg * Math.PI) / 180;
	const a = C * Math.cos(h);
	const b = C * Math.sin(h);

	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	return [
		clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	];
}

function luminance(token: string): number {
	const [r, g, b] = oklchToLinearSrgb(...readOklch(token));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(tokenA: string, tokenB: string): number {
	const a = luminance(tokenA);
	const b = luminance(tokenB);
	const [hi, lo] = a > b ? [a, b] : [b, a];
	return (hi + 0.05) / (lo + 0.05);
}

describe("@regression token-contrast", () => {
	it("convertit correctement l'oklch — étalonnage sur des couples connus", () => {
		// Garde-fou du garde-fou : si la conversion dérive, tous les seuils ci-dessous
		// deviennent du bruit. Ces deux ratios ont été relevés au navigateur
		// (échantillonnage canvas sur l'application en marche, 2026-08-04).
		expect(contrast("--foreground", "--background")).toBeCloseTo(19.6, 0);
		expect(contrast("--muted-foreground", "--background")).toBeCloseTo(7.2, 0);
	});

	describe("indicateurs d'état — seuil 3:1 (WCAG 1.4.11)", () => {
		it("le rose profond se détache d'une carte blanche", () => {
			expect(contrast("--color-brand-rose-strong", "--card")).toBeGreaterThanOrEqual(3);
		});

		it("le rose profond se détache du fond de page", () => {
			expect(contrast("--color-brand-rose-strong", "--background")).toBeGreaterThanOrEqual(3);
		});

		it("le rose PASTEL ne peut pas jouer ce rôle — c'est la raison d'être du jeton profond", () => {
			// Documente le pourquoi : si un jour `--primary` passait ce seuil, le jeton
			// `--color-brand-rose-strong` deviendrait un doublon et devrait être retiré.
			expect(contrast("--primary", "--card")).toBeLessThan(3);
		});
	});

	describe("aplats de marque — l'encre doit tenir dessus", () => {
		it.each([
			["--primary", 4.5],
			["--secondary", 4.5],
			["--color-brand-lavender", 4.5],
			["--color-brand-mint", 4.5],
			["--color-brand-sun", 4.5],
		])("%s porte --foreground au-dessus de %s:1", (token, threshold) => {
			expect(contrast("--foreground", token)).toBeGreaterThanOrEqual(threshold);
		});
	});

	describe("les contrôles à état n'ont pas re-glissé vers le pastel", () => {
		it.each([
			["shared/components/ui/radio-group.tsx", "text-brand-rose-strong"],
			["shared/components/ui/checkbox.tsx", "data-checked:bg-brand-rose-strong"],
		])("%s peint son état en rose profond", (relPath, expectedClass) => {
			const code = readFileSync(join(ROOT, relPath), "utf8");
			expect(code).toContain(expectedClass);
		});

		it("le point du radio n'est plus en text-primary", () => {
			const code = readFileSync(join(ROOT, "shared/components/ui/radio-group.tsx"), "utf8");
			expect(code).not.toMatch(/className="[^"]*\btext-primary\b/);
		});
	});
});
