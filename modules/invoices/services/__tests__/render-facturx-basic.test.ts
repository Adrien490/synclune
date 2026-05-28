import { describe, expect, it } from "vitest";
import { renderFacturXBasic } from "../render-facturx-basic";
import type { InvoiceData } from "../../types/invoice-data";

function makeB2bInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "F-2026-00100",
		invoiceFormat: "FACTURX",
		issuedAt: new Date("2026-06-12T10:00:00Z"),
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
			line2: null,
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
				quantity: 2,
				unitPriceExclTax: 50000,
				discountAmount: 0,
				taxRate: 0,
				taxCategoryCode: "ZB",
				taxAmount: 0,
				lineTotalExclTax: 100000,
				lineTotalInclTax: 100000,
				hsCode: "7113190000",
				unitCode: "H87",
			},
			{
				lineNumber: 2,
				productTitle: "Collier Argent",
				productDescription: null,
				skuCode: "COL-ARG-002",
				variantInfo: { color: "Argent", material: "Argent 925", size: null },
				quantity: 1,
				unitPriceExclTax: 8000,
				discountAmount: 0,
				taxRate: 0,
				taxCategoryCode: "ZB",
				taxAmount: 0,
				lineTotalExclTax: 8000,
				lineTotalInclTax: 8000,
				hsCode: null,
				unitCode: null,
			},
		],
		totals: {
			subtotalExclTax: 108000,
			totalDiscount: 0,
			shippingExclTax: 0,
			shippingTax: 0,
			taxBreakdown: [
				{
					rate: 0,
					taxableAmount: 108000,
					taxAmount: 0,
					categoryCode: "ZB",
					exemptionReason: "Franchise art. 293 B CGI",
				},
			],
			totalExclTax: 108000,
			totalTax: 0,
			totalInclTax: 108000,
			totalPaid: 108000,
			amountDue: 0,
		},
		payment: {
			method: "CARD",
			paidAt: new Date("2026-06-12T10:00:00Z"),
			stripePaymentIntentId: "pi_test_2",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: { orderId: "order-2", orderNumber: "SYN-2026-0042", notes: null },
		...overrides,
	};
}

describe("renderFacturXBasic — profile BASIC EN 16931", () => {
	it("declares the BASIC profile in BT-24", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain(
			"<ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>",
		);
	});

	it("BT-3 type code 380 for invoice / 381 for credit note", () => {
		const inv = renderFacturXBasic(makeB2bInvoice());
		expect(inv).toContain("<ram:TypeCode>380</ram:TypeCode>");
		const cn = renderFacturXBasic(
			makeB2bInvoice({
				invoiceNumber: "A-2026-00010",
				precedingInvoice: {
					invoiceNumber: "F-2026-00100",
					issuedAt: new Date("2026-06-12T10:00:00Z"),
					reason: "Retour",
				},
			}),
		);
		expect(cn).toContain("<ram:TypeCode>381</ram:TypeCode>");
	});
});

describe("renderFacturXBasic — invoice lines (BG-25)", () => {
	it("renders one IncludedSupplyChainTradeLineItem per line", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		const matches = xml.match(/<ram:IncludedSupplyChainTradeLineItem>/g) ?? [];
		expect(matches.length).toBe(2);
	});

	it("BT-126 line ID is sequential", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain("<ram:LineID>1</ram:LineID>");
		expect(xml).toContain("<ram:LineID>2</ram:LineID>");
	});

	it("BT-153 item name = productTitle", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain("<ram:Name>Bague Saphir</ram:Name>");
	});

	it("BT-154 item description rendered when present, omitted otherwise", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain("<ram:Description>Or 18 carats, saphir 0.5ct</ram:Description>");
		// Ligne 2 sans description : on tombe sur le variant string (couleur/matériau).
		expect(xml).toContain("<ram:Description>Argent / Argent 925</ram:Description>");
	});

	it("BT-158 HS-code rendered with listID='HS' when present", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain('<ram:ClassCode listID="HS">7113190000</ram:ClassCode>');
	});

	it("does NOT render the classification block when hsCode is null", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		// Ligne 2 (Collier Argent) a hsCode null — pas de DesignatedProductClassification.
		// On vérifie que le bloc apparaît exactement une fois (uniquement ligne 1).
		const matches = xml.match(/<ram:DesignatedProductClassification>/g) ?? [];
		expect(matches.length).toBe(1);
	});

	it("BT-129/BT-130 quantity rendered with unitCode UN/ECE Rec 20", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain('<ram:BilledQuantity unitCode="H87">2</ram:BilledQuantity>');
	});

	it("falls back to unitCode='H87' when line.unitCode is null (bijoux default)", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		// Ligne 2 unitCode = null → fallback H87
		expect(xml).toContain('<ram:BilledQuantity unitCode="H87">1</ram:BilledQuantity>');
	});

	it("BT-146 net unit price in decimal format", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain("<ram:ChargeAmount>500.00</ram:ChargeAmount>");
	});

	it("BT-131 line total net amount", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain("<ram:LineTotalAmount>1000.00</ram:LineTotalAmount>");
		expect(xml).toContain("<ram:LineTotalAmount>80.00</ram:LineTotalAmount>");
	});

	it("BT-151 + BT-152 tax category + rate on each line", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		// Chaque ligne porte sa propre ApplicableTradeTax avec CategoryCode + Rate.
		const lineTaxBlocks = xml.match(
			/<ram:CategoryCode>ZB<\/ram:CategoryCode>\s*<ram:RateApplicablePercent>0\.00<\/ram:RateApplicablePercent>/g,
		);
		expect(lineTaxBlocks).not.toBeNull();
		expect(lineTaxBlocks!.length).toBeGreaterThanOrEqual(2);
	});
});

describe("renderFacturXBasic — header tax breakdown (BG-22)", () => {
	it("BT-116 BasisAmount + BT-117 CalculatedAmount + BT-118 CategoryCode + BT-119 Rate", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain('<ram:CalculatedAmount currencyID="EUR">0.00</ram:CalculatedAmount>');
		expect(xml).toContain('<ram:BasisAmount currencyID="EUR">1080.00</ram:BasisAmount>');
	});

	it("BT-120 ExemptionReason rendered when category is exempt", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain("<ram:ExemptionReason>Franchise art. 293 B CGI</ram:ExemptionReason>");
	});
});

describe("renderFacturXBasic — monetary summation (BT-106..BT-115)", () => {
	it("BT-106 LineTotalAmount = sum of line nets", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		// BT-106 apparaît dans la summation header avec la valeur subtotalExclTax = 1080.00
		const summation = xml.split("SpecifiedTradeSettlementHeaderMonetarySummation>")[1] ?? "";
		expect(summation).toContain("<ram:LineTotalAmount>1080.00</ram:LineTotalAmount>");
	});

	it("BT-109 TaxBasisTotalAmount = totalExclTax", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain("<ram:TaxBasisTotalAmount>1080.00</ram:TaxBasisTotalAmount>");
	});

	it("BT-112 GrandTotalAmount = totalInclTax", () => {
		const xml = renderFacturXBasic(makeB2bInvoice());
		expect(xml).toContain("<ram:GrandTotalAmount>1080.00</ram:GrandTotalAmount>");
	});
});

describe("renderFacturXBasic — escaping", () => {
	it("escapes & < > in product titles and descriptions", () => {
		const xml = renderFacturXBasic(
			makeB2bInvoice({
				lines: [
					{
						lineNumber: 1,
						productTitle: "Bague <Saphir & Or>",
						productDescription: null,
						skuCode: null,
						variantInfo: { color: null, material: null, size: null },
						quantity: 1,
						unitPriceExclTax: 1000,
						discountAmount: 0,
						taxRate: 0,
						taxCategoryCode: "ZB",
						taxAmount: 0,
						lineTotalExclTax: 1000,
						lineTotalInclTax: 1000,
						hsCode: null,
						unitCode: null,
					},
				],
				totals: {
					subtotalExclTax: 1000,
					totalDiscount: 0,
					shippingExclTax: 0,
					shippingTax: 0,
					taxBreakdown: [
						{
							rate: 0,
							taxableAmount: 1000,
							taxAmount: 0,
							categoryCode: "ZB",
							exemptionReason: "Franchise art. 293 B CGI",
						},
					],
					totalExclTax: 1000,
					totalTax: 0,
					totalInclTax: 1000,
					totalPaid: 1000,
					amountDue: 0,
				},
			}),
		);
		expect(xml).toContain("<ram:Name>Bague &lt;Saphir &amp; Or&gt;</ram:Name>");
		expect(xml).not.toContain("<Saphir & Or>");
	});
});

describe("renderFacturXBasic — determinism", () => {
	it("same InvoiceData → same XML bytes", () => {
		const data = makeB2bInvoice();
		const xml1 = renderFacturXBasic(data);
		const xml2 = renderFacturXBasic(data);
		expect(xml1).toBe(xml2);
	});
});
