import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import type { InvoiceData } from "../../types/invoice-data";

// IMPORTANT : ce test n'utilise PAS le mock jsPDF de `render-invoice-pdf.test.ts`.
// Le déterminisme se vérifie au niveau du buffer binaire produit par la vraie
// librairie jsPDF (CreationDate / FileId / Producer auto-injectés sont les
// vraies sources de non-déterminisme à neutraliser).
import { renderInvoicePdf } from "../render-invoice-pdf";

/**
 * @regression invoice-pdf-deterministic-2026-05-28
 *
 * Garantit qu'un même `InvoiceData` produit deux fois le même PDF bit-à-bit
 * (Art. L102 B LPF — facture restituable à l'identique sur 10 ans).
 *
 * Sources de non-déterminisme jsPDF couvertes :
 *   - `/CreationDate` (Date.now() par défaut) → figé via setCreationDate
 *   - `/ID` (Math.random + Date.now()) → figé via setFileId(md5)
 *   - Format date français Intl (espace insécable U+202F drift) → manuel
 *   - Format euros Intl → manuel
 */
function makeInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "F-2026-00042",
		invoiceFormat: "PDF",
		issuedAt: new Date("2026-05-28T10:30:00Z"),
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
				variantInfo: { color: "Argent", material: "Argent 925", size: null },
				quantity: 2,
				unitPriceExclTax: 4500,
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
			paidAt: new Date("2026-05-28T10:31:00Z"),
			stripePaymentIntentId: "pi_test_1",
			stripeChargeId: null,
		},
		precedingInvoice: null,
		voidedInfo: null,
		meta: { orderId: "order-1", orderNumber: "SYN-2026-0042", notes: null },
		...overrides,
	};
}

function sha256(buf: ArrayBuffer): string {
	return createHash("sha256").update(new Uint8Array(buf)).digest("hex");
}

describe("renderInvoicePdf — déterminisme bit-à-bit (Art. L102 B LPF)", () => {
	it("B2C franchise — deux rendus consécutifs produisent le même SHA-256", () => {
		const data = makeInvoice();
		const a = renderInvoicePdf(data);
		const b = renderInvoicePdf(data);
		expect(sha256(a)).toBe(sha256(b));
	});

	it("B2B avec TVA — déterministe", () => {
		const data = makeInvoice({
			buyer: {
				legalName: "Acme SARL",
				firstName: "Bob",
				lastName: "Martin",
				email: "bob@acme.com",
				phone: null,
				siret: "12345678900012",
				vatNumber: "FR00123456789",
			},
			lines: [
				{
					lineNumber: 1,
					productTitle: "Article TVA 20",
					variantInfo: { color: null, material: null, size: null },
					quantity: 1,
					unitPriceExclTax: 10000,
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
		});
		const a = renderInvoicePdf(data);
		const b = renderInvoicePdf(data);
		expect(sha256(a)).toBe(sha256(b));
	});

	it("Avoir A-YYYY-NNNNN — déterministe", () => {
		const data = makeInvoice({
			invoiceNumber: "A-2026-00001",
			precedingInvoice: {
				invoiceNumber: "F-2026-00042",
				issuedAt: new Date("2026-05-28T10:30:00Z"),
				reason: "Annulation totale du client",
			},
		});
		const a = renderInvoicePdf(data);
		const b = renderInvoicePdf(data);
		expect(sha256(a)).toBe(sha256(b));
	});

	it("Issuedat sous forme string ISO (après hydrate JSON snapshot) — déterministe", () => {
		// Simule un snapshot rechargé depuis la DB où Date.toISOString a remplacé
		// l'instance Date. Le renderer doit coerce et produire le même PDF.
		const dateInstance = makeInvoice();
		const stringIso = makeInvoice({
			issuedAt: "2026-05-28T10:30:00Z" as unknown as Date,
			payment: {
				method: "CARD",
				paidAt: "2026-05-28T10:31:00Z" as unknown as Date,
				stripePaymentIntentId: "pi_test_1",
				stripeChargeId: null,
			},
		});
		const a = renderInvoicePdf(dateInstance);
		const b = renderInvoicePdf(stringIso);
		expect(sha256(a)).toBe(sha256(b));
	});

	it("est indépendant de process.env.TZ (EINV-PDF-007 — /CreationDate en UTC)", async () => {
		// Régression : jsPDF `convertDateToPDFDate` dérive sinon /CreationDate des
		// composants LOCAUX + getTimezoneOffset() → le hash du PDF dépendrait du TZ
		// du runtime. On rend le MÊME InvoiceData sous deux TZ distincts et on exige
		// un SHA-256 identique. `derivePdfCreationDate` force l'offset +00'00' en UTC.
		const data = makeInvoice();

		const renderUnderTz = async (tz: string): Promise<string> => {
			const original = process.env.TZ;
			process.env.TZ = tz;
			try {
				// Re-import isolé pour que toute lecture de TZ au module-load soit ré-évaluée.
				const mod = await import("../render-invoice-pdf");
				return sha256(mod.renderInvoicePdf(data));
			} finally {
				process.env.TZ = original;
			}
		};

		const utc = await renderUnderTz("UTC");
		const paris = await renderUnderTz("Europe/Paris");
		const honolulu = await renderUnderTz("Pacific/Honolulu");
		expect(paris).toBe(utc);
		expect(honolulu).toBe(utc);
	});

	it("setCreationDate / setFileId / setProperties figent les sources jsPDF non-déterministes", () => {
		// Régression : si quelqu'un supprime un de ces 3 calls, le PDF reprend
		// CreationDate=now()/ID=random()/Producer=jsPDF_x.y.z → divergence hash.
		const source = require("node:fs").readFileSync(
			require("node:path").resolve(__dirname, "../render-invoice-pdf.ts"),
			"utf-8",
		) as string;
		expect(source).toMatch(/doc\.setCreationDate\(/);
		expect(source).toMatch(/doc\.setFileId\(/);
		expect(source).toMatch(/doc\.setProperties\(/);
	});
});
