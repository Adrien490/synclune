import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InvoiceData } from "../../types/invoice-data";

// ============================================================================
// jsPDF instance mock — capture every text() call to assert PDF content
// ============================================================================

const { mockInstance, MockJsPDF } = vi.hoisted(() => {
	const inst = {
		internal: { pageSize: { getWidth: () => 210 } },
		setFontSize: vi.fn(),
		setFont: vi.fn(),
		setTextColor: vi.fn(),
		setDrawColor: vi.fn(),
		setLineWidth: vi.fn(),
		setFillColor: vi.fn(),
		setCreationDate: vi.fn(),
		setFileId: vi.fn(),
		setProperties: vi.fn(),
		text: vi.fn(),
		line: vi.fn(),
		rect: vi.fn(),
		getTextWidth: vi.fn().mockReturnValue(30),
		output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
	};
	class FakeJsPDF {
		internal = inst.internal;
		setFontSize = inst.setFontSize;
		setFont = inst.setFont;
		setTextColor = inst.setTextColor;
		setDrawColor = inst.setDrawColor;
		setLineWidth = inst.setLineWidth;
		setFillColor = inst.setFillColor;
		setCreationDate = inst.setCreationDate;
		setFileId = inst.setFileId;
		setProperties = inst.setProperties;
		text = inst.text;
		line = inst.line;
		rect = inst.rect;
		getTextWidth = inst.getTextWidth;
		output = inst.output;
	}
	return { mockInstance: inst, MockJsPDF: FakeJsPDF };
});

vi.mock("jspdf", () => ({ jsPDF: MockJsPDF }));

import { renderInvoicePdf } from "../render-invoice-pdf";

function getTextCalls(): string[] {
	return mockInstance.text.mock.calls.map((c) => c[0] as string);
}

function makeInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
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
			stripePaymentIntentId: "pi_test_1",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: { orderId: "order-1", orderNumber: "SYN-2026-0001", notes: null },
		...overrides,
	} as InvoiceData;
}

describe("renderInvoicePdf — output format", () => {
	beforeEach(() => {
		Object.values(mockInstance).forEach((val) => {
			if (typeof val === "function" && "mockClear" in val) {
				(val as ReturnType<typeof vi.fn>).mockClear();
			}
		});
		mockInstance.getTextWidth.mockReturnValue(30);
		mockInstance.output.mockReturnValue(new ArrayBuffer(100));
	});

	it("returns an ArrayBuffer", () => {
		const result = renderInvoicePdf(makeInvoice());
		expect(result).toBeInstanceOf(ArrayBuffer);
	});

	it("calls output('arraybuffer')", () => {
		renderInvoicePdf(makeInvoice());
		expect(mockInstance.output).toHaveBeenCalledWith("arraybuffer");
	});
});

describe("renderInvoicePdf — facture vs avoir title", () => {
	beforeEach(() => {
		Object.values(mockInstance).forEach((val) => {
			if (typeof val === "function" && "mockClear" in val) {
				(val as ReturnType<typeof vi.fn>).mockClear();
			}
		});
	});

	it("renders FACTURE title for F-YYYY-NNNNN", () => {
		renderInvoicePdf(makeInvoice());
		expect(getTextCalls()).toContainEqual("FACTURE");
	});

	it("renders AVOIR title for A-YYYY-NNNNN", () => {
		renderInvoicePdf(
			makeInvoice({
				invoiceNumber: "A-2026-00001",
				precedingInvoice: {
					invoiceNumber: "F-2026-00001",
					issuedAt: new Date("2026-05-26T10:00:00Z"),
					reason: "Annulation",
				},
			}),
		);
		const calls = getTextCalls();
		expect(calls).toContainEqual("AVOIR");
		expect(calls.some((t) => t.includes("F-2026-00001"))).toBe(true);
	});

	/**
	 * @regression credit-note-mention-2026-05-28
	 *
	 * Art. 272-I CGI : l'avoir doit référencer sans ambiguïté la facture annulée
	 * + le motif de l'annulation. Mention rendue en pied de page via
	 * `data.precedingInvoice.reason`.
	 */
	it("renders 'Avoir émis suite à : <reason> (facture F-YYYY-NNNNN)' for credit note", () => {
		renderInvoicePdf(
			makeInvoice({
				invoiceNumber: "A-2026-00007",
				precedingInvoice: {
					invoiceNumber: "F-2026-00042",
					issuedAt: new Date("2026-05-26T10:00:00Z"),
					reason: "Remboursement total",
				},
			}),
		);
		const calls = getTextCalls();
		expect(calls).toContainEqual(
			"Avoir émis suite à : Remboursement total (facture F-2026-00042).",
		);
		expect(calls).toContainEqual("Facture annulée : F-2026-00042");
	});
});

describe("renderInvoicePdf — vendor mentions (Art. 289 CGI)", () => {
	beforeEach(() => {
		Object.values(mockInstance).forEach((val) => {
			if (typeof val === "function" && "mockClear" in val) {
				(val as ReturnType<typeof vi.fn>).mockClear();
			}
		});
	});

	it("renders the trade name", () => {
		renderInvoicePdf(makeInvoice());
		expect(getTextCalls()).toContainEqual("Synclune");
	});

	it("renders SIRET formatted INSEE-style (NNN NNN NNN NNNNN)", () => {
		renderInvoicePdf(makeInvoice());
		expect(getTextCalls()).toContainEqual("SIRET : 839 183 027 00037");
	});

	it("renders VAT intra number when present", () => {
		renderInvoicePdf(makeInvoice());
		expect(getTextCalls()).toContainEqual("TVA intra. : FR35839183027");
	});

	it("renders franchise TVA mention (Art. 293 B CGI)", () => {
		renderInvoicePdf(makeInvoice());
		expect(getTextCalls()).toContainEqual("TVA non applicable, art. 293 B du CGI");
	});

	it("renders 'Entrepreneur individuel (micro-entreprise)' footer line", () => {
		renderInvoicePdf(makeInvoice());
		const calls = getTextCalls();
		expect(
			calls.some((t) => t.includes("Entrepreneur individuel") && t.includes("micro-entreprise")),
		).toBe(true);
	});
});

describe("renderInvoicePdf — buyer info", () => {
	beforeEach(() => {
		Object.values(mockInstance).forEach((val) => {
			if (typeof val === "function" && "mockClear" in val) {
				(val as ReturnType<typeof vi.fn>).mockClear();
			}
		});
	});

	it("renders the recipient name from billing address", () => {
		renderInvoicePdf(makeInvoice());
		expect(getTextCalls()).toContainEqual("Alice Dupont");
	});

	it("renders the billing address line + postal code + city", () => {
		renderInvoicePdf(makeInvoice());
		const calls = getTextCalls();
		expect(calls).toContainEqual("10 rue de la Paix");
		expect(calls).toContainEqual("75002 Paris");
	});

	it("renders B2B legalName when set", () => {
		renderInvoicePdf(
			makeInvoice({
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
		const calls = getTextCalls();
		expect(calls).toContainEqual("Acme SARL");
		expect(calls).toContainEqual("SIRET : 12345678900012");
		expect(calls).toContainEqual("TVA : FR00123456789");
	});
});

describe("renderInvoicePdf — lines and totals", () => {
	beforeEach(() => {
		Object.values(mockInstance).forEach((val) => {
			if (typeof val === "function" && "mockClear" in val) {
				(val as ReturnType<typeof vi.fn>).mockClear();
			}
		});
	});

	it("renders product title + variant info", () => {
		renderInvoicePdf(makeInvoice());
		const calls = getTextCalls();
		expect(calls).toContainEqual("Collier Lune d'Argent");
		expect(calls.some((t) => t.includes("Argent") && t.includes("925"))).toBe(true);
	});

	it("renders 'TVA (non applicable)' when totalTax is 0 (franchise)", () => {
		renderInvoicePdf(makeInvoice());
		expect(getTextCalls()).toContainEqual("TVA (non applicable)");
	});

	it("renders explicit TVA amount when totalTax > 0", () => {
		const baseSeller = makeInvoice().seller;
		renderInvoicePdf(
			makeInvoice({
				// Régime réel : aucune mention d'exonération → la ligne TVA affiche le
				// montant, piloté par le régime et non par totalTax (EINV-F3).
				seller: { ...baseSeller, vatExemptionText: null },
				lines: [
					{
						lineNumber: 1,
						productTitle: "Item",
						productDescription: null,
						skuCode: null,
						variantInfo: { color: null, material: null, size: null },
						quantity: 1,
						unitPriceExclTax: 10000,
						discountAmount: 0,
						taxRate: 2000,
						taxCategoryCode: "S",
						taxAmount: 2000,
						lineTotalExclTax: 10000,
						lineTotalInclTax: 12000,
						hsCode: null,
						unitCode: null,
					},
				],
				totals: {
					subtotalExclTax: 10000,
					totalDiscount: 0,
					shippingExclTax: 0,
					shippingTax: 0,
					taxBreakdown: [
						{
							rate: 2000,
							taxableAmount: 10000,
							taxAmount: 2000,
							categoryCode: "S",
							exemptionReason: null,
						},
					],
					totalExclTax: 10000,
					totalTax: 2000,
					totalInclTax: 12000,
					totalPaid: 12000,
					amountDue: 0,
				},
			}),
		);
		const calls = getTextCalls();
		// "TVA" appears alone (not "TVA (non applicable)")
		expect(calls).toContainEqual("TVA");
		expect(calls).not.toContainEqual("TVA (non applicable)");
	});

	it("renders 'Offerts' when shipping is free", () => {
		renderInvoicePdf(
			makeInvoice({
				totals: {
					...makeInvoice().totals,
					shippingExclTax: 0,
				},
			}),
		);
		expect(getTextCalls()).toContainEqual("Offerts");
	});
});
