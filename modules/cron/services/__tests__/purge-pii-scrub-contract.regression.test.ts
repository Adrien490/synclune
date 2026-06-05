import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";

// `hard-delete-retention.service` importe le service UploadThing dont le module
// instancie `new UTApi()` au chargement (token env requis). On le neutralise —
// ce test n'exécute aucune logique runtime, il inspecte une constante.
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: vi.fn(),
}));

import { ORDER_PII_SCRUB } from "../hard-delete-retention.service";

/**
 * @regression purge-pii-scrub-contract
 *
 * Verrouille le CONTRAT de champs de `ORDER_PII_SCRUB` (cron
 * `hard-delete-retention` → `purgeExpiredOrderPii`), appliqué aux commandes dont
 * la rétention légale de 10 ans est échue (`paidAt + 10 ans`). Invariant #10 du
 * cycle RGPD/conservation en 2 temps (CLAUDE.md § Facturation électronique) :
 *
 *  (a) Les surfaces PII DOIVENT être scrubées — base légale de conservation
 *      expirée ⇒ limitation de conservation RGPD Art. 5.1.e :
 *      billing* + invoiceDataSnapshot/Hash + pointeurs PDF facture/avoir.
 *  (b) Les champs comptables non-PII NE DOIVENT JAMAIS figurer dans le scrub —
 *      la ligne survit (Art. L123-22) : numéros (invoiceNumber/creditNoteNumber),
 *      montants (total/subtotal/taxAmount/discountAmount/shippingCost) et dates
 *      d'encaissement (paidAt) restent intacts.
 *
 * Le test `hard-delete-retention.service.test.ts` couvre la SÉLECTION (where) et
 * la suppression des PDF UploadThing ; il n'inspecte PAS le `data` du scrub. Sans
 * cette garde, une régression ajoutant `total: 0` ou `invoiceNumber: null` au
 * payload détruirait l'enregistrement comptable SANS test rouge (audit couverture
 * facturation 2026-05-30, finding P1-A).
 */

const SCRUB = ORDER_PII_SCRUB as Record<string, unknown>;

/** Champs PII opérationnels + facture qui DOIVENT être effacés à 10 ans. */
const MUST_BE_SCRUBBED = [
	"customerEmail",
	"customerName",
	"customerPhone",
	// F4 (RGPD-PII-AUDIT 2026-05-30) : identifiant Stripe pseudonyme rattachable à
	// une personne — scrubé comme à l'anonymisation compte.
	"stripeCustomerId",
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

describe("ORDER_PII_SCRUB — contrat de champs (purge 10 ans)", () => {
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
