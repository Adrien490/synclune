import { describe, expect, it } from "vitest";
import { assertFacturXCenRules, assertFacturXXmlStructure } from "../validate-facturx";
import type { InvoiceData } from "../../types/invoice-data";

function makeValidInvoiceData(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "F-2026-00042",
		invoiceFormat: "FACTURX",
		issuedAt: new Date("2026-05-28T10:00:00Z"),
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
		lines: [],
		totals: {
			subtotalExclTax: 9500,
			totalDiscount: 0,
			shippingExclTax: 0,
			shippingTax: 0,
			taxBreakdown: [],
			totalExclTax: 9500,
			totalTax: 0,
			totalInclTax: 9500,
			totalPaid: 9500,
			amountDue: 0,
		},
		payment: {
			method: "CARD",
			paidAt: new Date("2026-05-28T10:00:00Z"),
			stripePaymentIntentId: "pi_test",
			stripeChargeId: "ch_test",
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: {
			orderId: "ord_xyz",
			orderNumber: "SYN-20260528-0042",
			notes: null,
		},
		...overrides,
	};
}

describe("assertFacturXCenRules (mode pivot)", () => {
	it("accepts a fully valid invoice (B2C, franchise TVA)", () => {
		expect(() => assertFacturXCenRules(makeValidInvoiceData())).not.toThrow();
	});

	it("BR-CO-15: rejects when totalInclTax != totalExclTax + totalTax", () => {
		const data = makeValidInvoiceData({
			totals: {
				subtotalExclTax: 9500,
				totalDiscount: 0,
				shippingExclTax: 0,
				shippingTax: 0,
				taxBreakdown: [],
				totalExclTax: 9500,
				totalTax: 0,
				totalInclTax: 9700, // 200 cents off
				totalPaid: 9700,
				amountDue: 0,
			},
		});
		expect(() => assertFacturXCenRules(data)).toThrow(/BR-CO-15/);
	});

	it("BR-CO-15: tolerates 1 cent rounding noise", () => {
		const data = makeValidInvoiceData({
			totals: {
				subtotalExclTax: 9500,
				totalDiscount: 0,
				shippingExclTax: 0,
				shippingTax: 0,
				taxBreakdown: [],
				totalExclTax: 9500,
				totalTax: 0,
				totalInclTax: 9501, // 1 cent off — within tolerance
				totalPaid: 9501,
				amountDue: 0,
			},
		});
		expect(() => assertFacturXCenRules(data)).not.toThrow();
	});

	it("BR-CO-25: rejects when amountDue != totalInclTax - totalPaid", () => {
		const data = makeValidInvoiceData({
			totals: {
				subtotalExclTax: 9500,
				totalDiscount: 0,
				shippingExclTax: 0,
				shippingTax: 0,
				taxBreakdown: [],
				totalExclTax: 9500,
				totalTax: 0,
				totalInclTax: 9500,
				totalPaid: 5000,
				amountDue: 2000, // should be 4500
			},
		});
		expect(() => assertFacturXCenRules(data)).toThrow(/BR-CO-25/);
	});

	it("BR-01: rejects malformed invoiceNumber", () => {
		const data = makeValidInvoiceData({ invoiceNumber: "F-26-001" });
		expect(() => assertFacturXCenRules(data)).toThrow(/BR-01/);
	});

	it("BR-02: rejects invalid issuedAt", () => {
		const data = makeValidInvoiceData({ issuedAt: new Date("invalid") });
		expect(() => assertFacturXCenRules(data)).toThrow(/BR-02/);
	});

	it("BR-05: rejects invalid currency length", () => {
		const data = makeValidInvoiceData({ currency: "E" as unknown as "EUR" });
		expect(() => assertFacturXCenRules(data)).toThrow(/BR-05/);
	});

	it("BR-06: rejects empty seller tradeName", () => {
		const valid = makeValidInvoiceData();
		const data = makeValidInvoiceData({
			seller: { ...valid.seller, tradeName: "  " },
		});
		expect(() => assertFacturXCenRules(data)).toThrow(/BR-06/);
	});

	it("BR-07: rejects when buyer has no name at all (B2C empty)", () => {
		const valid = makeValidInvoiceData();
		const data = makeValidInvoiceData({
			buyer: { ...valid.buyer, firstName: "", lastName: "", legalName: null },
		});
		expect(() => assertFacturXCenRules(data)).toThrow(/BR-07/);
	});

	it("BR-FR-09: rejects FR seller without 9-digit SIREN", () => {
		const valid = makeValidInvoiceData();
		const data = makeValidInvoiceData({
			seller: { ...valid.seller, siren: "12345" },
		});
		expect(() => assertFacturXCenRules(data)).toThrow(/BR-FR-09/);
	});

	it("accepts credit note (A- prefix)", () => {
		const data = makeValidInvoiceData({ invoiceNumber: "A-2026-00001" });
		expect(() => assertFacturXCenRules(data)).not.toThrow();
	});
});

describe("assertFacturXXmlStructure (mode XML)", () => {
	const data = makeValidInvoiceData();

	function validXml(): string {
		return (
			`<?xml version="1.0" encoding="UTF-8"?>\n` +
			`<rsm:CrossIndustryInvoice>\n` +
			`<rsm:ExchangedDocumentContext>\n` +
			`<ram:GuidelineSpecifiedDocumentContextParameter>\n` +
			`<ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>\n` +
			`</ram:GuidelineSpecifiedDocumentContextParameter>\n` +
			`</rsm:ExchangedDocumentContext>\n` +
			`<rsm:ExchangedDocument>\n` +
			`<ram:ID>F-2026-00042</ram:ID>\n` +
			`<ram:TypeCode>380</ram:TypeCode>\n` +
			`<udt:DateTimeString format="102">20260528</udt:DateTimeString>\n` +
			`</rsm:ExchangedDocument>\n` +
			`<ram:SellerTradeParty><ram:Name>Synclune</ram:Name></ram:SellerTradeParty>\n` +
			`<ram:BuyerTradeParty><ram:Name>Alice Dupont</ram:Name></ram:BuyerTradeParty>\n` +
			`<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>\n` +
			`<ram:TaxBasisTotalAmount>95.00</ram:TaxBasisTotalAmount>\n` +
			`<ram:TaxTotalAmount currencyID="EUR">0.00</ram:TaxTotalAmount>\n` +
			`<ram:GrandTotalAmount>95.00</ram:GrandTotalAmount>\n` +
			`<ram:DuePayableAmount>0.00</ram:DuePayableAmount>\n` +
			`</rsm:CrossIndustryInvoice>\n`
		);
	}

	it("accepts a valid MINIMUM XML", () => {
		expect(() => assertFacturXXmlStructure(validXml(), data)).not.toThrow();
	});

	it("BR-FR-FX-001: rejects when guideline URN missing", () => {
		const xml = validXml().replace(
			"<ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>",
			"<ram:ID>urn:factur-x.eu:1p0:basic</ram:ID>",
		);
		expect(() => assertFacturXXmlStructure(xml, data)).toThrow(/BR-FR-FX-001/);
	});

	it("BR-04: rejects when TypeCode is not in {380,381,384,389}", () => {
		const xml = validXml().replace(
			"<ram:TypeCode>380</ram:TypeCode>",
			"<ram:TypeCode>999</ram:TypeCode>",
		);
		expect(() => assertFacturXXmlStructure(xml, data)).toThrow(/BR-04/);
	});

	it("BR-02: rejects when DateTimeString is malformed", () => {
		const xml = validXml().replace(
			'<udt:DateTimeString format="102">20260528</udt:DateTimeString>',
			'<udt:DateTimeString format="102">bad</udt:DateTimeString>',
		);
		expect(() => assertFacturXXmlStructure(xml, data)).toThrow(/BR-02/);
	});

	it("BR-CO-15: rejects when TaxBasisTotalAmount is missing", () => {
		const xml = validXml().replace(
			"<ram:TaxBasisTotalAmount>95.00</ram:TaxBasisTotalAmount>\n",
			"",
		);
		expect(() => assertFacturXXmlStructure(xml, data)).toThrow(/BT-109/);
	});
});
