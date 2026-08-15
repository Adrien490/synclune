/**
 * @regression checkout-a11y-gate-is-armed-2026-08-07
 *
 * Les audits axe du tunnel doivent porter sur le VRAI formulaire, pas sur l'état
 * « Ton panier est vide ».
 *
 * ## Le bug que ce test verrouille
 *
 * `e2e/checkout-accessibility.spec.ts` gardait ses deux audits (clair et sombre)
 * derrière :
 *
 * ```ts
 * if (!page.url().includes("paiement")) { test.skip(true, "Panier vide - redirection"); return; }
 * ```
 *
 * La prémisse est fausse : `app/paiement/page.tsx` **ne redirige pas** sur panier
 * vide, il rend un état vide en RESTANT sur `/paiement` (son commentaire le dit :
 * « render a friendly empty state instead of a silent redirect »). La garde valait
 * donc toujours `false`, aucun `beforeEach` ne remplissait le panier, et axe
 * analysait une page à **zéro champ et zéro bouton payer** — mesuré au rendu le
 * 2026-08-07.
 *
 * Résultat : le formulaire de checkout — 8 champs, résumé d'erreurs, barre CTA
 * fixe — n'a jamais été audité par axe en CI, alors que deux tests portant son nom
 * étaient verts. Même mécanique dans `keyboard-purchase-flow.spec.ts`, dont le
 * test de validation clavier `test.skip`ait faute de bouton de soumission.
 *
 * C'est la famille « vert pour la mauvaise raison » : le test ne pouvait pas dire
 * qu'il ne testait rien.
 *
 * ## Ce qui est exigé ici
 *
 * 1. Aucune garde de skip fondée sur `page.url()` dans les specs a11y du tunnel —
 *    c'est le motif qui a rendu le gate inerte.
 * 2. Chaque spec qui audite `/paiement` sème le panier via `gotoWithSeededCart`.
 * 3. `gotoWithSeededCart` porte une **assertion positive** sur la présence du
 *    formulaire. Sans elle, un changement du parcours d'ajout au panier ferait
 *    silencieusement retomber l'audit sur l'état vide.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const E2E = join(__dirname, "..");

const CHECKOUT_A11Y_SPEC = join(E2E, "checkout-accessibility.spec.ts");
const KEYBOARD_SPEC = join(E2E, "keyboard-purchase-flow.spec.ts");
const CHECKOUT_PAGE_OBJECT = join(E2E, "pages", "checkout.page.ts");

const read = (path: string) => readFileSync(path, "utf-8");

/** `if (!page.url().includes(...)) { test.skip(...) }` et ses variantes. */
const URL_BASED_SKIP = /page\.url\(\)[^\n]*\n?[^\n]*test\.skip/;

describe("Le gate a11y du checkout est armé", () => {
	it("n'utilise plus de garde de skip fondée sur page.url() dans les specs du tunnel", () => {
		for (const path of [CHECKOUT_A11Y_SPEC, KEYBOARD_SPEC]) {
			const source = read(path);
			expect(
				URL_BASED_SKIP.test(source),
				`${path} garde un skip fondé sur page.url(). ` +
					"/paiement ne redirige PAS sur panier vide : cette garde est toujours fausse " +
					"et laisse l'audit porter sur l'état « Ton panier est vide ».",
			).toBe(false);
		}
	});

	it("sème le panier dans chaque spec qui audite /paiement", () => {
		for (const path of [CHECKOUT_A11Y_SPEC, KEYBOARD_SPEC]) {
			const source = read(path);
			if (!source.includes("/paiement")) continue;
			// Deux façons LÉGITIMES d'arriver sur /paiement avec un panier plein :
			// - `gotoWithSeededCart` (page object, assertion positive incluse) ;
			// - le parcours clavier COMPLET (keyboard-purchase-flow, lot 7) : le
			//   spec ajoute un article AU CLAVIER puis suit le lien du sheet panier
			//   — semer par raccourci détruirait son sujet. Son garde-fou est
			//   l'assertion positive sur le formulaire, exigée ci-dessous.
			const seedsViaHelper = source.includes("gotoWithSeededCart");
			const seedsViaKeyboardJourney =
				source.includes("waitForURL(/\\/paiement/)") &&
				/expect\(countrySelect\)\.toBeFocused|expect\(payButton\)\.toBeVisible/.test(source);
			expect(
				seedsViaHelper || seedsViaKeyboardJourney,
				`${path} visite /paiement sans semer le panier — il auditerait l'état vide.`,
			).toBe(true);
		}
	});

	it("assert POSITIVEMENT la présence du formulaire avant d'auditer", () => {
		const source = read(CHECKOUT_PAGE_OBJECT);

		// L'assertion est le garde-fou : sans elle, l'audit retombe en silence sur
		// l'état vide dès que le parcours d'ajout au panier change. Depuis le
		// checkout HÉBERGÉ (lot 3), les marqueurs du vrai récapitulatif sont le
		// select de pays et le bouton « Payer avec Stripe » (plus d'emailInput —
		// la page n'a plus aucun champ d'adresse ni de carte).
		expect(source).toMatch(/expect\(this\.countrySelect\)\.toBeVisible/);
		expect(source).toMatch(/expect\(this\.emptyCartMessage\)\.toHaveCount\(0\)/);
		expect(source).toMatch(/expect\(this\.payButton\)\.toBeVisible/);
	});
});
