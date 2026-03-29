import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
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
		text: vi.fn(),
		line: vi.fn(),
		rect: vi.fn(),
		getTextWidth: vi.fn().mockReturnValue(30),
		output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
	};

	// Use a real class so `new jsPDF(...)` works
	class FakeJsPDF {
		internal = inst.internal;
		setFontSize = inst.setFontSize;
		setFont = inst.setFont;
		setTextColor = inst.setTextColor;
		setDrawColor = inst.setDrawColor;
		setLineWidth = inst.setLineWidth;
		setFillColor = inst.setFillColor;
		text = inst.text;
		line = inst.line;
		rect = inst.rect;
		getTextWidth = inst.getTextWidth;
		output = inst.output;
	}

	return { mockInstance: inst, MockJsPDF: FakeJsPDF };
});

vi.mock("jspdf", () => ({
	jsPDF: MockJsPDF,
}));

vi.mock("@/shared/lib/stripe", () => ({
	getVendorLegalInfo: () => ({
		company_legal_name: "TADDEI LEANE - Entrepreneur Individuel",
		company_trade_name: "Synclune",
		company_siret: "839 183 027 00037",
		company_siren: "839 183 027",
		company_vat: "FR35839183027",
		company_ape: "47.91B",
		company_address: "77 Boulevard du Tertre, 44100 Nantes, France",
		company_email: "contact@synclune.fr",
		vat_exemption: "TVA non applicable, art. 293 B du CGI",
		late_payment_penalty_rate: "12,40%",
		recovery_fee: "40 €",
		operation_nature: "Livraison de biens",
		registry: "Inscrite au Répertoire National des Entreprises (RNE)",
		insurance_company: "En cours de souscription",
		insurance_contact: "contact@synclune.fr",
		insurance_coverage: "France",
	}),
}));

import { generateInvoicePdf } from "../generate-invoice-pdf";
import type { GetOrderReturn } from "../../types/order.types";

// ============================================================================
// Helpers
// ============================================================================

function createMockOrder(overrides: Partial<GetOrderReturn> = {}): GetOrderReturn {
	return {
		id: "order-1",
		orderNumber: "ORD-2024-001",
		userId: "user-1",
		stripeCheckoutSessionId: "cs_test",
		stripePaymentIntentId: "pi_test",
		stripeCustomerId: "cus_test",
		stripeInvoiceId: null,
		customerEmail: "client@example.com",
		customerName: "Jean Dupont",
		customerPhone: "+33612345678",
		subtotal: 5000,
		discountAmount: 0,
		shippingCost: 600,
		taxAmount: 0,
		total: 5600,
		currency: "eur",
		shippingFirstName: "Jean",
		shippingLastName: "Dupont",
		shippingAddress1: "123 Rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
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
		shippingMethod: "standard",
		shippingCarrier: "standard",
		shippingRateId: null,
		trackingNumber: null,
		trackingUrl: null,
		estimatedDelivery: null,
		actualDelivery: null,
		shippedAt: null,
		status: "PAID",
		paymentStatus: "PAID",
		fulfillmentStatus: "UNFULFILLED",
		paymentMethod: "card",
		paidAt: new Date("2024-06-15T10:00:00Z"),
		invoiceNumber: null,
		invoiceStatus: null,
		invoiceGeneratedAt: null,
		createdAt: new Date("2024-06-15T09:00:00Z"),
		updatedAt: new Date("2024-06-15T10:00:00Z"),
		items: [
			{
				id: "item-1",
				skuId: "sku-1",
				productId: "prod-1",
				productTitle: "Collier Lune",
				productDescription: "Un beau collier",
				productImageUrl: "https://example.com/img.jpg",
				skuColor: "Or",
				skuMaterial: "Argent 925",
				skuSize: null,
				skuImageUrl: null,
				price: 2500,
				quantity: 2,
			},
		],
		refunds: [],
		...overrides,
	} as unknown as GetOrderReturn;
}

function getDoc() {
	return mockInstance;
}

// ============================================================================
// Tests
// ============================================================================

describe("generateInvoicePdf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset shared mock instance spies
		Object.values(mockInstance).forEach((val) => {
			if (typeof val === "function" && "mockClear" in val) {
				(val as ReturnType<typeof vi.fn>).mockClear();
			}
		});
		mockInstance.getTextWidth.mockReturnValue(30);
		mockInstance.output.mockReturnValue(new ArrayBuffer(100));
	});

	it("returns an ArrayBuffer", () => {
		const order = createMockOrder();
		const result = generateInvoicePdf(order);

		expect(result).toBeInstanceOf(ArrayBuffer);
	});

	it("creates a jsPDF instance (no throw)", () => {
		expect(() => generateInvoicePdf(createMockOrder())).not.toThrow();
	});

	it("calls output with arraybuffer format", () => {
		generateInvoicePdf(createMockOrder());
		const doc = getDoc();

		expect(doc.output).toHaveBeenCalledWith("arraybuffer");
	});

	it("uses invoiceNumber when available (priority over orderNumber)", () => {
		const order = createMockOrder({
			invoiceNumber: "INV-2024-042",
			orderNumber: "ORD-2024-001",
		});
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual(expect.stringContaining("INV-2024-042"));
	});

	it("falls back to orderNumber when invoiceNumber is null", () => {
		const order = createMockOrder({ invoiceNumber: null });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual(expect.stringContaining("ORD-2024-001"));
	});

	it("uses invoiceGeneratedAt for the date when available", () => {
		const order = createMockOrder({
			invoiceGeneratedAt: new Date("2024-07-01T12:00:00Z"),
			paidAt: new Date("2024-06-15T10:00:00Z"),
		});
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]) as string[];
		const dateLine = textCalls.find((t) => t.startsWith("Date :"));
		expect(dateLine).toContain("juillet");
	});

	it("uses paidAt when invoiceGeneratedAt is null", () => {
		const order = createMockOrder({
			invoiceGeneratedAt: null,
			paidAt: new Date("2024-06-15T10:00:00Z"),
		});
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]) as string[];
		const dateLine = textCalls.find((t) => t.startsWith("Date :"));
		expect(dateLine).toContain("juin");
	});

	it("uses createdAt when both invoiceGeneratedAt and paidAt are null", () => {
		const order = createMockOrder({
			invoiceGeneratedAt: null,
			paidAt: null,
			createdAt: new Date("2024-03-10T08:00:00Z"),
		});
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]) as string[];
		const dateLine = textCalls.find((t) => t.startsWith("Date :"));
		expect(dateLine).toContain("mars");
	});

	it("includes customer name and address", () => {
		const order = createMockOrder();
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Jean Dupont");
		expect(textCalls).toContainEqual("123 Rue de la Paix");
		expect(textCalls).toContainEqual("75001 Paris");
	});

	it("includes customer email when present", () => {
		const order = createMockOrder({ customerEmail: "jean@example.com" });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("jean@example.com");
	});

	it("does not include customerEmail when null", () => {
		const order = createMockOrder({ customerEmail: undefined });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).not.toContainEqual(null);
	});

	it("does not include shippingAddress2 when null", () => {
		const order = createMockOrder({ shippingAddress2: null });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		// shippingAddress2 should not appear
		expect(textCalls).not.toContainEqual(null);
	});

	it("includes shippingAddress2 when present", () => {
		const order = createMockOrder({ shippingAddress2: "Apt 4B" });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Apt 4B");
	});

	it("renders item variants (color/material) on a second line", () => {
		const order = createMockOrder();
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Or / Argent 925");
	});

	it("does not render variant line when item has no variant", () => {
		const order = createMockOrder({
			items: [
				{
					id: "item-1",
					skuId: "sku-1",
					productId: "prod-1",
					productTitle: "Carte cadeau",
					productDescription: "Carte",
					productImageUrl: null,
					skuColor: null,
					skuMaterial: null,
					skuSize: null,
					skuImageUrl: null,
					price: 5000,
					quantity: 1,
				},
			] as GetOrderReturn["items"],
		});
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		// No variant line should exist (no "/ " pattern from filter+join)
		const variantCalls = textCalls.filter(
			(t: unknown) => typeof t === "string" && t.includes(" / "),
		);
		expect(variantCalls).toHaveLength(0);
	});

	it("shows discount only when discountAmount > 0", () => {
		const order = createMockOrder({ discountAmount: 1000 });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Réduction");
	});

	it("does not show discount when discountAmount is 0", () => {
		const order = createMockOrder({ discountAmount: 0 });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).not.toContainEqual("Réduction");
	});

	it('displays "Offerts" for free shipping', () => {
		const order = createMockOrder({ shippingCost: 0 });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Offerts");
	});

	it("displays the shipping cost amount when not free", () => {
		const order = createMockOrder({ shippingCost: 600 });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).not.toContainEqual("Offerts");
		// 600 cents = 6,00 €
		expect(textCalls).toContainEqual(expect.stringContaining("6,00"));
	});

	it("renders item quantity and price correctly", () => {
		const order = createMockOrder({
			items: [
				{
					id: "item-1",
					skuId: "sku-1",
					productId: "prod-1",
					productTitle: "Bracelet",
					productDescription: "Bracelet",
					productImageUrl: null,
					skuColor: null,
					skuMaterial: null,
					skuSize: null,
					skuImageUrl: null,
					price: 3000,
					quantity: 3,
				},
			] as GetOrderReturn["items"],
		});
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		// quantity
		expect(textCalls).toContainEqual("3");
		// unit price: 30,00 €
		expect(textCalls).toContainEqual(expect.stringContaining("30,00"));
		// total: 90,00 €
		expect(textCalls).toContainEqual(expect.stringContaining("90,00"));
	});

	// P1-1: Billing address support
	it("uses billing address when billingSameAsShipping is false", () => {
		const order = createMockOrder({
			billingSameAsShipping: false,
			billingFirstName: "Marie",
			billingLastName: "Martin",
			billingAddress1: "456 Avenue des Champs",
			billingAddress2: "Bât B",
			billingPostalCode: "69001",
			billingCity: "Lyon",
			billingCountry: "FR",
		});
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Marie Martin");
		expect(textCalls).toContainEqual("456 Avenue des Champs");
		expect(textCalls).toContainEqual("Bât B");
		expect(textCalls).toContainEqual("69001 Lyon");
		// Should NOT contain shipping address
		expect(textCalls).not.toContainEqual("Jean Dupont");
		expect(textCalls).not.toContainEqual("123 Rue de la Paix");
	});

	it("falls back to shipping address when billingSameAsShipping is true", () => {
		const order = createMockOrder({ billingSameAsShipping: true });
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Jean Dupont");
		expect(textCalls).toContainEqual("123 Rue de la Paix");
	});

	it("falls back to shipping when billingSameAsShipping is false but billing fields are null", () => {
		const order = createMockOrder({
			billingSameAsShipping: false,
			billingFirstName: null,
		});
		generateInvoicePdf(order);
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Jean Dupont");
	});

	// P1-3: Terminology
	it('uses "Sous-total" instead of "Sous-total HT"', () => {
		generateInvoicePdf(createMockOrder());
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Sous-total");
		expect(textCalls).not.toContainEqual("Sous-total HT");
	});

	it('uses "Total" instead of "Total TTC"', () => {
		generateInvoicePdf(createMockOrder());
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Total");
		expect(textCalls).not.toContainEqual("Total TTC");
	});

	it('shows "TVA (non applicable)" with em dash', () => {
		generateInvoicePdf(createMockOrder());
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("TVA (non applicable)");
		expect(textCalls).toContainEqual("—");
		expect(textCalls).not.toContainEqual("0,00 €");
	});

	// P2-7: Vendor info from getVendorLegalInfo
	it("uses vendor info from getVendorLegalInfo", () => {
		generateInvoicePdf(createMockOrder());
		const doc = getDoc();

		const textCalls = doc.text.mock.calls.map((c: unknown[]) => c[0]);
		expect(textCalls).toContainEqual("Synclune");
		expect(textCalls).toContainEqual("TADDEI LEANE - Entrepreneur Individuel");
		expect(textCalls).toContainEqual("SIRET : 839 183 027 00037");
		expect(textCalls).toContainEqual("TVA non applicable, art. 293 B du CGI");
	});
});
