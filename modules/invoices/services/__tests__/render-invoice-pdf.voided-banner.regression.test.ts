/**
 * @regression einv-sec-007-voided-banner
 *
 * Quand `Order.invoiceStatus === "VOIDED"` est passé à `buildInvoiceData`,
 * `voidedInfo` doit être populé, et le PDF rendu doit contenir le bandeau
 * "FACTURE ANNULÉE — Avoir A-YYYY-NNNNN" (Art. 272-I CGI).
 *
 * Si quelqu'un retire le bandeau ou supprime `voidedInfo` du payload, ce test
 * pète. C'est volontaire : un client qui attache une facture VOIDED non marquée
 * à sa déclaration fiscale crée un mismatch entre ses livres et ceux de Synclune.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/stripe", () => ({
	getVendorLegalInfo: () => ({
		company_legal_name: "TADDEI LEANE - Entrepreneur Individuel",
		company_trade_name: "Synclune",
		company_siret: "839 183 027 00037",
		company_siren: "839 183 027",
		company_vat: "FR35839183027",
		company_vat_regime: "FRANCHISE_BASE",
		company_legal_form: "Entrepreneur individuel",
		company_ape: "47.91B",
		company_address: "77 Boulevard du Tertre, 44100 Nantes, France",
		company_email: "contact@synclune.fr",
		einvoicing_platform_id: null,
		einvoicing_address: null,
		vat_exemption: "TVA non applicable, art. 293 B du CGI",
		bank_iban: null,
		bank_bic: null,
	}),
}));

import { buildInvoiceData } from "../build-invoice-data";
import { renderInvoicePdf } from "../render-invoice-pdf";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

type Order = GetOrderReturn;

function makeVoidedOrder(): Order {
	return {
		id: "order-voided",
		orderNumber: "SYN-2026-VOID",
		userId: "user-voided",
		stripeCheckoutSessionId: "cs_test_voided",
		stripePaymentIntentId: "pi_test_voided",
		stripeCustomerId: "cus_test_voided",
		stripeInvoiceId: null,
		customerEmail: "voided@example.com",
		customerName: "Charlie Voided",
		customerPhone: null,
		customerCompanyName: null,
		customerCompanySiren: null,
		customerCompanySiret: null,
		customerCompanyVatNumber: null,
		subtotal: 4500,
		discountAmount: 0,
		shippingCost: 0,
		taxAmount: 0,
		total: 4500,
		currency: "EUR",
		shippingFirstName: "Charlie",
		shippingLastName: "Voided",
		shippingAddress1: "1 rue de l'Annulation",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: null,
		billingSameAsShipping: true,
		billingFirstName: null,
		billingLastName: null,
		billingAddress1: null,
		billingAddress2: null,
		billingPostalCode: null,
		billingCity: null,
		billingCountry: null,
		billingPhone: null,
		shippingCarrier: "colissimo",
		trackingNumber: null,
		trackingUrl: null,
		actualDelivery: null,
		shippedAt: null,
		status: "CANCELLED",
		paymentStatus: "REFUNDED",
		fulfillmentStatus: "UNFULFILLED",
		paymentMethod: "CARD",
		paidAt: new Date("2026-05-20T10:00:00Z"),
		// Facture initialement émise...
		invoiceNumber: "F-2026-00042",
		invoiceGeneratedAt: new Date("2026-05-20T10:00:00Z"),
		// ... puis annulée avec émission d'un avoir
		invoiceStatus: "VOIDED",
		invoiceVoidedAt: new Date("2026-05-25T14:00:00Z"),
		creditNoteNumber: "A-2026-00007",
		creditNoteGeneratedAt: new Date("2026-05-25T14:00:00Z"),
		invoicePdfUrl: null,
		invoicePdfHash: null,
		vendorLegalName: null,
		vendorTradeName: null,
		vendorAddress: null,
		vendorSiren: null,
		vendorSiret: null,
		vendorVatNumber: null,
		vendorVatRegime: null,
		vendorLegalForm: null,
		vendorApeCode: null,
		vendorEmail: null,
		vendorBankIban: null,
		vendorBankBic: null,
		createdAt: new Date("2026-05-20T09:55:00Z"),
		updatedAt: new Date("2026-05-25T14:00:00Z"),
		items: [
			{
				id: "item-voided",
				skuId: "sku-1",
				productId: "product-1",
				productTitle: "Pendentif Argent",
				productDescription: null,
				productImageUrl: null,
				skuSku: "PEN-ARG-001",
				skuColor: "Argent",
				skuColorHexes: "#C0C0C0",
				skuMaterial: "Argent 925",
				skuSize: null,
				skuImageUrl: null,
				price: 4500,
				quantity: 1,
				taxRate: 0,
				taxAmount: 0,
				lineTotalExcludingTax: 4500,
				lineTotalIncludingTax: 4500,
				taxCategoryCode: "ZB",
				hsCode: null,
				unitCode: null,
			},
		],
		refunds: [],
		discountUsages: [],
		history: [],
	} as unknown as Order;
}

describe("EINV-SEC-007 — VOIDED invoice banner regression", () => {
	it("buildInvoiceData populates voidedInfo when invoiceStatus === VOIDED", () => {
		const data = buildInvoiceData(makeVoidedOrder());
		expect(data.voidedInfo).not.toBeNull();
		expect(data.voidedInfo?.creditNoteNumber).toBe("A-2026-00007");
		expect(data.voidedInfo?.voidedAt).toEqual(new Date("2026-05-25T14:00:00Z"));
	});

	it("buildInvoiceData leaves voidedInfo null when invoiceStatus === GENERATED", () => {
		const order = makeVoidedOrder();
		order.invoiceStatus = "GENERATED";
		order.invoiceVoidedAt = null;
		order.creditNoteNumber = null;
		order.creditNoteGeneratedAt = null;
		const data = buildInvoiceData(order);
		expect(data.voidedInfo).toBeNull();
	});

	it("buildInvoiceData returns voidedInfo null if creditNoteNumber missing (data inconsistency safeguard)", () => {
		const order = makeVoidedOrder();
		order.creditNoteNumber = null;
		const data = buildInvoiceData(order);
		// Garde-fou : pas de bandeau si données incomplètes, mieux qu'une exception.
		expect(data.voidedInfo).toBeNull();
	});

	it("renderInvoicePdf produces a PDF that contains the credit note number when voided", () => {
		const order = makeVoidedOrder();
		const data = buildInvoiceData(order);
		const pdfBuffer = renderInvoicePdf(data);

		// jsPDF encode text using Helvetica which preserves ASCII verbatim. We
		// scan the raw bytes for the credit note number — proves the banner is
		// drawn.
		const bytes = new Uint8Array(pdfBuffer);
		const utf8 = new TextDecoder("latin1").decode(bytes);
		expect(utf8).toContain("A-2026-00007");
	});
});
