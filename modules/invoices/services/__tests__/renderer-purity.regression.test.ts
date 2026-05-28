/**
 * @regression einv-format-010-renderer-purity
 *
 * Verrouille l'invariant : le renderer PDF (`render-invoice-pdf.ts`) ne contient
 * AUCUN calcul fiscal — tout est pré-agrégé dans `buildInvoiceData()` et figé
 * dans `InvoiceData` avant le rendu.
 *
 * Une régression "calculer la TVA dans le renderer" passerait silencieusement
 * sans cette garde, car le résultat reste correct… jusqu'au jour où le payload
 * pivot évolue (UBL, CII) et où deux renderers produisent des totaux divergents.
 *
 * Approche : grep les sources des renderers pour des patterns d'agrégation
 * fiscale (`reduce`, opérations entre champs `line.*`). Bonus : déterminisme
 * bit-à-bit pour le même `InvoiceData`.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderInvoicePdf } from "../render-invoice-pdf";
import type { InvoiceData } from "../../types/invoice-data";

const RENDERERS = ["modules/invoices/services/render-invoice-pdf.ts"];

function loadRenderer(relPath: string): string {
	const abs = resolve(process.cwd(), relPath);
	return readFileSync(abs, "utf-8");
}

/** Strips line/block comments before grepping — comments may legitimately
 *  mention forbidden tokens ("ne pas faire X"). */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function makeFixture(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "F-2026-00042",
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
	};
}

describe("renderer purity — no fiscal aggregation in render-* sources", () => {
	for (const relPath of RENDERERS) {
		describe(relPath, () => {
			const source = stripComments(loadRenderer(relPath));

			it("does not call .reduce(...) (signature of total aggregation)", () => {
				expect(source).not.toMatch(/\.reduce\s*\(/);
			});

			it("does not multiply against InvoiceLine numeric fields", () => {
				// Tout calcul `line.X * Y` ou `Y * line.X` sur les champs numériques
				// significatifs (quantity, taxRate, unit/line totals) doit être pré-
				// calculé en amont dans buildInvoiceData(). Les conversions
				// d'affichage (cents → euros) sont autorisées via helpers locaux.
				const forbidden = [
					/line\.(quantity|taxRate|taxAmount|unitPriceExclTax|lineTotal\w+)\s*\*/,
					/\*\s*line\.(quantity|taxRate|taxAmount|unitPriceExclTax|lineTotal\w+)/,
				];
				for (const pattern of forbidden) {
					expect(source).not.toMatch(pattern);
				}
			});

			it("does not sum two InvoiceLine numeric fields together", () => {
				const forbidden = [
					/line\.(taxAmount|lineTotal\w+|unitPriceExclTax)\s*\+\s*line\./,
					/totals\.\w+\s*\+\s*totals\./,
				];
				for (const pattern of forbidden) {
					expect(source).not.toMatch(pattern);
				}
			});

			it("does not derive totals via Math operations on multiple amounts", () => {
				// Math.max/Math.min sur deux montants = logique métier déguisée.
				// Math.floor / Math.round / Math.abs sur un seul cents-int sont OK
				// (utilisés par les helpers d'affichage formatAmount/formatEuro).
				expect(source).not.toMatch(/Math\.(max|min)\s*\([^)]*total/i);
			});
		});
	}
});

describe("renderer determinism — same InvoiceData → same bytes", () => {
	it("renderInvoicePdf is deterministic (SHA-256 stable)", () => {
		const data = makeFixture();
		const pdf1 = new Uint8Array(renderInvoicePdf(data));
		const pdf2 = new Uint8Array(renderInvoicePdf(data));
		const h1 = createHash("sha256").update(pdf1).digest("hex");
		const h2 = createHash("sha256").update(pdf2).digest("hex");
		expect(h1).toBe(h2);
	});
});
