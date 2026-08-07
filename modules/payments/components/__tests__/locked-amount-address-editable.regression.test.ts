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
	it("aucun <fieldset disabled> ne subsiste — il ne gelait RIEN", () => {
		// ⚠️ Ce test exigeait naguère la PRÉSENCE d'un `<fieldset disabled={isAmountLocked}>`
		// autour de « Frais et délai de livraison ». Il verrouillait un mécanisme mort :
		// `ShippingMethodSection` est en LECTURE SEULE — pas un seul contrôle de
		// formulaire — et le `disabled` d'un fieldset ne désactive que les contrôles
		// qu'il contient. Il n'en désactivait donc aucun, tandis que sa `<legend>`
		// sr-only annonçait un groupe de saisie inexistant (audit a11y 2026-08-07).
		//
		// Le gel réel n'a jamais vécu là : il vit sur les deux champs tarifaires.
		const source = stripComments(readSource(BODY));
		expect(source).not.toMatch(/<fieldset disabled=\{isAmountLocked\}/);
	});

	it("les sections Contact et Livraison ne sont enfermées dans AUCUN fieldset gelé", () => {
		const source = stripComments(readSource(BODY));
		for (const fieldset of source.matchAll(/<fieldset[^>]*disabled[\s\S]*?<\/fieldset>/g)) {
			expect(fieldset[0]).not.toMatch(/<CheckoutContactSection/);
			expect(fieldset[0]).not.toMatch(/<CheckoutAddressFields/);
		}
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

		// …et exactement DEUX champs sont gelés — les deux tarifaires, pas un de plus.
		const frozen = [...source.matchAll(/(?:disabled|readOnly)=\{lockDestination\}/g)].length;
		expect(frozen).toBe(2);

		const postalBlock = /name="shipping\.postalCode"[\s\S]*?<\/form\.AppField>/.exec(source);
		const countryBlock = /name="shipping\.country"[\s\S]*?<\/form\.AppField>/.exec(source);

		// ⚠️ Le code postal est `readOnly`, PAS `disabled` : un `<input disabled>` sort
		// de l'ordre de tabulation et son `aria-describedby` n'est pas lu en mode
		// formulaire. Au clavier le champ s'évaporait, sans motif (audit a11y
		// 2026-08-07). Le `<select>` du pays n'a pas d'équivalent `readOnly` et reste
		// `disabled` — d'où l'exigence de `description` ci-dessous, qui porte le motif
		// dans le flux de lecture.
		expect(postalBlock![0]).toMatch(/readOnly=\{lockDestination\}/);
		expect(postalBlock![0]).not.toMatch(/disabled=\{lockDestination\}/);
		expect(countryBlock![0]).toMatch(/disabled=\{lockDestination\}/);
	});

	it("chaque champ gelé EXPLIQUE pourquoi il l'est", () => {
		// Le motif vivait uniquement dans une alerte située ailleurs dans le DOM, en
		// amont, sans aucun lien programmatique — et jamais annoncée après un
		// rechargement (la région live y naît déjà peuplée).
		const source = stripComments(readSource(FIELDS));
		const postalBlock = /name="shipping\.postalCode"[\s\S]*?<\/form\.AppField>/.exec(source);
		const countryBlock = /name="shipping\.country"[\s\S]*?<\/form\.AppField>/.exec(source);

		for (const block of [postalBlock![0], countryBlock![0]]) {
			expect(block).toMatch(/description=\{\s*lockDestination/);
			expect(block).toMatch(/frais de livraison/);
		}
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
