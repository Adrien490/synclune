/**
 * @regression checkout-confirmation-a11y
 *
 * Garantit la qualité sémantique et SSOT de la page /paiement/confirmation :
 * - liste des articles commandés en `<ul role="list">` + `<li>` (iOS Safari + VO
 *   droppent le rôle implicite quand `list-style:none` est appliqué)
 * - email de contact via BRAND.contact.email (SSOT) — pas de mailto: hardcodé
 * - lien externe reçu Stripe : annonce sr-only "(ouvre dans un nouvel onglet)"
 *   (WCAG 3.2.5 + G201)
 * - bouton reçu rendu via <Suspense> + sous-composant ReceiptButton (TTFB non
 *   bloqué par paymentIntents.retrieve)
 * - date de commande affichée (formatDateLong)
 *
 * Si ce test casse : ne PAS dégrader la sémantique. Réimporter BRAND si
 * `mailto:` hardcodé réintroduit, restaurer ul/li si div, etc.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const confirmationPage = readFileSync(join(__dirname, "..", "confirmation", "page.tsx"), "utf8");
const receiptButton = readFileSync(
	join(__dirname, "..", "confirmation", "_components", "receipt-button.tsx"),
	"utf8",
);

describe("checkout confirmation a11y (regression)", () => {
	it('liste des articles commandés en <ul role="list"> + <li>', () => {
		expect(confirmationPage).toMatch(/<ul role="list"/);
		expect(confirmationPage).toMatch(/<li key=\{item\.skuId\}/);
		// eslint-disable nécessaire (jsx-a11y/no-redundant-roles)
		expect(confirmationPage).toMatch(/eslint-disable-next-line jsx-a11y\/no-redundant-roles/);
	});

	it("utilise BRAND.contact.email (pas de mailto: hardcodé)", () => {
		expect(confirmationPage).toMatch(/import \{ BRAND \} from "@\/shared\/constants\/brand"/);
		expect(confirmationPage).toMatch(/mailto:\$\{BRAND\.contact\.email\}/);
		expect(confirmationPage).not.toMatch(/mailto:contact@synclune\.fr/);
	});

	it("le bouton reçu Stripe est isolé en Suspense + sous-composant", () => {
		expect(confirmationPage).toMatch(/import \{ Suspense \} from "react"/);
		expect(confirmationPage).toMatch(/<Suspense fallback=\{null\}>/);
		expect(confirmationPage).toMatch(/<ReceiptButton stripePaymentIntentId=/);
		// Plus de stripe.paymentIntents.retrieve dans la page principale
		expect(confirmationPage).not.toMatch(/stripe\.paymentIntents\.retrieve/);
	});

	it('le lien externe reçu Stripe annonce SR "(ouvre dans un nouvel onglet)"', () => {
		expect(receiptButton).toMatch(
			/<span className="sr-only">\(ouvre dans un nouvel onglet\)<\/span>/,
		);
		expect(receiptButton).toMatch(/target="_blank"/);
		expect(receiptButton).toMatch(/rel="noopener noreferrer"/);
	});

	it("la date de commande est affichée via formatDateLong(order.createdAt)", () => {
		expect(confirmationPage).toMatch(/import \{ formatDateLong \} from "@\/shared\/utils\/dates"/);
		expect(confirmationPage).toMatch(/formatDateLong\(order\.createdAt\)/);
	});

	it("NEXT_STEPS est hoisté en const (pas de duplication step inline)", () => {
		expect(confirmationPage).toMatch(/const NEXT_STEPS: readonly NextStep\[\]/);
		expect(confirmationPage).toMatch(/NEXT_STEPS\.map\(/);
	});
});
