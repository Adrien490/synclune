import { describe, expect, it, beforeEach, vi } from "vitest";

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
import { INVOICE_DATA_FORMAT_VERSION } from "../../constants/invoice-data-format";
import { invoiceDataSchema } from "../../schemas/invoice.schema";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

type Order = GetOrderReturn;

function makeOrder(overrides: Partial<Order> = {}): Order {
	return {
		// cuid-like : invoiceMetaSchema valide orderId en z.cuid2() (les IDs à tirets échouent)
		id: "ckwq2x5g9000001mh2z3v8y1a",
		orderNumber: "SYN-2026-0001",
		userId: "user-1",
		stripeCheckoutSessionId: "cs_test_1",
		stripePaymentIntentId: "pi_test_1",
		stripeInvoiceId: null,
		customerEmail: "alice@example.com",
		customerName: "Alice Dupont",
		subtotal: 9000,
		discountAmount: 0,
		shippingCost: 500,
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
		invoiceNumber: "F-2026-00001",
		invoiceStatus: "GENERATED",
		invoiceGeneratedAt: new Date("2026-05-27T18:00:00Z"),
		invoiceVoidedAt: null,
		creditNoteNumber: null,
		creditNoteGeneratedAt: null,
		invoicePdfUrl: null,
		invoicePdfHash: null,
		// Snapshot vendeur (defaults null = fallback env)
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
				id: "item-1",
				skuId: "sku-1",
				productId: "product-1",
				productTitle: "Collier Lune d'Argent",
				productDescription: null,
				productImageUrl: null,
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

describe("buildInvoiceData — B2C franchise", () => {
	beforeEach(() => vi.clearAllMocks());

	it("produces an InvoiceData that satisfies the Zod schema", () => {
		const data = buildInvoiceData(makeOrder());
		const result = invoiceDataSchema.safeParse(data);
		if (!result.success) {
			throw new Error(JSON.stringify(result.error.format(), null, 2));
		}
		expect(result.success).toBe(true);
	});

	// Le snapshot est figé 10 ans (Art. L102 B LPF) et relu par un `as InvoiceData` :
	// sans marqueur de version dans le payload, un changement de forme rend
	// `undefined` en silence sur les lignes anciennes. Cf. la régression
	// invoice-data-format-version.
	it("stamps the payload with the current format version", () => {
		expect(buildInvoiceData(makeOrder()).formatVersion).toBe(INVOICE_DATA_FORMAT_VERSION);
	});

	it("snapshots invoice number + issuedAt from the Order", () => {
		const data = buildInvoiceData(makeOrder());
		expect(data.invoiceNumber).toBe("F-2026-00001");
		expect(data.issuedAt).toEqual(new Date("2026-05-27T18:00:00Z"));
	});

	it("seller info is normalized to canonical form (no spaces)", () => {
		const data = buildInvoiceData(makeOrder());
		expect(data.seller.siren).toBe("839183027");
		expect(data.seller.siret).toBe("83918302700037");
		expect(data.seller.vatNumber).toBe("FR35839183027");
		expect(data.seller.legalForm).toBe("Entrepreneur individuel");
		expect(data.seller.vatExemptionText).toContain("art. 293 B");
	});

	it("seller address is parsed into structured form", () => {
		const data = buildInvoiceData(makeOrder());
		expect(data.seller.address.line1).toBe("77 Boulevard du Tertre");
		expect(data.seller.address.postalCode).toBe("44100");
		expect(data.seller.address.city).toBe("Nantes");
		expect(data.seller.address.countryCode).toBe("FR");
	});

	it("buyer info is B2C with null company fields", () => {
		const data = buildInvoiceData(makeOrder());
		expect(data.buyer.firstName).toBe("Alice");
		expect(data.buyer.lastName).toBe("Dupont");
		expect(data.buyer.legalName).toBeNull();
		expect(data.buyer.siret).toBeNull();
		expect(data.buyer.vatNumber).toBeNull();
	});

	it("uses shipping address as billing when billingSameAsShipping=true", () => {
		const data = buildInvoiceData(makeOrder());
		expect(data.billingAddress).toEqual(data.shippingAddress);
	});

	// @regression order-billing-is-shipping (2026-08-04) : les 9 colonnes
	// `billing*` sont parties (jamais renseignées sur une commande réelle). En
	// B2C de vente à distance l'adresse de facturation EST l'adresse de
	// livraison — c'est elle que le PDF imprime sous « Facturé à ». Si une
	// dissociation redevient nécessaire (commandes cadeau, ou obligation
	// d'émission structurée du 1er sept. 2027 : BT-75→79 est un bloc distinct de
	// l'adresse acheteur), elle passera par une saisie AU CHECKOUT, pas par des
	// colonnes que rien ne remplit.
	it("ne peut PLUS dissocier facturation et livraison, quoi qu'on passe", () => {
		const data = buildInvoiceData(makeOrder({} as never));
		expect(data.billingAddress).toEqual(data.shippingAddress);
	});

	it("maps each OrderItem to an InvoiceLine, deriving franchise totals from price × quantity", () => {
		const data = buildInvoiceData(makeOrder());
		expect(data.lines).toHaveLength(1);
		expect(data.lines[0]!.lineNumber).toBe(1);
		expect(data.lines[0]!.productTitle).toBe("Collier Lune d'Argent");
		expect(data.lines[0]!.skuCode).toBe("COL-LUN-001");
		// Franchise : TVA toujours nulle, total ligne = price × quantity.
		expect(data.lines[0]!.taxRate).toBe(0);
		expect(data.lines[0]!.taxAmount).toBe(0);
		expect(data.lines[0]!.taxCategoryCode).toBe("ZB");
		expect(data.lines[0]!.lineTotalExclTax).toBe(9000);
		expect(data.lines[0]!.lineTotalInclTax).toBe(9000);
	});

	it("totals : taxBreakdown groups by (rate, categoryCode) with franchise reason", () => {
		const data = buildInvoiceData(makeOrder());
		expect(data.totals.taxBreakdown).toHaveLength(1);
		expect(data.totals.taxBreakdown[0]!).toMatchObject({
			rate: 0,
			categoryCode: "ZB",
			exemptionReason: "Franchise art. 293 B CGI",
		});
	});

	it("totals : totalInclTax mirrors order.total + shipping is included", () => {
		const data = buildInvoiceData(makeOrder());
		expect(data.totals.totalInclTax).toBe(9500);
		expect(data.totals.shippingExclTax).toBe(500);
		expect(data.totals.totalPaid).toBe(9500);
		expect(data.totals.amountDue).toBe(0);
	});

	it("payment info captures paidAt and stripe IDs", () => {
		const data = buildInvoiceData(makeOrder({ stripeChargeId: "ch_test_1" }));
		expect(data.payment.method).toBe("CARD");
		expect(data.payment.paidAt).toEqual(new Date("2026-05-27T18:00:00Z"));
		expect(data.payment.stripePaymentIntentId).toBe("pi_test_1");
		// Test de COUTURE colonne → snapshot. Jusqu'à la migration 20260804200000,
		// `stripeChargeId` était `null` EN DUR ici alors que le champ existait dans le
		// type ET dans le schéma Zod : rien ne rougissait, et chaque facture figeait un
		// `null` pour 10 ans (Art. L102 B LPF). Assertion sur la VALEUR, pas sur la
		// présence de la clé — c'est la valeur qui s'était perdue.
		expect(data.payment.stripeChargeId).toBe("ch_test_1");
	});

	// Le chemin qui écrit le snapshot charge en `GET_ORDER_SELECT_ADMIN`, mais les
	// chemins de RENDU (fallback legacy de `resolveInvoiceDataForRender`,
	// `renderOrderCreditNotePdf`) chargent en `GET_ORDER_SELECT_CUSTOMER` — qui exclut
	// délibérément les identifiants Stripe — puis CASTENT en `GetOrderReturn`. La
	// propriété est alors absente de l'objet, pas `null`. Sans le `?? null` du builder,
	// la clé disparaîtrait du JSON : une divergence de FORME du payload, précisément ce
	// que `formatVersion` sert à rendre détectable.
	it("un order en select CUSTOMER (propriété absente) rend null, pas une clé manquante", () => {
		const order = makeOrder();
		delete (order as Partial<Order>).stripeChargeId;

		const data = buildInvoiceData(order);

		expect(data.payment.stripeChargeId).toBeNull();
		expect(Object.hasOwn(data.payment, "stripeChargeId")).toBe(true);
		// La forme reste celle que valide le schéma figé sous SHA-256.
		expect(invoiceDataSchema.safeParse(data).success).toBe(true);
	});

	it("invoiceFormat defaults to PDF; accepts override", () => {
		expect(buildInvoiceData(makeOrder()).invoiceFormat).toBe("PDF");
		// Seul "PDF" est un format valide : aucun renderer XML n'existe (cf. InvoiceFormat).
		expect(buildInvoiceData(makeOrder(), { format: "PDF" }).invoiceFormat).toBe("PDF");
	});

	it("throws when invoiceNumber is missing (caller must persist first)", () => {
		expect(() => buildInvoiceData(makeOrder({ invoiceNumber: null }))).toThrow(/invoiceNumber/);
	});

	it("throws when invoiceGeneratedAt is missing but invoiceNumber is set", () => {
		expect(() => buildInvoiceData(makeOrder({ invoiceGeneratedAt: null }))).toThrow(
			/invoiceGeneratedAt/,
		);
	});

	it("supports preceding invoice ref (for credit note payload)", () => {
		const data = buildInvoiceData(makeOrder(), {
			precedingInvoice: {
				invoiceNumber: "F-2026-00001",
				issuedAt: new Date("2026-05-26T10:00:00Z"),
				reason: "Annulation",
			},
		});
		expect(data.precedingInvoice).not.toBeNull();
		expect(data.precedingInvoice!.invoiceNumber).toBe("F-2026-00001");
	});

	it("snapshot reproducibility — same Order → identical InvoiceData (Art. L102 B)", () => {
		const order = makeOrder();
		const first = buildInvoiceData(order);
		const second = buildInvoiceData(order);
		expect(first).toEqual(second);
	});
});

describe("buildInvoiceData — snapshot vendeur (Art. L102 B LPF)", () => {
	beforeEach(() => vi.clearAllMocks());

	it("prefere le snapshot Order.vendor* au lieu de relire getVendorLegalInfo() env", () => {
		// Simule une commande emise quand Synclune etait sous un ANCIEN SIRET / raison sociale.
		// Si l'env a change depuis, la facture historique doit garder les valeurs d'emission.
		const data = buildInvoiceData(
			makeOrder({
				vendorLegalName: "ANCIEN NOM SARL",
				vendorTradeName: "Ancienne Marque",
				vendorAddress: "1 rue de l'Ancien, 75001 Paris, France",
				vendorSiren: "111222333",
				vendorSiret: "11122233300011",
				vendorVatNumber: "FR00111222333",
				vendorVatRegime: "FRANCHISE_BASE",
				vendorLegalForm: "SARL",
			}),
		);
		expect(data.seller.legalName).toBe("ANCIEN NOM SARL");
		expect(data.seller.tradeName).toBe("Ancienne Marque");
		expect(data.seller.siren).toBe("111222333");
		expect(data.seller.siret).toBe("11122233300011");
		expect(data.seller.vatNumber).toBe("FR00111222333");
		expect(data.seller.legalForm).toBe("SARL");
		expect(data.seller.address.line1).toBe("1 rue de l'Ancien");
		expect(data.seller.address.postalCode).toBe("75001");
		expect(data.seller.address.city).toBe("Paris");
		expect(data.seller.address.recipientName).toBe("ANCIEN NOM SARL");
	});

	it("fallback getVendorLegalInfo() env quand snapshot Order.vendor* est null", () => {
		const data = buildInvoiceData(makeOrder()); // defaults all null
		expect(data.seller.legalName).toBe("TADDEI LEANE - Entrepreneur Individuel");
		expect(data.seller.siren).toBe("839183027");
		expect(data.seller.siret).toBe("83918302700037");
		expect(data.seller.vatNumber).toBe("FR35839183027");
	});

	it("vatExemptionText present si snapshot regime = FRANCHISE_BASE", () => {
		const data = buildInvoiceData(makeOrder({ vendorVatRegime: "FRANCHISE_BASE" }));
		expect(data.seller.vatExemptionText).toContain("art. 293 B");
	});

	it("vatExemptionText null si snapshot regime = NORMAL (sortie franchise — facture historique correcte)", () => {
		const data = buildInvoiceData(makeOrder({ vendorVatRegime: "NORMAL" }));
		expect(data.seller.vatExemptionText).toBeNull();
	});
});
