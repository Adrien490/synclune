/**
 * Snapshot golden de l'objet pivot `InvoiceData` — drift detection entre
 * versions. Si un refacto modifie silencieusement la structure ou le mapping
 * Order → InvoiceData, ce snapshot rouge force une review consciente.
 *
 * EINV-TEST-014 — couvre le B2C franchise (unique cas Synclune : micro-entreprise
 * en franchise de TVA vendant à des particuliers).
 *
 * À mettre à jour intentionnellement avec `pnpm vitest -u` après revue d'un
 * changement de structure justifié.
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
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

type Order = GetOrderReturn;

function makeB2COrder(overrides: Partial<Order> = {}): Order {
	return {
		id: "order-snap-b2c-1",
		orderNumber: "SYN-2026-0042",
		userId: "user-1",
		stripeCheckoutSessionId: null,
		stripePaymentIntentId: "pi_snap_b2c",
		stripeInvoiceId: null,
		customerEmail: "alice@example.com",
		customerName: "Alice Dupont",
		subtotal: 9000,
		discountAmount: 0,
		shippingCost: 500,
		taxAmount: 0,
		total: 9500,
		currency: "EUR",
		shippingFirstName: "Alice",
		shippingLastName: "Dupont",
		shippingAddress1: "10 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75002",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33612345678",
		shippingCarrier: "colissimo",
		trackingNumber: null,
		trackingUrl: null,
		actualDelivery: null,
		shippedAt: null,
		status: "PROCESSING",
		paymentStatus: "PAID",
		fulfillmentStatus: "UNFULFILLED",
		paymentMethod: "CARD",
		paidAt: new Date("2026-05-27T18:00:00Z"),
		invoiceNumber: "F-2026-00042",
		invoiceStatus: "GENERATED",
		invoiceGeneratedAt: new Date("2026-05-27T18:00:00Z"),
		invoiceVoidedAt: null,
		creditNoteNumber: null,
		creditNoteGeneratedAt: null,
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
		createdAt: new Date("2026-05-27T17:55:00Z"),
		updatedAt: new Date("2026-05-27T18:00:00Z"),
		items: [
			{
				id: "item-snap-1",
				skuId: "sku-1",
				productId: "product-1",
				productTitle: "Collier Lune d'Argent",
				productDescription: "Argent 925 oxydé, chaîne 45cm.",
				productImageUrl: "https://cdn.example.com/collier-lune.jpg",
				skuSku: "COL-LUN-001",
				skuColor: "Argent",
				skuColorHexes: "#C0C0C0",
				skuMaterial: "Argent 925",
				skuSize: null,
				skuImageUrl: null,
				price: 4500,
				quantity: 2,
			},
		],
		refunds: [],
		discountUsages: [],
		history: [],
		...overrides,
	} as Order;
}

describe("buildInvoiceData — snapshot golden (EINV-TEST-014)", () => {
	it("snapshot B2C franchise (cas dominant Synclune)", () => {
		const data = buildInvoiceData(makeB2COrder());
		expect(data).toMatchSnapshot("invoice-data-b2c-franchise");
	});

	it("snapshot avoir (precedingInvoice non null)", () => {
		const data = buildInvoiceData(makeB2COrder(), {
			precedingInvoice: {
				invoiceNumber: "F-2026-00042",
				issuedAt: new Date("2026-05-27T18:00:00Z"),
				reason: "Annulation commande (geste commercial)",
			},
		});
		expect(data).toMatchSnapshot("invoice-data-credit-note-preceding-ref");
	});
});
