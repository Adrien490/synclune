import { Prisma } from "@/app/generated/prisma/client";

/**
 * Payloads de scrub PII des commandes — SSOT du cycle RGPD/conservation en 2 temps
 * (invariant 10, CLAUDE.md § Facturation électronique).
 *
 * Consommateurs :
 * - `modules/cron/services/hard-delete-retention.service.ts` — purge à échéance
 *   légale (`paidAt + 10 ans`, commandes jamais payées à 3 ans)
 * - `purge-pii-scrub-contract.regression.test.ts` — contrat de champs verrouillé
 *
 * (L'anonymisation de COMPTE, ex-3ᵉ consommateur, est partie avec l'espace
 * client le 2026-07-31 — cf. CLAUDE.md § Auth. Si un chemin d'anonymisation
 * revient, il doit re-consommer `CUSTOMER_SHIPPING_PII_SCRUB` en dérivant
 * seulement `customerEmail` du userId.)
 *
 * Module volontairement PUR (constantes seulement) : importable par les tests
 * sans mocker UploadThing ni le runtime Prisma.
 */

/**
 * PII opérationnelle (admin UI, étiquettes d'expédition).
 * Scrubée par la purge 10 ans (`ORDER_PII_SCRUB`) et la purge commandes jamais
 * payées (`UNPAID_ORDER_PII_SCRUB`, RGPD-AUDIT F-A). Source unique pour que les
 * payloads ne divergent jamais.
 *
 * ⚠️ `stripePaymentIntentId` n'en fait PAS partie : hors échéance (ex. un futur
 * chemin d'anonymisation anticipée), des remboursements/litiges restent
 * possibles et exigent le PaymentIntent. Il n'est nullé qu'aux purges à
 * échéance (voir ci-dessous).
 */
export const CUSTOMER_SHIPPING_PII_SCRUB = {
	// customerEmail n'a pas de contrainte UNIQUE → une constante suffit.
	// Cf. RGPD-AUDIT F2.
	customerEmail: "purge-10y@deleted.synclune.local",
	customerName: "Client supprimé",
	// Ni `customerPhone` ni `stripeCustomerId` : les deux colonnes ont été
	// retirées le 2026-08-04 (la première n'était jamais écrite au checkout —
	// le téléphone vit dans `shippingPhone`, scrubé plus bas ; la seconde
	// n'avait aucun lecteur). Le pseudonyme Stripe qui survit à la purge est
	// `stripePaymentIntentId`, nullé dans ORDER_PII_SCRUB.
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
 *
 * `shippingCountry` est conservé DÉLIBÉRÉMENT : territoire fiscal de la vente
 * (TVA/OSS, stats par pays), granularité non identifiante à elle seule — ce
 * n'est pas un oubli.
 */
export const ORDER_PII_SCRUB = {
	...CUSTOMER_SHIPPING_PII_SCRUB,
	// `pi_xxx` : identifiant pseudonyme rattachable via Stripe, même logique que
	// `cus_xxx` (F4). Nullé uniquement à échéance (hors échéance, des
	// remboursements/litiges restent possibles sur une commande récente).
	stripePaymentIntentId: null,
	// Audit rétention PII 2026-08-03 : le numéro de suivi est un identifiant
	// transporteur rattaché à la livraison d'une personne nommée — incohérent de
	// le garder à côté d'une adresse et d'un téléphone scrubés. Pas dans
	// UNPAID_ORDER_PII_SCRUB : une commande jamais payée n'est jamais expédiée.
	trackingNumber: null,
	trackingUrl: null,
	// Pas de `billing*` : les 9 colonnes ont été retirées le 2026-08-04 (jamais
	// renseignées sur une commande réelle — cf. `buildBillingAddress`). L'adresse
	// portée par la facture est l'adresse de livraison, déjà scrubée ci-dessus.
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

/**
 * Neutralisation des `OrderHistory` à la purge d'échéance (arbitrage 2026-08-03,
 * audit rétention PII). L'invariant « OrderHistory est immuable » vaut PENDANT
 * la rétention 10 ans (Art. L123-22) — pas au-delà : passée l'échéance, la base
 * légale des lignes expire comme celle des `OrderNote`.
 *
 * Seuls les deux champs à valeurs libres sont neutralisés : `note` (texte libre
 * admin — raisons d'annulation, numéro de suivi interpolé par l'historique des
 * écritures pré-2026-08) et `metadata` (le contrat `changedFields` est sans
 * valeurs d'adresse, mais `previousTrackingNumber`/`newTrackingNumber` y portent
 * des valeurs). La ligne survit : `action`, statuts, dates, `authorId`/
 * `authorName` (staff, pas client — régression `order-history-no-customer-pii`).
 *
 * Unique writer autorisé : `hard-delete-retention.service.ts` — allowlisté dans
 * `order-history-immutability.regression.test.ts`, qui continue de rougir sur
 * toute autre mutation.
 */
export const ORDER_HISTORY_PII_SCRUB = {
	note: null,
	metadata: Prisma.DbNull,
} as const;
