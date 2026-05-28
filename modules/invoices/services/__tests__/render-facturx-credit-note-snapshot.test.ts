/**
 * Snapshot golden Factur-X CII MINIMUM pour un AVOIR (credit note).
 *
 * Le profil Factur-X 1.0.07 MINIMUM ne contient PAS de bloc
 * `BillingReferencedDocument` (BT-25) — celui-ci apparaît à partir des profils
 * BASIC / EN 16931. Pour la conformité réforme 2026-2027 B2B/B2G, on devra
 * passer au profil EN 16931 avec un lien explicite vers la facture initiale.
 *
 * Ce snapshot fige la sortie courante : `TypeCode=381` + `invoiceNumber`
 * `A-YYYY-NNNNN`. Tout changement futur (passage au profil BASIC, ajout de
 * BillingReferencedDocument) devra mettre à jour le snapshot intentionnellement.
 *
 * EINV-TEST-015 — drift detection sur le format avoir, complète le snapshot
 * facture déjà présent dans `render-facturx.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { renderFacturXMinimum } from "../render-facturx";
import type { InvoiceData } from "../../types/invoice-data";

function makeCreditNoteData(): InvoiceData {
	return {
		invoiceNumber: "A-2026-00042",
		invoiceFormat: "FACTURX",
		issuedAt: new Date("2026-05-28T12:00:00Z"),
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
			stripePaymentIntentId: "pi_credit_1",
			stripeChargeId: null,
		},
		precedingInvoice: {
			invoiceNumber: "F-2026-00042",
			issuedAt: new Date("2026-05-27T18:00:00Z"),
			reason: "Annulation suite à remboursement total",
		},
		voidedInfo: null,
		meta: { orderId: "order-credit-1", orderNumber: "SYN-2026-0042", notes: null },
	};
}

describe("renderFacturXMinimum — credit note snapshot (EINV-TEST-015)", () => {
	it("TypeCode=381 dans l'XML rendu pour A-YYYY-NNNNN", () => {
		const xml = renderFacturXMinimum(makeCreditNoteData());
		expect(xml).toContain("<ram:TypeCode>381</ram:TypeCode>");
		// Ne doit PAS contenir TypeCode=380 (facture)
		expect(xml).not.toContain("<ram:TypeCode>380</ram:TypeCode>");
	});

	it("ram:ID porte le numéro d'avoir A-YYYY-NNNNN", () => {
		const xml = renderFacturXMinimum(makeCreditNoteData());
		expect(xml).toContain("<ram:ID>A-2026-00042</ram:ID>");
	});

	it("MINIMUM profile : pas de BillingReferencedDocument (sera ajouté en BASIC/EN 16931)", () => {
		const xml = renderFacturXMinimum(makeCreditNoteData());
		expect(xml).not.toContain("BillingReferencedDocument");
		// Le precedingInvoice est dans data mais le profil MINIMUM ne le rend pas
	});

	it("monetary summation : montants positifs (avoir = facture négative côté comptable,\n\t\tmais Factur-X impose montants positifs + TypeCode pour signaler la nature)", () => {
		const xml = renderFacturXMinimum(makeCreditNoteData());
		expect(xml).toContain("<ram:GrandTotalAmount>95.00</ram:GrandTotalAmount>");
		expect(xml).not.toContain("-95.00");
	});

	it("snapshot golden — XML complet figé pour drift detection", () => {
		const xml = renderFacturXMinimum(makeCreditNoteData());
		expect(xml).toMatchInlineSnapshot(`
			"<?xml version="1.0" encoding="UTF-8"?>
			<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
				<rsm:ExchangedDocumentContext>
					<ram:BusinessProcessSpecifiedDocumentContextParameter>
						<ram:ID>A1</ram:ID>
					</ram:BusinessProcessSpecifiedDocumentContextParameter>
					<ram:GuidelineSpecifiedDocumentContextParameter>
						<ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
					</ram:GuidelineSpecifiedDocumentContextParameter>
				</rsm:ExchangedDocumentContext>
				<rsm:ExchangedDocument>
					<ram:ID>A-2026-00042</ram:ID>
					<ram:TypeCode>381</ram:TypeCode>
					<ram:IssueDateTime>
						<udt:DateTimeString format="102">20260528</udt:DateTimeString>
					</ram:IssueDateTime>
				</rsm:ExchangedDocument>
				<rsm:SupplyChainTradeTransaction>
					<ram:ApplicableHeaderTradeAgreement>
						<ram:SellerTradeParty>
							<ram:Name>Synclune</ram:Name>
							<ram:SpecifiedLegalOrganization>
								<ram:ID schemeID="0002">839183027</ram:ID>
								<ram:TradingBusinessName>TADDEI LEANE - Entrepreneur Individuel</ram:TradingBusinessName>
							</ram:SpecifiedLegalOrganization>
							<ram:PostalTradeAddress>
								<ram:PostcodeCode>44100</ram:PostcodeCode>
								<ram:LineOne>77 Boulevard du Tertre</ram:LineOne>
								<ram:CityName>Nantes</ram:CityName>
								<ram:CountryID>FR</ram:CountryID>
							</ram:PostalTradeAddress>
							<ram:SpecifiedTaxRegistration>
								<ram:ID schemeID="VA">FR35839183027</ram:ID>
							</ram:SpecifiedTaxRegistration>
						</ram:SellerTradeParty>
						<ram:BuyerTradeParty>
							<ram:Name>Alice Dupont</ram:Name>
						</ram:BuyerTradeParty>
					</ram:ApplicableHeaderTradeAgreement>
					<ram:ApplicableHeaderTradeDelivery/>
					<ram:ApplicableHeaderTradeSettlement>
						<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
						<ram:SpecifiedTradeSettlementHeaderMonetarySummation>
							<ram:TaxBasisTotalAmount>95.00</ram:TaxBasisTotalAmount>
							<ram:TaxTotalAmount currencyID="EUR">0.00</ram:TaxTotalAmount>
							<ram:GrandTotalAmount>95.00</ram:GrandTotalAmount>
							<ram:DuePayableAmount>0.00</ram:DuePayableAmount>
						</ram:SpecifiedTradeSettlementHeaderMonetarySummation>
					</ram:ApplicableHeaderTradeSettlement>
				</rsm:SupplyChainTradeTransaction>
			</rsm:CrossIndustryInvoice>
			"
		`);
	});
});
