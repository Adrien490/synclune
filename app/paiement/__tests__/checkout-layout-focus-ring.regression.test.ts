/**
 * @regression checkout-layout-focus-ring
 *
 * Garantit que le `/paiement/layout` :
 * - N'ajoute **aucun** lien d'évitement — `<SkipLink />` est monté à la racine
 *   (`app/layout.tsx`) et couvre déjà cette route.
 * - Le décor de fond fixed est hoisté dans le layout (pas dupliqué dans
 *   confirmation/annulation).
 *
 * ## Ce que ce test gardait AVANT, et pourquoi il a changé
 *
 * Il exigeait que le skip-link **local** du layout utilise `focus-ring` plutôt
 * qu'un stack `ring-2 ring-offset-2` brut. C'était vrai, mais ça verrouillait le
 * mauvais invariant : ce skip-link n'aurait jamais dû exister. L'audit a11y du
 * 2026-08-07 a mesuré **deux** liens d'évitement en tête de l'ordre de tabulation
 * de `/paiement`, pointant tous deux vers `#main-content` avec des libellés
 * différents — « Aller au contenu principal » (racine) puis « Aller au contenu »
 * (local). Le test garantissait la qualité du doublon au lieu d'interdire le
 * doublon.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const layout = readFileSync(join(__dirname, "..", "layout.tsx"), "utf8");
const confirmationPage = readFileSync(join(__dirname, "..", "confirmation", "page.tsx"), "utf8");
const cancelPage = readFileSync(join(__dirname, "..", "annulation", "page.tsx"), "utf8");

/** Le code du layout, commentaires exclus (ils CITENT `#main-content`). */
const layoutCode = layout.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/\/\/.*$/gm, "");

describe("checkout layout focus-ring SSOT (regression)", () => {
	it("n'ajoute PAS un second lien d'évitement", () => {
		expect(
			layoutCode,
			"Le layout paiement remonte un lien d'évitement alors que <SkipLink /> " +
				"est déjà monté à la racine : deux liens vers #main-content se suivent " +
				"dans l'ordre de tabulation.",
		).not.toMatch(/href="#main-content"/);
	});

	it("expose bien la cible du lien d'évitement racine", () => {
		// Le `<SkipLink />` racine pointe sur `#main-content` : la cible doit exister
		// ici, et rester focusable programmatiquement.
		expect(layoutCode).toMatch(/<main id="main-content" tabIndex=\{-1\}/);
	});

	it("le décor de fond est rendu dans le layout (hoist)", () => {
		expect(layout).toMatch(/from-primary\/5 to-secondary\/5[^"]*fixed inset-0 -z-10/);
	});

	it("le décor de fond n'est PLUS dupliqué dans confirmation/annulation", () => {
		expect(confirmationPage).not.toMatch(/from-primary\/5 to-secondary\/5 fixed inset-0/);
		expect(cancelPage).not.toMatch(/from-primary\/5 to-secondary\/5 fixed inset-0/);
	});
});
