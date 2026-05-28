/**
 * Snapshot golden de l'objet pivot `InvoiceData` — drift detection entre
 * versions. Si un refacto modifie silencieusement la structure ou le mapping
 * Order → InvoiceData, ce snapshot rouge force une review consciente.
 *
 * EINV-TEST-014 — couvre B2C franchise (cas dominant Synclune actuel) + B2B
 * avec snapshots vendor* + customer SIRET/TVA (préparation Phase 5 e-invoicing
 * structuré obligatoire sept. 2027 pour cibles B2B).
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
		stripeCustomerId: null,
		stripeInvoiceId: null,
		customerEmail: "alice@example.com",
		customerName: "Alice Dupont",
		customerPhone: "+33612345678",
		customerType: "B2C",
		customerCompanyName: null,
		customerCompanySiren: null,
		customerCompanySiret: null,
		customerCompanyVatNumber: null,
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
		billingSameAsShipping: true,
		billingFirstName: null,
		billingLastName: null,
		billingAddress1: null,
		billingAddress2: null,
		billingPostalCode: null,
		billingCity: null,
		billingCountry: null,
		billingPhone: null,
		shippingMethod: "standard",
		shippingCarrier: "colissimo",
		shippingRateId: null,
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
		vendorEInvoicingPlatformId: null,
		vendorEInvoicingAddress: null,
		customerEInvoicingPlatformId: null,
		customerEInvoicingAddress: null,
		customerPublicEntityCode: null,
		customerServiceCode: null,
		pdpStatus: null,
		pdpTransmittedAt: null,
		pdpAcceptedAt: null,
		pdpRejectedAt: null,
		pdpRejectionReason: null,
		pdpProviderRef: null,
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
				taxRate: 0,
				taxAmount: 0,
				lineTotalExcludingTax: 9000,
				lineTotalIncludingTax: 9000,
				taxCategoryCode: "ZB",
				hsCode: null,
				unitCode: null,
			},
		],
		refunds: [],
		discountUsages: [],
		history: [],
		...overrides,
	} as Order;
}

function makeB2BOrder(): Order {
	// B2B avec vendeur post-Phase 5 (snapshots vendor* renseignés) + acheteur
	// professionnel avec SIRET et numéro de TVA intra.
	return makeB2COrder({
		id: "order-snap-b2b-1",
		orderNumber: "SYN-2026-2001",
		stripePaymentIntentId: "pi_snap_b2b",
		invoiceNumber: "F-2026-02001",
		customerEmail: "contact@bijouterie-pro.fr",
		customerName: "Camille Martin",
		customerType: "B2B",
		customerCompanyName: "Bijouterie Pro SARL",
		customerCompanySiren: "552081317",
		customerCompanySiret: "55208131700019",
		customerCompanyVatNumber: "FR12552081317",
		customerEInvoicingPlatformId: "PEPPOL-0192",
		customerEInvoicingAddress: "fr-bijouterie-pro@peppol.eu",
		// Snapshot vendor figé au moment de l'émission (Art. L102 B LPF)
		vendorLegalName: "TADDEI LEANE - EI",
		vendorTradeName: "Synclune",
		vendorAddress: "77 Boulevard du Tertre, 44100 Nantes, France",
		vendorSiren: "839183027",
		vendorSiret: "83918302700037",
		vendorVatNumber: "FR35839183027",
		vendorVatRegime: "FRANCHISE_BASE",
		vendorLegalForm: "Entrepreneur individuel",
		vendorApeCode: "47.91B",
		vendorEmail: "contact@synclune.fr",
		vendorBankIban: "FR7612345987650123456789014",
		vendorBankBic: "AGRIFRPP",
		vendorEInvoicingPlatformId: "PDP-SYNCLUNE-001",
		vendorEInvoicingAddress: "synclune@peppol.eu",
		// Adresse de facturation distincte (siège social)
		billingSameAsShipping: false,
		billingFirstName: "Camille",
		billingLastName: "Martin",
		billingAddress1: "5 rue du Faubourg-Saint-Honoré",
		billingAddress2: "Bâtiment B",
		billingPostalCode: "75008",
		billingCity: "Paris",
		billingCountry: "FR",
		billingPhone: "+33145987654",
		// Shipping = boutique
		shippingFirstName: "Camille",
		shippingLastName: "Martin",
		shippingAddress1: "1 boulevard Beaumarchais",
		shippingPostalCode: "75004",
		shippingCity: "Paris",
		subtotal: 12000,
		shippingCost: 0,
		total: 12000,
		items: [
			{
				id: "item-snap-b2b-1",
				skuId: "sku-bague-or",
				productId: "product-bague-or",
				productTitle: "Bague Solaire Or rose",
				productDescription: "Or rose 18 carats, taille 54",
				productImageUrl: null,
				skuSku: "BAG-SOL-OR-54",
				skuColor: "Or rose",
				skuColorHexes: "#B76E79",
				skuMaterial: "Or 18k",
				skuSize: "54",
				skuImageUrl: null,
				price: 6000,
				quantity: 2,
				taxRate: 0,
				taxAmount: 0,
				lineTotalExcludingTax: 12000,
				lineTotalIncludingTax: 12000,
				taxCategoryCode: "ZB",
				hsCode: "7113.19",
				unitCode: "C62",
			},
		],
	});
}

describe("buildInvoiceData — snapshot golden (EINV-TEST-014)", () => {
	it("snapshot B2C franchise (cas dominant Synclune)", () => {
		const data = buildInvoiceData(makeB2COrder());
		expect(data).toMatchSnapshot("invoice-data-b2c-franchise");
	});

	it("snapshot B2B avec snapshot vendor + customer SIRET/TVA", () => {
		const data = buildInvoiceData(makeB2BOrder());
		expect(data).toMatchSnapshot("invoice-data-b2b-with-vat");
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
