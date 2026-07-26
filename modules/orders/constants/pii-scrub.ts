import { Prisma } from "@/app/generated/prisma/client";

/**
 * Payloads de scrub PII des commandes — SSOT du cycle RGPD/conservation en 2 temps
 * (invariant 10, CLAUDE.md § Facturation électronique).
 *
 * Consommateurs :
 * - `modules/cron/services/hard-delete-retention.service.ts` — purge à échéance
 *   légale (`paidAt + 10 ans`, commandes jamais payées à 3 ans)
 * - `purge-pii-scrub-contract.regression.test.ts` — contrat de champs verrouillé
 * - `anonymize-user.service.test.ts` — drift-lock : l'anonymisation compte
 *   (`anonymize-user.service.ts`) doit couvrir exactement la surface
 *   opérationnelle de `CUSTOMER_SHIPPING_PII_SCRUB` (seul `customerEmail`
 *   diffère, dérivé du userId). Le payload y reste écrit en littéral — les
 *   régressions `anonymize-user-preserves-invoice` scannent la source, un
 *   spread les aveuglerait.
 *
 * Module volontairement PUR (constantes seulement) : importable par les tests
 * sans mocker UploadThing ni le runtime Prisma.
 */

/**
 * PII opérationnelle (admin UI, étiquettes d'expédition, espace client).
 * Scrubée par la purge 10 ans (`ORDER_PII_SCRUB`), la purge commandes jamais
 * payées (`UNPAID_ORDER_PII_SCRUB`, RGPD-AUDIT F-A) ET — mêmes valeurs, email
 * dérivé à part — par l'anonymisation compte. Source unique pour que les
 * payloads ne divergent jamais.
 *
 * ⚠️ `stripePaymentIntentId` n'en fait PAS partie : à l'anonymisation compte
 * (30 j après demande), des remboursements/litiges restent possibles et exigent
 * le PaymentIntent. Il n'est nullé qu'aux purges à échéance (voir ci-dessous).
 */
export const CUSTOMER_SHIPPING_PII_SCRUB = {
	// customerEmail n'a pas de contrainte UNIQUE → une constante suffit (≠ anonymisation
	// compte qui dérive l'email du userId). Cf. RGPD-AUDIT F2.
	customerEmail: "purge-10y@deleted.synclune.local",
	customerName: "Client supprimé",
	customerPhone: null,
	// F4 (RGPD-PII-AUDIT 2026-05-30) : aligné sur l'anonymisation compte
	// (anonymize-user.service nulle déjà ce champ). `cus_xxx` est un identifiant
	// pseudonyme rattachable à une personne via Stripe — il doit disparaître à la
	// purge comme à l'anonymisation, sinon une commande invité jamais anonymisée
	// le conserverait au-delà des 10 ans.
	stripeCustomerId: null,
	shippingFirstName: "X",
	shippingLastName: "X",
	shippingAddress1: "Adresse supprimée",
	shippingAddress2: null,
	shippingPostalCode: "00000",
	shippingCity: "Supprimé",
	shippingPhone: "0000000000",
} as const;

/**
 * Scrub complet appliqué aux commandes PAYÉES dont la rétention légale de 10 ans
 * est échue (`paidAt + 10 ans`). La ligne comptable survit (Art. L123-22) : les
 * champs non-PII (numéros, montants, dates) ne figurent JAMAIS ici — contrat
 * verrouillé par `purge-pii-scrub-contract.regression.test.ts`.
 */
export const ORDER_PII_SCRUB = {
	...CUSTOMER_SHIPPING_PII_SCRUB,
	// `pi_xxx` : identifiant pseudonyme rattachable via Stripe, même logique que
	// `cus_xxx` (F4). Nullé uniquement à échéance — pas à l'anonymisation (des
	// remboursements/litiges restent possibles sur une commande récente).
	stripePaymentIntentId: null,
	billingFirstName: "X",
	billingLastName: "X",
	billingAddress1: "Adresse supprimée",
	billingAddress2: null,
	billingPostalCode: "00000",
	billingCity: "Supprimé",
	billingPhone: "0000000000",
	// Snapshot facture figé : la base légale ayant expiré, on efface la PII qu'il
	// contient (buyer + adresses). Les colonnes non-PII (numéros, montants) restent.
	invoiceDataSnapshot: Prisma.DbNull,
	invoiceDataHash: null,
	// PDF immuables : on nulle les pointeurs (fichiers UploadThing supprimés hors tx).
	invoicePdfUrl: null,
	invoicePdfHash: null,
	creditNotePdfUrl: null,
	creditNotePdfHash: null,
} as const;

/**
 * Scrub PII des commandes JAMAIS payées (paidAt IS NULL) passées la fenêtre
 * `UNPAID_ORDER_PII_RETENTION_DAYS`. Aucune facture n'existe : rien de légal à
 * préserver — seuls `customer*`/`shipping*` + identifiants Stripe portent de la
 * PII (billing, snapshot et PDF sont vides sur une commande non payée).
 * Cf. RGPD-AUDIT F-A.
 */
export const UNPAID_ORDER_PII_SCRUB = {
	...CUSTOMER_SHIPPING_PII_SCRUB,
	stripePaymentIntentId: null,
} as const;

/**
 * Scrub PII des Refunds à la purge 10 ans de leur commande parente.
 *
 * Les avoirs PARTIELS sont archivés PAR REFUND (`Refund.creditNotePdfUrl/Hash`,
 * cf. `modules/refunds/services/archive-credit-note-pdf.service.ts`) et portent
 * la même identité acheteur que la facture — même base légale (Art. 289 CGI /
 * 17(3)(b) RGPD), même échéance. `note` est du texte libre admin pouvant
 * contenir de la PII client (« photos reçues par mail »). Les champs comptables
 * (creditNoteNumber, amount, stripeRefundId, status…) survivent — contrat
 * verrouillé par `purge-pii-scrub-contract.regression.test.ts`.
 */
export const REFUND_PII_SCRUB = {
	creditNotePdfUrl: null,
	creditNotePdfHash: null,
	note: null,
} as const;

/**
 * Contenu de remplacement des `OrderNote.content` à la purge 10 ans : notes
 * internes en texte libre (échanges clients, incidents) = PII potentielle sans
 * base légale au-delà de l'échéance. La ligne (auteur staff, dates) survit.
 */
export const PURGED_ORDER_NOTE_CONTENT =
	"Contenu purgé — rétention légale 10 ans échue (RGPD Art. 5.1.e)";
