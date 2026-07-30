import { describe, expect, it } from "vitest";
import { invoiceDataSchema } from "../invoice.schema";
import type { InvoiceData } from "../../types/invoice-data";
import { INVOICE_DATA_FORMAT_VERSION } from "@/modules/invoices/constants/invoice-data-format";

function makeValidB2cInvoice(): InvoiceData {
	return {
		formatVersion: INVOICE_DATA_FORMAT_VERSION,
		invoiceNumber: "F-2026-00001",
		invoiceFormat: "PDF",
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
			vatExemptionText: "TVA non applicable, art. 293 B du CGI",
			bankIban: null,
			bankBic: null,
		},
		buyer: {
			legalName: null,
			firstName: "Alice",
			lastName: "Dupont",
			email: "alice@example.com",
			phone: null,
			siret: null,
			vatNumber: null,
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
				variantInfo: { color: "Argent", material: "Argent 925", size: null },
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
			stripePaymentIntentId: "pi_test_123",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: {
			// cuid-like : orderId est validé en z.cuid2() (les IDs à tirets échouent)
			orderId: "ckwq2x5g9000001mh2z3v8y1a",
			orderNumber: "SYN-2026-0001",
			notes: null,
		},
	};
}

describe("invoiceDataSchema", () => {
	it("accepts a valid B2C franchise invoice", () => {
		const result = invoiceDataSchema.safeParse(makeValidB2cInvoice());
		expect(result.success).toBe(true);
	});

	it("accepts a credit note (A-YYYY-NNNNN) with precedingInvoice", () => {
		const invoice = makeValidB2cInvoice();
		invoice.invoiceNumber = "A-2026-00001";
		invoice.precedingInvoice = {
			invoiceNumber: "F-2026-00001",
			issuedAt: new Date("2026-05-26T10:00:00Z"),
			reason: "Annulation suite à remboursement total",
		};
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(true);
	});

	it("rejects malformed invoiceNumber", () => {
		const invoice = makeValidB2cInvoice();
		invoice.invoiceNumber = "INVALID-2026-1";
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(false);
	});

	it("rejects empty lines array", () => {
		const invoice = makeValidB2cInvoice();
		invoice.lines = [];
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(false);
	});

	it("rejects when sum of line totals != totals.subtotalExclTax (incohérence)", () => {
		const invoice = makeValidB2cInvoice();
		invoice.totals.subtotalExclTax = 99999; // forced mismatch
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain("Incohérence comptable");
		}
	});

	it("rejects unknown tax category code", () => {
		const invoice = makeValidB2cInvoice();
		// @ts-expect-error — intentional bad value
		invoice.lines[0]!.taxCategoryCode = "XX";
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(false);
	});

	it("rejects invalid SIREN format on seller", () => {
		const invoice = makeValidB2cInvoice();
		invoice.seller.siren = "839 183 027"; // spaces forbidden, must be canonical
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(false);
	});

	it("rejects negative tax amount", () => {
		const invoice = makeValidB2cInvoice();
		invoice.lines[0]!.taxAmount = -100;
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(false);
	});

	it("rejects non-EUR currency", () => {
		const invoice = makeValidB2cInvoice();
		// @ts-expect-error — intentional bad value
		invoice.currency = "USD";
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(false);
	});

	it("rejects malformed country code (must be ISO 3166-1 alpha-2)", () => {
		const invoice = makeValidB2cInvoice();
		invoice.shippingAddress.countryCode = "France";
		const result = invoiceDataSchema.safeParse(invoice);
		expect(result.success).toBe(false);
	});
});
