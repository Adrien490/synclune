import { describe, expect, it } from "vitest";
import { renderUblInvoice } from "../render-ubl";
import type { InvoiceData } from "../../types/invoice-data";

function makeB2bInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "F-2026-00200",
		invoiceFormat: "UBL",
		issuedAt: new Date("2026-06-15T14:00:00Z"),
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
			bankIban: "FR7630001007941234567890185",
			bankBic: "BDFEFRPPCCT",
		},
		buyer: {
			type: "B2B",
			legalName: "Acme SARL",
			firstName: "Bob",
			lastName: "Martin",
			email: "bob@acme.com",
			phone: null,
			siren: "123456789",
			siret: "12345678900012",
			vatNumber: "FR00123456789",
			eInvoicingAddress: null,
			eInvoicingPlatformId: null,
			publicEntityId: null,
			chorusServiceCode: null,
		},
		shippingAddress: {
			recipientName: "Acme SARL",
			line1: "1 rue de Rivoli",
			line2: null,
			postalCode: "75001",
			city: "Paris",
			countryCode: "FR",
		},
		billingAddress: {
			recipientName: "Acme SARL",
			line1: "1 rue de Rivoli",
			line2: "Bât. A",
			postalCode: "75001",
			city: "Paris",
			countryCode: "FR",
		},
		lines: [
			{
				lineNumber: 1,
				productTitle: "Bague Saphir",
				productDescription: "Or 18 carats, saphir 0.5ct",
				skuCode: "BAG-SAP-001",
				variantInfo: { color: "Or jaune", material: "Or 18ct", size: "52" },
				quantity: 1,
				unitPriceExclTax: 50000,
				discountAmount: 0,
				taxRate: 0,
				taxCategoryCode: "ZB",
				taxAmount: 0,
				lineTotalExclTax: 50000,
				lineTotalInclTax: 50000,
				hsCode: "7113190000",
				unitCode: "H87",
			},
		],
		totals: {
			subtotalExclTax: 50000,
			totalDiscount: 0,
			shippingExclTax: 0,
			shippingTax: 0,
			taxBreakdown: [
				{
					rate: 0,
					taxableAmount: 50000,
					taxAmount: 0,
					categoryCode: "ZB",
					exemptionReason: "Franchise art. 293 B CGI",
				},
			],
			totalExclTax: 50000,
			totalTax: 0,
			totalInclTax: 50000,
			totalPaid: 50000,
			amountDue: 0,
		},
		payment: {
			method: "CARD",
			paidAt: new Date("2026-06-15T14:00:00Z"),
			stripePaymentIntentId: "pi_test_3",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: { orderId: "order-3", orderNumber: "SYN-2026-0099", notes: null },
		...overrides,
	};
}

describe("renderUblInvoice — UBL 2.1 structure", () => {
	it("starts with XML declaration", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
	});

	it("uses UBL Invoice root namespace for normal invoices", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain(
			'<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
		);
	});

	it("uses UBL CreditNote root namespace for credit notes (A-prefix)", () => {
		const xml = renderUblInvoice(
			makeB2bInvoice({
				invoiceNumber: "A-2026-00005",
				precedingInvoice: {
					invoiceNumber: "F-2026-00200",
					issuedAt: new Date("2026-06-15T14:00:00Z"),
					reason: "Retour produit",
				},
			}),
		);
		expect(xml).toContain(
			'<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"',
		);
		expect(xml).toContain("<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>");
		expect(xml).toContain("<cac:CreditNoteLine>");
		expect(xml).toContain("<cbc:CreditedQuantity");
	});

	it("declares Peppol BIS Billing 3.0 customization", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain(
			"<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>",
		);
		expect(xml).toContain(
			"<cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>",
		);
	});

	it("renders BT-1 invoice number, BT-2 issue date ISO, BT-3 type code 380", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain("<cbc:ID>F-2026-00200</cbc:ID>");
		expect(xml).toContain("<cbc:IssueDate>2026-06-15</cbc:IssueDate>");
		expect(xml).toContain("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>");
	});

	it("BT-5 currency code", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain("<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>");
	});

	it("BG-3 BillingReference present for credit notes", () => {
		const xml = renderUblInvoice(
			makeB2bInvoice({
				invoiceNumber: "A-2026-00005",
				precedingInvoice: {
					invoiceNumber: "F-2026-00200",
					issuedAt: new Date("2026-06-15T14:00:00Z"),
					reason: "Retour produit",
				},
			}),
		);
		expect(xml).toContain("<cac:BillingReference>");
		expect(xml).toContain("<cbc:ID>F-2026-00200</cbc:ID>");
	});
});

describe("renderUblInvoice — supplier party (BG-4)", () => {
	it("BT-34 EndpointID uses schemeID='0009' (SIRET-FR ICD)", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain('<cbc:EndpointID schemeID="0009">83918302700037</cbc:EndpointID>');
	});

	it("BT-30 SIREN in PartyLegalEntity with schemeID='0002'", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain('<cbc:CompanyID schemeID="0002">839183027</cbc:CompanyID>');
	});

	it("BT-31 VAT number in PartyTaxScheme", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		const supplierBlock = xml.split("</cac:AccountingSupplierParty>")[0] ?? "";
		expect(supplierBlock).toContain("<cbc:CompanyID>FR35839183027</cbc:CompanyID>");
	});

	it("seller address rendered into PostalAddress", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain("<cbc:StreetName>77 Boulevard du Tertre</cbc:StreetName>");
		expect(xml).toContain("<cbc:PostalZone>44100</cbc:PostalZone>");
		expect(xml).toContain("<cbc:IdentificationCode>FR</cbc:IdentificationCode>");
	});
});

describe("renderUblInvoice — customer party (BG-7)", () => {
	it("B2B customer renders SIRET endpoint + SIREN legalEntity + VAT taxScheme", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		const customerBlock =
			xml.split("<cac:AccountingCustomerParty>")[1]?.split("</cac:AccountingCustomerParty>")[0] ??
			"";
		expect(customerBlock).toContain(
			'<cbc:EndpointID schemeID="0009">12345678900012</cbc:EndpointID>',
		);
		expect(customerBlock).toContain('<cbc:CompanyID schemeID="0002">123456789</cbc:CompanyID>');
		expect(customerBlock).toContain("<cbc:CompanyID>FR00123456789</cbc:CompanyID>");
	});

	it("B2C customer skips EndpointID and PartyLegalEntity", () => {
		const xml = renderUblInvoice(
			makeB2bInvoice({
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
				billingAddress: {
					recipientName: "Alice Dupont",
					line1: "10 rue de la Paix",
					line2: null,
					postalCode: "75002",
					city: "Paris",
					countryCode: "FR",
				},
			}),
		);
		const customerBlock =
			xml.split("<cac:AccountingCustomerParty>")[1]?.split("</cac:AccountingCustomerParty>")[0] ??
			"";
		expect(customerBlock).not.toContain('schemeID="0009"');
		expect(customerBlock).not.toContain("<cac:PartyLegalEntity>");
		expect(customerBlock).toContain("<cbc:Name>Alice Dupont</cbc:Name>");
	});

	it("renders AdditionalStreetName for line2 when present", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain("<cbc:AdditionalStreetName>Bât. A</cbc:AdditionalStreetName>");
	});
});

describe("renderUblInvoice — payment means (BG-16)", () => {
	it("uses code 30 (SEPA credit transfer) when IBAN present", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain("<cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>");
		expect(xml).toContain("<cbc:ID>FR7630001007941234567890185</cbc:ID>");
		expect(xml).toContain("<cbc:ID>BDFEFRPPCCT</cbc:ID>");
	});

	it("uses code 48 (bank card) when IBAN absent (Stripe checkout case)", () => {
		const xml = renderUblInvoice(
			makeB2bInvoice({
				seller: {
					...makeB2bInvoice().seller,
					bankIban: null,
					bankBic: null,
				},
			}),
		);
		expect(xml).toContain("<cbc:PaymentMeansCode>48</cbc:PaymentMeansCode>");
		expect(xml).not.toContain("<cac:PayeeFinancialAccount>");
	});
});

describe("renderUblInvoice — tax aggregation (BG-22 / BG-23)", () => {
	it("TaxTotal with TaxAmount + TaxSubtotal per category", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain('<cbc:TaxAmount currencyID="EUR">0.00</cbc:TaxAmount>');
		expect(xml).toContain('<cbc:TaxableAmount currencyID="EUR">500.00</cbc:TaxableAmount>');
		expect(xml).toContain("<cbc:ID>ZB</cbc:ID>");
		expect(xml).toContain("<cbc:Percent>0.00</cbc:Percent>");
		expect(xml).toContain(
			"<cbc:TaxExemptionReason>Franchise art. 293 B CGI</cbc:TaxExemptionReason>",
		);
	});
});

describe("renderUblInvoice — legal monetary total (BG-22)", () => {
	it("BT-106 LineExtensionAmount, BT-109 TaxExclusive, BT-112 TaxInclusive, BT-115 Payable", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain(
			'<cbc:LineExtensionAmount currencyID="EUR">500.00</cbc:LineExtensionAmount>',
		);
		expect(xml).toContain(
			'<cbc:TaxExclusiveAmount currencyID="EUR">500.00</cbc:TaxExclusiveAmount>',
		);
		expect(xml).toContain(
			'<cbc:TaxInclusiveAmount currencyID="EUR">500.00</cbc:TaxInclusiveAmount>',
		);
		expect(xml).toContain('<cbc:PayableAmount currencyID="EUR">0.00</cbc:PayableAmount>');
	});

	it("BT-107 AllowanceTotalAmount included when totalDiscount > 0", () => {
		const base = makeB2bInvoice();
		const xml = renderUblInvoice({
			...base,
			totals: { ...base.totals, totalDiscount: 1500 },
		});
		expect(xml).toContain(
			'<cbc:AllowanceTotalAmount currencyID="EUR">15.00</cbc:AllowanceTotalAmount>',
		);
	});

	it("BT-107 omitted when totalDiscount = 0", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).not.toContain("<cbc:AllowanceTotalAmount");
	});
});

describe("renderUblInvoice — invoice lines (BG-25)", () => {
	it("BT-126 line ID + BT-129/BT-130 quantity with unitCode", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain("<cbc:ID>1</cbc:ID>");
		expect(xml).toContain('<cbc:InvoicedQuantity unitCode="H87">1</cbc:InvoicedQuantity>');
	});

	it("BT-131 line extension amount per line", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain(
			'<cbc:LineExtensionAmount currencyID="EUR">500.00</cbc:LineExtensionAmount>',
		);
	});

	it("BT-153 item name + BT-154 description", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain("<cbc:Name>Bague Saphir</cbc:Name>");
		expect(xml).toContain("<cbc:Description>Or 18 carats, saphir 0.5ct</cbc:Description>");
	});

	it("BT-158 HS-code as CommodityClassification with listID='HS'", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain(
			'<cbc:ItemClassificationCode listID="HS">7113190000</cbc:ItemClassificationCode>',
		);
	});

	it("BT-146 net unit price", () => {
		const xml = renderUblInvoice(makeB2bInvoice());
		expect(xml).toContain('<cbc:PriceAmount currencyID="EUR">500.00</cbc:PriceAmount>');
	});

	it("falls back to unitCode H87 when line.unitCode is null", () => {
		const xml = renderUblInvoice(
			makeB2bInvoice({
				lines: [
					{
						...makeB2bInvoice().lines[0]!,
						unitCode: null,
					},
				],
			}),
		);
		expect(xml).toContain('unitCode="H87"');
	});
});

describe("renderUblInvoice — XML escaping", () => {
	it("escapes & < > in field values", () => {
		const xml = renderUblInvoice(
			makeB2bInvoice({
				buyer: {
					...makeB2bInvoice().buyer,
					legalName: "Acme & Co <SARL>",
				},
			}),
		);
		expect(xml).toContain("Acme &amp; Co &lt;SARL&gt;");
	});
});

describe("renderUblInvoice — determinism", () => {
	it("same InvoiceData → same XML bytes", () => {
		const data = makeB2bInvoice();
		const xml1 = renderUblInvoice(data);
		const xml2 = renderUblInvoice(data);
		expect(xml1).toBe(xml2);
	});
});
