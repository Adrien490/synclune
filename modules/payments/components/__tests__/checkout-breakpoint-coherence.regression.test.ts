import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression checkout-breakpoint-coherence-2026-07-26
 *
 * La grille du checkout ne passe à deux colonnes qu'à `lg`
 * (`lg:grid-cols-[1fr_360px]`), mais quatre décisions couplées basculaient à `md` :
 *
 *  - `checkout-summary` : collapsible mobile → sidebar collante (`md:hidden` /
 *    `hidden md:block md:sticky`) ;
 *  - `pay-button` : barre CTA `fixed` → `md:static` ;
 *  - `checkout-form-body` : réserve de la barre levée en `md:pb-0` ;
 *  - `app/globals.css` : `scroll-padding-bottom` annulé à `48rem`, et le gate
 *    `[data-hide-on-keyboard]` limité à `< 48rem`.
 *
 * Résultat entre 48 et 64rem — **iPad portrait 768×1024, viewport explicitement
 * ciblé (CLAUDE.md)** : le résumé s'affichait DÉPLIÉ en pleine largeur au-dessus du
 * formulaire (donc tout le formulaire sous la ligne de flottaison), la barre CTA
 * restait `fixed` sans réserve (elle recouvrait le bas du formulaire) et ne se
 * rétractait plus à l'ouverture du clavier.
 *
 * Ces cinq sites doivent bouger ENSEMBLE. Audit UI/UX paiement 2026-07-26, F5.
 */

const REPO_ROOT = process.cwd();

const TSX_FILES = [
	"modules/payments/components/checkout-summary.tsx",
	"modules/payments/components/pay-button.tsx",
	"modules/payments/components/checkout-form-body.tsx",
	"app/paiement/loading.tsx",
];

/** Variants de layout dont la valeur doit être `lg`, jamais `md`. */
const FORBIDDEN_MD_VARIANTS =
	/\bmd:(hidden|block|static|sticky|top-\d|pb-0|border-0|bg-transparent|p-0|shadow-none|backdrop-blur-none)\b/;

function read(relativePath: string): string {
	return readFileSync(join(REPO_ROOT, relativePath), "utf-8");
}

/** Les commentaires citent volontairement l'ancien seuil : ne pas les scanner. */
function stripComments(source: string): string {
	return source
		.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");
}

describe("Checkout — cohérence des breakpoints (tout sur lg)", () => {
	it("le regex de détection mord réellement (garde-fou du garde-fou)", () => {
		expect(FORBIDDEN_MD_VARIANTS.test('className="hidden md:block md:sticky md:top-24"')).toBe(
			true,
		);
		expect(FORBIDDEN_MD_VARIANTS.test('className="hidden lg:block lg:sticky lg:top-8"')).toBe(
			false,
		);
		// Ne doit PAS mordre sur un variant de typo/espacement légitime.
		expect(FORBIDDEN_MD_VARIANTS.test('className="md:text-sm md:py-10 md:scroll-mt-28"')).toBe(
			false,
		);
	});

	for (const file of TSX_FILES) {
		it(`${file} n'utilise aucun variant de layout md:`, () => {
			const stripped = stripComments(read(file));
			const offendingLines = stripped
				.split("\n")
				.filter((line) => FORBIDDEN_MD_VARIANTS.test(line))
				.map((line) => line.trim());

			expect(offendingLines).toEqual([]);
		});
	}

	it("checkout-summary bascule bien sur lg (les deux branches)", () => {
		const stripped = stripComments(read("modules/payments/components/checkout-summary.tsx"));
		expect(stripped).toMatch(/className="lg:hidden"/);
		expect(stripped).toMatch(/lg:sticky/);
		expect(stripped).toMatch(/lg:block/);
	});

	it("pay-button garde la barre fixed jusqu'à lg", () => {
		const stripped = stripComments(read("modules/payments/components/pay-button.tsx"));
		expect(stripped).toMatch(/fixed inset-x-0 bottom-0/);
		expect(stripped).toMatch(/lg:static/);
	});

	describe("app/globals.css", () => {
		const css = read("app/globals.css");

		it("annule le scroll-padding du checkout à 64rem, pas 48rem", () => {
			// Bloc ciblant [data-checkout-shell] : on isole la media query qui le contient.
			const block = css.match(
				/@media \(width >= (\d+)rem\) \{\s*(?:\/\*[\s\S]*?\*\/\s*)?html:has\(\[data-checkout-shell\]\)/,
			);
			expect(block).not.toBeNull();
			expect(block![1]).toBe("64");
		});

		it("gate [data-hide-on-keyboard] à 64rem, pas 48rem", () => {
			const block = css.match(
				/@media \(width < (\d+)rem\) \{\s*html\[data-keyboard="open"\] \[data-hide-on-keyboard\]/,
			);
			expect(block).not.toBeNull();
			expect(block![1]).toBe("64");
		});

		it("exprime ces seuils en rem et en syntaxe range MQ4 (pas de px, pas de max-width)", () => {
			// Contrainte repo (CLAUDE.md + no-px-media-query.regression.test.ts).
			for (const selector of ["data-checkout-shell", "data-hide-on-keyboard"]) {
				const index = css.indexOf(selector);
				expect(index).toBeGreaterThan(-1);
				const preceding = css.slice(Math.max(0, index - 400), index);
				expect(preceding).not.toMatch(/@media[^{]*\d+px/);
				expect(preceding).not.toMatch(/@media[^{]*max-width/);
			}
		});
	});
});
