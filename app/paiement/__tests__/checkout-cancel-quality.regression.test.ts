/**
 * @regression checkout-cancel-quality
 *
 * Garantit la qualité a11y/SSOT de /paiement/annulation :
 * - `role="note"` invalide retiré (n'existe pas en ARIA 1.x) — utiliser `<aside aria-label>`
 * - BRAND.contact.email utilisé (pas de mailto: hardcodé)
 * - Conseil contextuel colocalisé via `errorInfo.advice` (pas de chaîne de
 *   conditions `reason === "card_declined"` inline)
 * - Validation Zod du searchParam `reason` via `CHECKOUT_CANCEL_REASONS`
 * - Reassurance "panier sauvegardé" présente une seule fois (pas de doublon)
 *
 * Si ce test casse : ne PAS restaurer le role=note ni hardcoder l'email.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cancelPage = readFileSync(join(__dirname, "..", "annulation", "page.tsx"), "utf8");
const cancelMessages = readFileSync(
	join(
		__dirname,
		"..",
		"..",
		"..",
		"modules",
		"payments",
		"constants",
		"checkout-cancel-messages.ts",
	),
	"utf8",
);

describe("checkout cancel page quality (regression)", () => {
	it('ne contient plus role="note" invalide', () => {
		expect(cancelPage).not.toMatch(/role="note"/);
	});

	it('utilise <aside aria-label="Conseil"> pour le bloc advice', () => {
		expect(cancelPage).toMatch(/<aside\s+aria-label="Conseil"/);
	});

	it("utilise BRAND.contact.email (pas de mailto: hardcodé)", () => {
		expect(cancelPage).toMatch(/import \{ BRAND \} from "@\/shared\/constants\/brand"/);
		expect(cancelPage).toMatch(/mailto:\$\{BRAND\.contact\.email\}/);
		expect(cancelPage).not.toMatch(/mailto:contact@synclune\.fr/);
	});

	it("valide reason via z.enum(CHECKOUT_CANCEL_REASONS)", () => {
		expect(cancelPage).toMatch(/z\.enum\(CHECKOUT_CANCEL_REASONS\)/);
		expect(cancelPage).toMatch(/import \{[^}]*CHECKOUT_CANCEL_REASONS[^}]*\}/);
	});

	it("le parse des searchParams est tolérant champ par champ (reason invalide ≠ référence perdue)", () => {
		// Sans `.catch(undefined)` par champ, un `reason` hors enum faisait échouer
		// le parse de l'objet ENTIER : la référence de commande disparaissait de
		// l'affichage alors qu'elle était valide. Audit UI/UX 2026-08-03.
		expect(cancelPage).toMatch(
			/reason:\s*z\.enum\(CHECKOUT_CANCEL_REASONS\)\.optional\(\)\.catch\(undefined\)/,
		);
	});

	it('ne contient plus de chaîne de reason === "..." inline (advice colocalisé)', () => {
		// Plus aucune occurrence de chaîne reason === "X" dans la page
		expect(cancelPage).not.toMatch(/reason === "card_declined"/);
		expect(cancelPage).not.toMatch(/reason === "insufficient_funds"/);
		expect(cancelPage).not.toMatch(/reason === "authentication_failed"/);
	});

	it("la reassurance \"panier sauvegardé\" n'apparaît qu'une seule fois en texte utilisateur", () => {
		// Strip line/block comments avant comptage pour ignorer les JSDoc
		const codeOnly = cancelPage
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
			.replace(/\/\/.*$/gm, "");
		const matches = codeOnly.match(/sauvegardé/g) ?? [];
		expect(matches.length).toBe(1);
	});

	it("CHECKOUT_CANCEL_MESSAGES expose un champ advice optionnel sur certaines raisons", () => {
		expect(cancelMessages).toMatch(/advice\?:\s*string/);
		// Au moins card_declined et canceled doivent avoir un advice
		expect(cancelMessages).toMatch(/card_declined:[\s\S]*?advice:/);
		expect(cancelMessages).toMatch(/canceled:[\s\S]*?advice:/);
	});
});
