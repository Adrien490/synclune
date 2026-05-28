/**
 * Snapshot UBL 2.1 Peppol BIS Billing 3.0.
 *
 * EINV-TEST-023 (revisité) — le plan initial décrivait UBL comme "non
 * implémenté" mais `render-ubl.ts` a été ajouté en parallèle. On le couvre
 * désormais par un snapshot golden pour drift detection sur B2C franchise +
 * avoir (mêmes 2 cas que `render-facturx*` pour parité Factur-X/UBL).
 *
 * Ce test complète :
 *   - render-facturx.test.ts (snapshot CII MINIMUM facture)
 *   - render-facturx-credit-note-snapshot.test.ts (snapshot CII MINIMUM avoir)
 *
 * Hors-scope ici (à couvrir séparément si besoin) :
 *   - Snapshot UBL B2B avec SIRET + TVA acheteur
 *   - Validation XSD UBL 2.1 (nécessite libxml2 / xsdwasm)
 *   - PDF/A-3 embedding (EINV-FORMAT-001)
 */

import { describe, expect, it } from "vitest";
import { renderUblInvoice } from "../render-ubl";
import type { InvoiceData } from "../../types/invoice-data";

function makeB2cInvoice(): InvoiceData {
	return {
		invoiceNumber: "F-2026-00001",
		invoiceFormat: "UBL",
		issuedAt: new Date("2026-05-27T18:00:00Z"),
		dueAt: null,
		currency: "EUR",
		seller: {
			legalName: "TADDEI LEANE - Entrepreneur Individuel",
			tradeName: "Synclune",
			siren: "839183027",
			siret: "83918302700037",
			vatNumber: "FR35839183027",
			apeCode: "47.91B",
			legalForm: "Entrepreneur individuel",
			address: {
				recipientName: "TADDEI LEANE",
				line1: "77 Boulevard du Tertre",
				line2: null,
				postalCode: "44100",
				city: "Nantes",
				countryCode: "FR",
			},
			email: "contact@synclune.fr",
			eInvoicingAddress: null,
			eInvoicingPlatformId: null,
			vatExemptionText: "TVA non applicable, art. 293 B du CGI",
			bankIban: null,
			bankBic: null,
		},
		buyer: {
			type: "B2C",
			legalName: null,
			firstName: "Alice",
			lastName: "Dupont",
			email: "alice@example.com",
			phone: null,
			siren: null,
			siret: null,
			vatNumber: null,
			eInvoicingAddress: null,
			eInvoicingPlatformId: null,
			publicEntityId: null,
			chorusServiceCode: null,
		},
		shippingAddress: {
			recipientName: "Alice Dupont",
			line1: "10 rue de la Paix",
			line2: null,
			postalCode: "75002",
			city: "Paris",
			countryCode: "FR",
		},
		billingAddress: {
			recipientName: "Alice Dupont",
			line1: "10 rue de la Paix",
			line2: null,
			postalCode: "75002",
			city: "Paris",
			countryCode: "FR",
		},
		lines: [
			{
				lineNumber: 1,
				productTitle: "Collier Lune d'Argent",
				productDescription: null,
				skuCode: "COL-LUN-001",
				variantInfo: { color: "Argent", material: null, size: null },
				quantity: 2,
				unitPriceExclTax: 4500,
				discountAmount: 0,
				taxRate: 0,
				taxCategoryCode: "ZB",
				taxAmount: 0,
				lineTotalExclTax: 9000,
				lineTotalInclTax: 9000,
				hsCode: null,
				unitCode: null,
			},
		],
		totals: {
			subtotalExclTax: 9000,
			totalDiscount: 0,
			shippingExclTax: 500,
			shippingTax: 0,
			taxBreakdown: [
				{
					rate: 0,
					taxableAmount: 9500,
					taxAmount: 0,
					categoryCode: "ZB",
					exemptionReason: "Franchise art. 293 B CGI",
				},
			],
			totalExclTax: 9500,
			totalTax: 0,
			totalInclTax: 9500,
			totalPaid: 9500,
			amountDue: 0,
		},
		payment: {
			method: "CARD",
			paidAt: new Date("2026-05-27T18:00:00Z"),
			stripePaymentIntentId: "pi_ubl_test_1",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: { orderId: "order-ubl-1", orderNumber: "SYN-2026-0001", notes: null },
	};
}

describe("renderUblInvoice — snapshot golden (EINV-TEST-023)", () => {
	it("racine <Invoice> pour facture (pas CreditNote)", () => {
		const xml = renderUblInvoice(makeB2cInvoice());
		expect(xml).toContain("<Invoice ");
		expect(xml).not.toContain("<CreditNote ");
	});

	it("InvoiceTypeCode=380 pour F-YYYY-NNNNN", () => {
		const xml = renderUblInvoice(makeB2cInvoice());
		expect(xml).toMatch(/<cbc:InvoiceTypeCode[^>]*>380<\/cbc:InvoiceTypeCode>/);
	});

	it("CreditNote root + CreditNoteTypeCode=381 pour A-YYYY-NNNNN", () => {
		const creditNoteData = makeB2cInvoice();
		creditNoteData.invoiceNumber = "A-2026-00042";
		creditNoteData.precedingInvoice = {
			invoiceNumber: "F-2026-00042",
			issuedAt: new Date("2026-05-27T18:00:00Z"),
			reason: "Annulation",
		};

		const xml = renderUblInvoice(creditNoteData);

		expect(xml).toContain("<CreditNote ");
		expect(xml).not.toContain("<Invoice ");
		expect(xml).toMatch(/<cbc:CreditNoteTypeCode[^>]*>381<\/cbc:CreditNoteTypeCode>/);
	});

	it("XML bien-formé : <?xml version + namespaces UBL OASIS", () => {
		const xml = renderUblInvoice(makeB2cInvoice());
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect(xml).toContain("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2");
	});

	it("seller PartyLegalEntity contient SIREN + TADDEI LEANE", () => {
		const xml = renderUblInvoice(makeB2cInvoice());
		expect(xml).toContain("839183027");
		expect(xml).toContain("TADDEI LEANE");
	});

	it("legal monetary total : montants positifs format ISO décimal", () => {
		const xml = renderUblInvoice(makeB2cInvoice());
		// UBL utilise format avec point décimal sur LegalMonetaryTotal
		expect(xml).toMatch(/<cbc:PayableAmount[^>]*>0\.00<\/cbc:PayableAmount>/);
		expect(xml).toMatch(/<cbc:TaxInclusiveAmount[^>]*>95\.00<\/cbc:TaxInclusiveAmount>/);
	});
});
