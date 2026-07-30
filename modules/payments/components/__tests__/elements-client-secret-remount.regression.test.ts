import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression elements-client-secret-remount-2026-07-30
 *
 * `<Elements>` était monté sans `key`, alors que `clientSecret` est une prop
 * IMMUABLE : react-stripe-js l'exclut de `elements.update()`, donc un changement est
 * silencieusement ignoré et les champs carte restent attachés à l'ANCIEN
 * PaymentIntent.
 *
 * Conséquence : au retour d'un onglet caché >10 min, `usePaymentIntent` re-initialise
 * et Stripe peut rendre un PI différent (clé salée `-r2` de CHECKOUT-REPLAY-001, ou
 * expiration 24 h de la clé d'idempotence) ; l'ancien est alors annulé par
 * `cancelOrphanPaymentIntent`. `confirmCheckout` liait la commande au NOUVEAU PI et
 * `stripe.confirmPayment` confirmait l'ANCIEN, déjà annulé → erreur dure, commande
 * PENDING orpheline, aucun débit, sortie impossible sans rechargement complet.
 *
 * ## Pourquoi une assertion de SOURCE et pas un test de montage
 *
 * Monter `<Elements>` pour de vrai exige `loadStripe()`, donc le réseau. Et le mocker
 * reviendrait à simuler la bibliothèque dont on teste précisément la contrainte
 * d'immutabilité — un mock rendrait le test aveugle à la seule chose qui compte.
 * On verrouille donc les deux moitiés de l'invariant :
 *  1. notre call site porte bien la `key` ;
 *  2. la prémisse bibliothèque (clientSecret immuable) est toujours vraie dans la
 *     version installée — si elle tombe, ce test le dit au lieu de laisser la `key`
 *     passer pour une décoration qu'un futur nettoyage retirerait.
 */

const REPO_ROOT = process.cwd();
const SECTION_PATH = join(REPO_ROOT, "modules/payments/components/checkout-stripe-section.tsx");

/** Retire commentaires de bloc et de ligne — le call site est très commenté. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("Checkout — <Elements> remonté quand le clientSecret change", () => {
	const source = stripComments(readFileSync(SECTION_PATH, "utf-8"));

	it("le call site <Elements> porte key={clientSecret}", () => {
		// Match l'ouverture de balise jusqu'au premier `>`, `key` où qu'elle soit.
		const elementsTag = source.match(/<Elements\b[^>]*>/);
		expect(elementsTag, "aucun <Elements> trouvé dans checkout-stripe-section.tsx").not.toBeNull();
		expect(elementsTag![0]).toMatch(/key=\{clientSecret\}/);
	});

	it("clientSecret est toujours passé en option à <Elements> (la key ne le remplace pas)", () => {
		expect(source).toMatch(/options=\{\{[\s\S]*?clientSecret[\s\S]*?\}\}/);
	});

	it("react-stripe-js traite toujours clientSecret comme une option IMMUABLE", () => {
		// Prémisse du correctif. Si une future version rend clientSecret mutable, ce test
		// tombe : re-vérifier alors si la key reste nécessaire AVANT de la retirer.
		// Résolution du point d'entrée du paquet : la carte `exports` de
		// @stripe/react-stripe-js interdit les sous-chemins `dist/*`.
		const require_ = createRequire(import.meta.url);
		const lib = readFileSync(require_.resolve("@stripe/react-stripe-js"), "utf-8");

		expect(lib).toMatch(
			/extractAllowedOptionsUpdates\([^)]*\[\s*'clientSecret'\s*,\s*'fonts'\s*\]/,
		);
	});
});
