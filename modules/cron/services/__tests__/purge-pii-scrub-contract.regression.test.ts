import { describe, expect, it } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import {
	CUSTOMER_SHIPPING_PII_SCRUB,
	ORDER_PII_SCRUB,
	PURGED_ORDER_NOTE_CONTENT,
	REFUND_PII_SCRUB,
	UNPAID_ORDER_PII_SCRUB,
} from "@/modules/orders/constants/pii-scrub";

/**
 * @regression purge-pii-scrub-contract
 *
 * Verrouille le CONTRAT de champs des payloads de purge PII (cron
 * `hard-delete-retention` → `purgeExpiredOrderPii`/`purgeAbandonedOrderPii`,
 * SSOT `modules/orders/constants/pii-scrub.ts`), appliqués aux commandes dont
 * la rétention légale de 10 ans est échue (`paidAt + 10 ans`) et aux commandes
 * jamais payées passées la fenêtre F-A. Invariant #10 du cycle RGPD/conservation
 * en 2 temps (CLAUDE.md § Facturation électronique) :
 *
 *  (a) Les surfaces PII DOIVENT être scrubées — base légale de conservation
 *      expirée ⇒ limitation de conservation RGPD Art. 5.1.e :
 *      billing* + invoiceDataSnapshot/Hash + pointeurs PDF facture/avoir +
 *      identifiants Stripe pseudonymes (cus_/pi_) + avoirs par-refund
 *      (Refund.creditNotePdf*) + textes libres (Refund.note, OrderNote.content).
 *  (b) Les champs comptables non-PII NE DOIVENT JAMAIS figurer dans le scrub —
 *      la ligne survit (Art. L123-22) : numéros (invoiceNumber/creditNoteNumber),
 *      montants (total/subtotal/taxAmount/discountAmount/shippingCost/amount) et
 *      dates d'encaissement (paidAt/processedAt) restent intacts.
 *
 * Le test `hard-delete-retention.service.test.ts` couvre la SÉLECTION (where) et
 * la suppression des PDF UploadThing ; il n'inspecte PAS le `data` du scrub. Sans
 * cette garde, une régression ajoutant `total: 0` ou `invoiceNumber: null` au
 * payload détruirait l'enregistrement comptable SANS test rouge (audit couverture
 * facturation 2026-05-30, finding P1-A ; étendu Refund/unpaid — audit rétention
 * PII 2026-07-09).
 */

const SCRUB = ORDER_PII_SCRUB as Record<string, unknown>;
const UNPAID_SCRUB = UNPAID_ORDER_PII_SCRUB as Record<string, unknown>;
const REFUND_SCRUB = REFUND_PII_SCRUB as Record<string, unknown>;

/** Champs PII opérationnels + facture qui DOIVENT être effacés à 10 ans. */
const MUST_BE_SCRUBBED = [
	"customerEmail",
	"customerName",
	"customerPhone",
	// F4 (RGPD-PII-AUDIT 2026-05-30) : identifiant Stripe pseudonyme rattachable à
	// une personne — scrubé comme à l'anonymisation compte.
	"stripeCustomerId",
	// Audit rétention PII 2026-07-09 : `pi_xxx` est rattachable à une personne via
	// Stripe au même titre que `cus_xxx` — nullé à échéance (pas à l'anonymisation,
	// où refunds/litiges restent possibles).
	"stripePaymentIntentId",
	"shippingFirstName",
	"shippingLastName",
	"shippingAddress1",
	"shippingAddress2",
	"shippingPostalCode",
	"shippingCity",
	"shippingPhone",
	"billingFirstName",
	"billingLastName",
	"billingAddress1",
	"billingAddress2",
	"billingPostalCode",
	"billingCity",
	"billingPhone",
	"invoiceDataSnapshot",
	"invoiceDataHash",
	"invoicePdfUrl",
	"invoicePdfHash",
	"creditNotePdfUrl",
	"creditNotePdfHash",
] as const;

/**
 * Champs comptables non-PII qui DOIVENT survivre (Art. L123-22 / L102 B LPF) —
 * leur PRÉSENCE dans le payload de scrub est une régression réglementaire.
 */
const MUST_BE_PRESERVED = [
	"invoiceNumber",
	"creditNoteNumber",
	"invoiceStatus",
	"invoiceGeneratedAt",
	"invoiceVoidedAt",
	"creditNoteGeneratedAt",
	"total",
	"subtotal",
	"taxAmount",
	"discountAmount",
	"shippingCost",
	"paidAt",
	"orderNumber",
	"paymentMethod",
	"vendorLegalName",
	"vendorSiren",
	"vendorSiret",
	"vendorVatNumber",
] as const;

describe("ORDER_PII_SCRUB — contrat de champs (purge 10 ans, commandes payées)", () => {
	it.each(MUST_BE_SCRUBBED)("scrub le champ PII %s", (field) => {
		expect(Object.prototype.hasOwnProperty.call(SCRUB, field)).toBe(true);
	});

	it.each(MUST_BE_PRESERVED)("ne touche JAMAIS le champ comptable %s", (field) => {
		expect(Object.prototype.hasOwnProperty.call(SCRUB, field)).toBe(false);
	});

	it("efface le snapshot facture via Prisma.DbNull (champ Json) et non null", () => {
		// invoiceDataSnapshot est un champ Json? → l'effacement passe par DbNull,
		// pas `null` (qui poserait JsonNull). Régression silencieuse sinon.
		expect(SCRUB.invoiceDataSnapshot).toBe(Prisma.DbNull);
	});

	it("nulle les pointeurs PDF (URL + hash) pour les deux documents", () => {
		expect(SCRUB.invoicePdfUrl).toBeNull();
		expect(SCRUB.invoicePdfHash).toBeNull();
		expect(SCRUB.creditNotePdfUrl).toBeNull();
		expect(SCRUB.creditNotePdfHash).toBeNull();
	});

	it("ne contient aucune clé inattendue au-delà du contrat (anti-dérive)", () => {
		const allowed = new Set<string>([...MUST_BE_SCRUBBED]);
		for (const key of Object.keys(SCRUB)) {
			expect(allowed.has(key)).toBe(true);
		}
	});
});

describe("UNPAID_ORDER_PII_SCRUB — contrat de champs (commandes jamais payées, F-A)", () => {
	it("couvre toute la surface opérationnelle partagée + les identifiants Stripe", () => {
		for (const key of Object.keys(CUSTOMER_SHIPPING_PII_SCRUB)) {
			expect(Object.prototype.hasOwnProperty.call(UNPAID_SCRUB, key)).toBe(true);
		}
		expect(UNPAID_SCRUB.stripePaymentIntentId).toBeNull();
	});

	it("ne touche AUCUNE surface facture (inexistante sur une commande non payée)", () => {
		const invoiceSurfaces = [
			"billingFirstName",
			"billingLastName",
			"billingAddress1",
			"invoiceDataSnapshot",
			"invoiceDataHash",
			"invoicePdfUrl",
			"invoicePdfHash",
			"creditNotePdfUrl",
			"creditNotePdfHash",
			"invoiceNumber",
			"creditNoteNumber",
		];
		for (const key of invoiceSurfaces) {
			expect(Object.prototype.hasOwnProperty.call(UNPAID_SCRUB, key)).toBe(false);
		}
	});
});

describe("REFUND_PII_SCRUB — contrat de champs (avoirs par-refund, purge 10 ans)", () => {
	/** Surfaces PII du Refund : pointeurs PDF avoir (identité acheteur) + note libre. */
	const REFUND_MUST_BE_SCRUBBED = ["creditNotePdfUrl", "creditNotePdfHash", "note"] as const;

	/** Champs comptables du Refund qui DOIVENT survivre (Art. L123-22). */
	const REFUND_MUST_BE_PRESERVED = [
		"creditNoteNumber",
		"creditNoteGeneratedAt",
		"amount",
		"currency",
		"stripeRefundId",
		"status",
		"reason",
		"processedAt",
		"attemptCount",
		"createdBy",
	] as const;

	it.each(REFUND_MUST_BE_SCRUBBED)("scrub le champ PII Refund.%s", (field) => {
		expect(Object.prototype.hasOwnProperty.call(REFUND_SCRUB, field)).toBe(true);
		expect(REFUND_SCRUB[field]).toBeNull();
	});

	it.each(REFUND_MUST_BE_PRESERVED)("ne touche JAMAIS Refund.%s (comptable)", (field) => {
		expect(Object.prototype.hasOwnProperty.call(REFUND_SCRUB, field)).toBe(false);
	});

	it("ne contient aucune clé inattendue (anti-dérive)", () => {
		const allowed = new Set<string>([...REFUND_MUST_BE_SCRUBBED]);
		for (const key of Object.keys(REFUND_SCRUB)) {
			expect(allowed.has(key)).toBe(true);
		}
	});
});

describe("PURGED_ORDER_NOTE_CONTENT — contenu de remplacement des notes internes", () => {
	it("est un libellé neutre sans interpolation (aucune PII possible)", () => {
		expect(typeof PURGED_ORDER_NOTE_CONTENT).toBe("string");
		expect(PURGED_ORDER_NOTE_CONTENT.length).toBeGreaterThan(0);
		expect(PURGED_ORDER_NOTE_CONTENT).not.toMatch(/\$\{/);
	});
});
