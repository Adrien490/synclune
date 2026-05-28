import { describe, expect, it } from "vitest";
import { assertUblCenRules, assertUblXmlStructure } from "../validate-ubl";
import type { InvoiceData, InvoiceLine } from "../../types/invoice-data";

function makeLine(overrides: Partial<InvoiceLine> = {}): InvoiceLine {
	return {
		lineNumber: 1,
		productTitle: "Bague Lune",
		productDescription: null,
		skuCode: "BG-LUNE-S-AG",
		variantInfo: { color: null, material: "Argent 925", size: "S" },
		quantity: 1,
		unitPriceExclTax: 9500,
		discountAmount: 0,
		taxRate: 0,
		taxCategoryCode: "Z",
		taxAmount: 0,
		lineTotalExclTax: 9500,
		lineTotalInclTax: 9500,
		hsCode: null,
		unitCode: "H87",
		...overrides,
	};
}

function makeValidInvoiceData(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "F-2026-00042",
		invoiceFormat: "UBL",
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
			vatExemptionText: null,
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
		lines: [makeLine()],
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

describe("assertUblCenRules (mode pivot)", () => {
	it("accepts a fully valid invoice with 1 line", () => {
		expect(() => assertUblCenRules(makeValidInvoiceData())).not.toThrow();
	});

	it("BR-16: rejects when no lines (Peppol BIS 3.0 requires ≥ 1)", () => {
		const data = makeValidInvoiceData({ lines: [] });
		expect(() => assertUblCenRules(data)).toThrow(/BR-16/);
	});

	it("BR-CO-15: rejects mismatched totals", () => {
		const data = makeValidInvoiceData({
			totals: {
				subtotalExclTax: 9500,
				totalDiscount: 0,
				shippingExclTax: 0,
				shippingTax: 0,
				taxBreakdown: [],
				totalExclTax: 9500,
				totalTax: 1900,
				totalInclTax: 9500, // should be 11400
				totalPaid: 9500,
				amountDue: 0,
			},
		});
		expect(() => assertUblCenRules(data)).toThrow(/BR-CO-15/);
	});

	it("BR-01: rejects bad invoice number format", () => {
		const data = makeValidInvoiceData({ invoiceNumber: "INV-001" });
		expect(() => assertUblCenRules(data)).toThrow(/BR-01/);
	});
});

describe("assertUblXmlStructure (mode XML)", () => {
	const data = makeValidInvoiceData();

	function validUblXml(): string {
		return (
			`<?xml version="1.0" encoding="UTF-8"?>\n` +
			`<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"\n` +
			` xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"\n` +
			` xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">\n` +
			`<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>\n` +
			`<cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>\n` +
			`<cbc:ID>F-2026-00042</cbc:ID>\n` +
			`<cbc:IssueDate>2026-05-28</cbc:IssueDate>\n` +
			`<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>\n` +
			`<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>\n` +
			`<cac:AccountingSupplierParty><cac:Party><cbc:Name>Synclune</cbc:Name></cac:Party></cac:AccountingSupplierParty>\n` +
			`<cac:AccountingCustomerParty><cac:Party><cbc:Name>Alice Dupont</cbc:Name></cac:Party></cac:AccountingCustomerParty>\n` +
			`<cac:TaxTotal>\n<cbc:TaxAmount currencyID="EUR">0.00</cbc:TaxAmount>\n</cac:TaxTotal>\n` +
			`<cac:LegalMonetaryTotal>\n` +
			`<cbc:TaxExclusiveAmount currencyID="EUR">95.00</cbc:TaxExclusiveAmount>\n` +
			`<cbc:TaxInclusiveAmount currencyID="EUR">95.00</cbc:TaxInclusiveAmount>\n` +
			`<cbc:PayableAmount currencyID="EUR">0.00</cbc:PayableAmount>\n` +
			`</cac:LegalMonetaryTotal>\n` +
			`</Invoice>\n`
		);
	}

	it("accepts valid UBL XML", () => {
		expect(() => assertUblXmlStructure(validUblXml(), data)).not.toThrow();
	});

	it("rejects when CustomizationID is wrong", () => {
		const xml = validUblXml().replace(
			"urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0",
			"urn:cen.eu:en16931:2017",
		);
		expect(() => assertUblXmlStructure(xml, data)).toThrow(/BR-FR-PEPPOL-CUST/);
	});

	it("rejects when DocumentCurrencyCode is missing", () => {
		const xml = validUblXml().replace(
			"<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>\n",
			"",
		);
		expect(() => assertUblXmlStructure(xml, data)).toThrow(/BR-05/);
	});

	it("rejects when AccountingSupplierParty block is missing", () => {
		const xml = validUblXml().replace(
			/<cac:AccountingSupplierParty>[\s\S]*?<\/cac:AccountingSupplierParty>\n/,
			"",
		);
		expect(() => assertUblXmlStructure(xml, data)).toThrow(/BG-4/);
	});

	it("BR-FR-PEPPOL-CUR: rejects when an amount's currencyID drifts from document currency", () => {
		const xml = validUblXml().replace(
			`<cbc:TaxExclusiveAmount currencyID="EUR">`,
			`<cbc:TaxExclusiveAmount currencyID="USD">`,
		);
		expect(() => assertUblXmlStructure(xml, data)).toThrow(/BR-FR-PEPPOL-CUR/);
	});
});
