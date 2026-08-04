import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression locked-amount-address-editable-2026-07-30
 *
 * Le serveur sait désormais répercuter une correction d'adresse sur une commande encore
 * PENDING (KI-001, `updatePendingOrderShippingSnapshot`). Ce chemin de réparation n'a de
 * valeur que s'il est ATTEIGNABLE : tant que le verrou de montant enfermait Contact +
 * Livraison dans un `<fieldset disabled>`, le client ne pouvait plus toucher à sa rue —
 * exactement le scénario du défaut (faute de frappe, carte refusée, plus aucun recours),
 * et la capacité serveur n'était joignable que par accident (deux onglets).
 *
 * C'est le motif « mécanisme construit, testé, jamais branché » : ce test le verrouille
 * des deux côtés.
 *
 * Le périmètre du gel est une DÉCISION, pas un détail : seuls `country` et `postalCode`
 * déterminent le tarif d'expédition, donc le montant. Les geler eux, et eux seuls, est ce
 * qui rend la correction sûre — `resolveIdempotentHit` refuse toute divergence de
 * destination, et accepte le reste.
 *
 * Assertions de source (et non de rendu) : monter `CheckoutFormBody` exige Stripe
 * Elements, TanStack Form et le panier complet — le mock nécessaire serait plus fragile
 * que le contrat vérifié ici.
 */

const REPO_ROOT = process.cwd();

function readSource(rel: string): string {
	return readFileSync(join(REPO_ROOT, rel), "utf-8");
}

/** Retire les commentaires : les deux fichiers documentent longuement ce contrat. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

const BODY = "modules/payments/components/checkout-form-body.tsx";
const FIELDS = "modules/payments/components/checkout-address-fields.tsx";

describe("Verrou de montant — l'adresse reste corrigeable", () => {
	it("le fieldset disabled n'enferme PLUS les sections Contact et Livraison", () => {
		const source = stripComments(readSource(BODY));
		const fieldset = /<fieldset disabled=\{isAmountLocked\}[\s\S]*?<\/fieldset>/.exec(source);

		expect(fieldset, "aucun <fieldset disabled={isAmountLocked}> trouvé").not.toBeNull();
		expect(fieldset![0]).not.toMatch(/<CheckoutContactSection/);
		expect(fieldset![0]).not.toMatch(/<CheckoutAddressFields/);
	});

	it("le fieldset disabled couvre TOUJOURS ce qui porte le montant", () => {
		// L'autre moitié de l'invariant : relâcher le gel sur les frais de livraison
		// laisserait le CTA suivre des modifications qui ne seront jamais débitées.
		// (La section code promo a disparu avec les `Discount`, 2026-08-05.)
		const source = stripComments(readSource(BODY));
		const fieldset = /<fieldset disabled=\{isAmountLocked\}[\s\S]*?<\/fieldset>/.exec(source);

		expect(fieldset![0]).toMatch(/<ShippingMethodSection/);
	});

	it("CheckoutAddressFields reçoit lockDestination piloté par le verrou", () => {
		const source = stripComments(readSource(BODY));
		const call = /<CheckoutAddressFields[\s\S]*?\/>/.exec(source);

		expect(call, "aucun appel à CheckoutAddressFields trouvé").not.toBeNull();
		expect(call![0]).toMatch(/lockDestination=\{isAmountLocked\}/);
	});

	it("lockDestination désactive le code postal ET le pays, et rien d'autre", () => {
		const source = stripComments(readSource(FIELDS));
		const disabledFields = [...source.matchAll(/name="shipping\.(\w+)"/g)].map((m) => m[1]);

		// Les 7 champs d'adresse existent toujours…
		expect(disabledFields).toEqual(
			expect.arrayContaining([
				"fullName",
				"addressLine1",
				"addressLine2",
				"postalCode",
				"city",
				"country",
				"phoneNumber",
			]),
		);

		// …et exactement deux `disabled={lockDestination}` sont posés.
		const disabledCount = [...source.matchAll(/disabled=\{lockDestination\}/g)].length;
		expect(disabledCount).toBe(2);

		// Chacun dans le bloc du champ tarifaire correspondant.
		const postalBlock = /name="shipping\.postalCode"[\s\S]*?<\/form\.AppField>/.exec(source);
		const countryBlock = /name="shipping\.country"[\s\S]*?<\/form\.AppField>/.exec(source);
		expect(postalBlock![0]).toMatch(/disabled=\{lockDestination\}/);
		expect(countryBlock![0]).toMatch(/disabled=\{lockDestination\}/);
	});

	it("aucun réécrivain d'adresse en bloc ne peut contourner le gel", () => {
		// L'ancien vecteur était le sélecteur d'adresses enregistrées : il réécrivait
		// `country` et `postalCode` d'un coup, donc il devait être masqué sous verrou
		// (sinon le serveur refusait la resoumission). Le carnet d'adresses a été retiré
		// en V1, donc le vecteur n'existe plus — on verrouille son ABSENCE plutôt que son
		// masquage : c'est plus fort, et ça rougira si quelqu'un réintroduit un
		// remplisseur groupé sans repasser par la question du gel.
		//
		// ⚠️ Ne PAS étendre l'assertion à tout `setFieldValue("shipping.postalCode")` :
		// l'autocomplétion BAN en pose un légitimement quand la cliente choisit une
		// suggestion, et le champ qui la porte reste éditable sous verrou (c'est le but
		// du lot : corriger sa rue sans repasser au panier).
		const source = stripComments(readSource(FIELDS));
		expect(source).not.toMatch(/AddressSelector/);
		expect(source).not.toMatch(/_selectedAddressId/);
	});

	it("la copie du verrou ne promet plus une adresse figée", () => {
		// La version précédente affirmait « le montant et l'adresse de livraison ne peuvent
		// plus changer » — désormais faux, et c'est ce genre de copie mensongère qui envoie
		// le client écrire au support pour une correction qu'il peut faire lui-même.
		const source = readSource(BODY);
		expect(source).not.toMatch(/l&apos;adresse de livraison ne peuvent\s*\n?\s*plus changer/);
		expect(source).toMatch(/corriger ta rue/);
	});
});
