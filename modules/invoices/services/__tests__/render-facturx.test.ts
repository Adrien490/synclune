import { describe, expect, it } from "vitest";
import { renderFacturXMinimum } from "../render-facturx";
import type { InvoiceData } from "../../types/invoice-data";

function makeB2cInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "F-2026-00001",
		invoiceFormat: "FACTURX",
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
			stripePaymentIntentId: "pi_test_1",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: { orderId: "order-1", orderNumber: "SYN-2026-0001", notes: null },
		...overrides,
	} as InvoiceData;
}

describe("renderFacturXMinimum — structure", () => {
	it("produces well-formed XML starting with <?xml declaration", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
	});

	it("declares the four required CEFACT namespaces", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain(
			'xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"',
		);
		expect(xml).toContain(
			'xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"',
		);
		expect(xml).toContain(
			'xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"',
		);
		expect(xml).toContain('xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"');
	});

	it("identifies the Factur-X MINIMUM profile (BT-24)", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain("<ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>");
	});
});

describe("renderFacturXMinimum — invoice header (BT-1, BT-2, BT-3)", () => {
	it("BT-1 invoice number", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain("<ram:ID>F-2026-00001</ram:ID>");
	});

	it("BT-3 type code 380 for invoice (F-)", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain("<ram:TypeCode>380</ram:TypeCode>");
	});

	it("BT-3 type code 381 for credit note (A-)", () => {
		const xml = renderFacturXMinimum(
			makeB2cInvoice({
				invoiceNumber: "A-2026-00001",
				precedingInvoice: {
					invoiceNumber: "F-2026-00001",
					issuedAt: new Date("2026-05-26T10:00:00Z"),
					reason: "Annulation",
				},
			}),
		);
		expect(xml).toContain("<ram:TypeCode>381</ram:TypeCode>");
	});

	it("BT-2 issue date in CEFACT 102 format (YYYYMMDD, UTC)", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain('<udt:DateTimeString format="102">20260527</udt:DateTimeString>');
	});
});

describe("renderFacturXMinimum — seller (BT-27..BT-31)", () => {
	it("BT-27 seller name (trade name)", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain("<ram:Name>Synclune</ram:Name>");
	});

	it("BT-30 SIREN with schemeID '0002' (SIRENE registry)", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain('<ram:ID schemeID="0002">839183027</ram:ID>');
	});

	it("BT-31 VAT number with schemeID 'VA'", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain('<ram:ID schemeID="VA">FR35839183027</ram:ID>');
	});

	it("renders the full structured seller address", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain("<ram:PostcodeCode>44100</ram:PostcodeCode>");
		expect(xml).toContain("<ram:LineOne>77 Boulevard du Tertre</ram:LineOne>");
		expect(xml).toContain("<ram:CityName>Nantes</ram:CityName>");
		expect(xml).toContain("<ram:CountryID>FR</ram:CountryID>");
	});

	it("omits VAT tax registration block when seller has no vatNumber", () => {
		const xml = renderFacturXMinimum(
			makeB2cInvoice({
				seller: { ...makeB2cInvoice().seller, vatNumber: null },
			}),
		);
		// Le bloc SellerTradeParty ne doit pas contenir de schemeID="VA".
		const sellerBlock = xml.split("</ram:SellerTradeParty>")[0]!;
		expect(sellerBlock).not.toContain('schemeID="VA"');
	});
});

describe("renderFacturXMinimum — buyer", () => {
	it("B2C buyer renders firstName + lastName concatenated as BT-44", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		const buyerBlock = xml.split("<ram:BuyerTradeParty>")[1]!.split("</ram:BuyerTradeParty>")[0]!;
		expect(buyerBlock).toContain("<ram:Name>Alice Dupont</ram:Name>");
		// B2C : pas de SIREN ni VAT côté buyer
		expect(buyerBlock).not.toContain('schemeID="0002"');
		expect(buyerBlock).not.toContain('schemeID="VA"');
	});

	it("B2B buyer uses legalName as BT-44 + adds SIREN + VAT", () => {
		const xml = renderFacturXMinimum(
			makeB2cInvoice({
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
			}),
		);
		const buyerBlock = xml.split("<ram:BuyerTradeParty>")[1]!.split("</ram:BuyerTradeParty>")[0]!;
		expect(buyerBlock).toContain("<ram:Name>Acme SARL</ram:Name>");
		expect(buyerBlock).toContain('<ram:ID schemeID="0002">123456789</ram:ID>');
		expect(buyerBlock).toContain('<ram:ID schemeID="VA">FR00123456789</ram:ID>');
	});
});

describe("renderFacturXMinimum — monetary summation (BT-109..BT-115)", () => {
	it("renders BT-109 TaxBasisTotalAmount in decimal format", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain("<ram:TaxBasisTotalAmount>95.00</ram:TaxBasisTotalAmount>");
	});

	it("renders BT-110 TaxTotalAmount with currencyID attribute", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain('<ram:TaxTotalAmount currencyID="EUR">0.00</ram:TaxTotalAmount>');
	});

	it("renders BT-112 GrandTotalAmount = totalInclTax", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain("<ram:GrandTotalAmount>95.00</ram:GrandTotalAmount>");
	});

	it("renders BT-115 DuePayableAmount = 0 when already paid", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
		expect(xml).toContain("<ram:DuePayableAmount>0.00</ram:DuePayableAmount>");
	});

	it("formats large amounts correctly (1234567 cents → 12345.67)", () => {
		const xml = renderFacturXMinimum(
			makeB2cInvoice({
				totals: {
					...makeB2cInvoice().totals,
					totalInclTax: 1234567,
					totalExclTax: 1234567,
					totalTax: 0,
					totalPaid: 1234567,
					amountDue: 0,
				},
			}),
		);
		expect(xml).toContain("<ram:GrandTotalAmount>12345.67</ram:GrandTotalAmount>");
	});

	it("formats amounts under €1 correctly (50 cents → 0.50)", () => {
		const xml = renderFacturXMinimum(
			makeB2cInvoice({
				totals: {
					...makeB2cInvoice().totals,
					totalInclTax: 50,
					totalExclTax: 50,
					totalTax: 0,
					totalPaid: 50,
					amountDue: 0,
				},
			}),
		);
		expect(xml).toContain("<ram:GrandTotalAmount>0.50</ram:GrandTotalAmount>");
	});
});

describe("renderFacturXMinimum — XML escaping (defense vs injection)", () => {
	it("escapes & in product title / customer name", () => {
		const xml = renderFacturXMinimum(
			makeB2cInvoice({
				buyer: {
					...makeB2cInvoice().buyer,
					firstName: "A&lice",
					lastName: "Dupont",
				},
			}),
		);
		expect(xml).toContain("A&amp;lice Dupont");
		expect(xml).not.toContain("A&lice"); // pas de version non-échappée
	});

	it("escapes < and > characters", () => {
		const xml = renderFacturXMinimum(
			makeB2cInvoice({
				seller: { ...makeB2cInvoice().seller, tradeName: "<Synclune>" },
			}),
		);
		expect(xml).toContain("&lt;Synclune&gt;");
	});

	it("escapes single quotes (matters for attribute values)", () => {
		const xml = renderFacturXMinimum(
			makeB2cInvoice({
				buyer: { ...makeB2cInvoice().buyer, firstName: "L'", lastName: "Apos" },
			}),
		);
		expect(xml).toContain("L&apos; Apos");
	});
});

describe("renderFacturXMinimum — snapshot (golden file pour drift detection)", () => {
	it("produit le XML attendu pour la fixture B2C franchise", () => {
		const xml = renderFacturXMinimum(makeB2cInvoice());
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
					<ram:ID>F-2026-00001</ram:ID>
					<ram:TypeCode>380</ram:TypeCode>
					<ram:IssueDateTime>
						<udt:DateTimeString format="102">20260527</udt:DateTimeString>
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
