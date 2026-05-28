import { describe, expect, it } from "vitest";
import {
	validateFacturXBasicStructure,
	validateFacturXMinimumStructure,
	validateUblStructure,
	validateXmlStructure,
} from "../validate-invoice";
import { renderFacturXMinimum } from "../render-facturx";
import { renderFacturXBasic } from "../render-facturx-basic";
import { renderUblInvoice } from "../render-ubl";
import type { InvoiceData } from "../../types/invoice-data";

function makeInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "F-2026-00050",
		invoiceFormat: "FACTURX",
		issuedAt: new Date("2026-06-10T12:00:00Z"),
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
				productTitle: "Bracelet Or",
				productDescription: null,
				skuCode: "BRA-OR-001",
				variantInfo: { color: "Or", material: null, size: null },
				quantity: 1,
				unitPriceExclTax: 12000,
				discountAmount: 0,
				taxRate: 0,
				taxCategoryCode: "ZB",
				taxAmount: 0,
				lineTotalExclTax: 12000,
				lineTotalInclTax: 12000,
				hsCode: null,
				unitCode: null,
			},
		],
		totals: {
			subtotalExclTax: 12000,
			totalDiscount: 0,
			shippingExclTax: 0,
			shippingTax: 0,
			taxBreakdown: [
				{
					rate: 0,
					taxableAmount: 12000,
					taxAmount: 0,
					categoryCode: "ZB",
					exemptionReason: "Franchise art. 293 B CGI",
				},
			],
			totalExclTax: 12000,
			totalTax: 0,
			totalInclTax: 12000,
			totalPaid: 12000,
			amountDue: 0,
		},
		payment: {
			method: "CARD",
			paidAt: new Date("2026-06-10T12:00:00Z"),
			stripePaymentIntentId: "pi_test_v",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: { orderId: "order-v", orderNumber: "SYN-2026-0050", notes: null },
		...overrides,
	};
}

describe("validateXmlStructure — base helper", () => {
	it("rejects missing XML declaration", () => {
		const result = validateXmlStructure("<Foo/>", {
			rootElement: "Foo",
			requiredNamespaces: [],
			requiredTags: [],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors[0]?.code).toBe("STRUCT-001");
		}
	});

	it("rejects wrong root element", () => {
		const result = validateXmlStructure('<?xml version="1.0" encoding="UTF-8"?>\n<Other/>', {
			rootElement: "Foo",
			requiredNamespaces: [],
			requiredTags: [],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.code === "STRUCT-002")).toBe(true);
		}
	});

	it("rejects missing namespace", () => {
		const result = validateXmlStructure('<?xml version="1.0" encoding="UTF-8"?>\n<Foo/>', {
			rootElement: "Foo",
			requiredNamespaces: ["urn:test:1"],
			requiredTags: [],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.code === "STRUCT-003")).toBe(true);
		}
	});

	it("rejects empty required tag", () => {
		const result = validateXmlStructure(
			'<?xml version="1.0" encoding="UTF-8"?>\n<Foo><Bar></Bar></Foo>',
			{
				rootElement: "Foo",
				requiredNamespaces: [],
				requiredTags: ["Bar"],
			},
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.code === "STRUCT-004")).toBe(true);
		}
	});

	it("accepts a well-formed XML matching all expectations", () => {
		const result = validateXmlStructure(
			'<?xml version="1.0" encoding="UTF-8"?>\n<Foo xmlns="urn:test:1"><Bar>val</Bar></Foo>',
			{
				rootElement: "Foo",
				requiredNamespaces: ["urn:test:1"],
				requiredTags: ["Bar"],
			},
		);
		expect(result.ok).toBe(true);
	});
});

describe("validateFacturXMinimumStructure", () => {
	it("validates a freshly rendered Factur-X MINIMUM payload", () => {
		const xml = renderFacturXMinimum(makeInvoice());
		const result = validateFacturXMinimumStructure(xml);
		expect(result.ok).toBe(true);
	});

	it("rejects XML missing the CII namespace", () => {
		const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rsm:CrossIndustryInvoice/>';
		const result = validateFacturXMinimumStructure(xml);
		expect(result.ok).toBe(false);
	});

	it("rejects XML missing GrandTotalAmount BT-112", () => {
		const xml = renderFacturXMinimum(makeInvoice()).replace(
			/<ram:GrandTotalAmount>[^<]*<\/ram:GrandTotalAmount>/,
			"<ram:GrandTotalAmount></ram:GrandTotalAmount>",
		);
		const result = validateFacturXMinimumStructure(xml);
		expect(result.ok).toBe(false);
	});
});

describe("validateFacturXBasicStructure", () => {
	it("validates a freshly rendered BASIC payload", () => {
		const xml = renderFacturXBasic(makeInvoice());
		const result = validateFacturXBasicStructure(xml);
		expect(result.ok).toBe(true);
	});

	it("rejects a MINIMUM payload when BASIC is expected (no lines, wrong profile)", () => {
		const xml = renderFacturXMinimum(makeInvoice());
		const result = validateFacturXBasicStructure(xml);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			const codes = result.errors.map((e) => e.code);
			expect(codes).toContain("BASIC-001"); // pas de ligne BG-25
			expect(codes).toContain("BASIC-002"); // profil != basic
		}
	});
});

describe("validateUblStructure", () => {
	it("validates a freshly rendered UBL Invoice", () => {
		const xml = renderUblInvoice(makeInvoice());
		const result = validateUblStructure(xml);
		expect(result.ok).toBe(true);
	});

	it("validates a freshly rendered UBL CreditNote", () => {
		const xml = renderUblInvoice(
			makeInvoice({
				invoiceNumber: "A-2026-00010",
				precedingInvoice: {
					invoiceNumber: "F-2026-00050",
					issuedAt: new Date("2026-06-10T12:00:00Z"),
					reason: "Retour",
				},
			}),
		);
		const result = validateUblStructure(xml);
		expect(result.ok).toBe(true);
	});

	it("rejects XML without Peppol customisation namespace", () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><cbc:ID>F-1</cbc:ID></Invoice>`;
		const result = validateUblStructure(xml);
		expect(result.ok).toBe(false);
	});
});
