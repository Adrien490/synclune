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

import { oklchToLinearSrgb, readOklch, relativeLuminance } from "@/test/utils/oklch";

const ROOT = join(__dirname, "../../..");

/*
 * ⚠️ La conversion OKLab → sRGB et le calcul de contraste vivent en SSOT dans
 * `test/utils/oklch.ts`. Ils étaient en copie locale ici ; une seconde
 * implémentation ailleurs (l'apparence Stripe en avait besoin) aurait garanti
 * qu'un jour les deux divergent et qu'un seuil mente quelque part.
 */
const luminance = (token: string) => relativeLuminance(oklchToLinearSrgb(...readOklch(token)));

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

	/*
	 * ⚠️ Le bloc « mot d'accent du h1 — seuil 3:1 grand texte » a été RETIRÉ le
	 * 2026-08-05 avec la direction B « Le surligneur » : les tokens
	 * `--gradient-hero-*`, l'utility `.text-gradient-multicolor` et son halo
	 * n'existent plus — la couleur du mot vit dans un trait de pinceau pastel
	 * DERRIÈRE une encre `--foreground` (`etal/brush-highlight.tsx`).
	 *
	 * Il n'y a donc plus d'encre spéciale à borner : le cas « encre sur pastel »
	 * du trait est exactement le bloc « aplats de marque » ci-dessus
	 * (`--foreground` ≥ 4,5:1 sur chacun des quatre accents), et le trait
	 * lui-même est décoratif (aria-hidden, masqué sous prefers-contrast: more
	 * et forced-colors).
	 *
	 * Ne pas réintroduire un dégradé DANS un glyphe sans recréer ce bloc — ses
	 * trois leçons, payées une par une : (1) un dégradé se mesure sur toute sa
	 * COURSE, pas sur ses stops (menthe à 2,63:1 sur les ~10 % finaux du mot) ;
	 * (2) le fond réel d'un glyphe à text-shadow est le HALO, pas la page
	 * (menthe 2,964:1 sur halo à l'alpha 0,4) ; (3) le helper lit ~0,10 point
	 * trop haut hors gamut — seuil à 3,1, jamais 3,0. Le bloc complet est dans
	 * git à ce commit.
	 */

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

		/**
		 * ⚠️ Ce test a été écrit POUR ce défaut — « le point du radio et la case cochée
		 * peints en `--primary`, un rose pastel à 1,6:1 » — mais il n'assertait que sur
		 * `ui/radio-group.tsx` et `ui/checkbox.tsx`. Le sélecteur de variante du panier
		 * réimplémentait ses propres radios à la main : il a gardé le bug intact
		 * pendant toute la vie du correctif (`border-primary`, `bg-primary/5`,
		 * `CheckIcon text-primary`, plus un focus en `outline-ring`).
		 *
		 * La leçon vaut au-delà du panier : sur toute correction de composant partagé,
		 * la question à poser est « où sont les copies ? ». Depuis le passage à une
		 * ligne par pièce, l'état s'y lit par la FORME — anneau `--foreground` (19,54:1)
		 * — donc aucun rose n'a plus à porter d'information.
		 */
		it.each([
			"modules/cart/components/variant-selector-pieces.tsx",
			"modules/cart/components/variant-selector-piece-row.tsx",
			"modules/cart/components/variant-selector-quantity.tsx",
		])("%s ne peint aucun état en --primary", (relPath) => {
			const code = readFileSync(join(ROOT, relPath), "utf8");
			expect(code).not.toMatch(/\b(border|bg|text|ring|outline)-primary\b/);
		});
	});
});
