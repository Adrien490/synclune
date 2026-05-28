import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}));

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/admin-new-order-email", () => ({
	AdminNewOrderEmail: vi.fn((props) => ({ type: "AdminNewOrderEmail", props })),
}));

vi.mock("@/emails/admin-alert-email", () => ({
	AdminAlertEmail: vi.fn((props) => ({ type: "AdminAlertEmail", props })),
}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_ADMIN: "admin@test.com",
}));

vi.mock("@/shared/constants/urls", () => ({
	getBaseUrl: vi.fn(() => "https://test.com"),
	EXTERNAL_URLS: {
		STRIPE: {
			WEBHOOKS: "https://dashboard.stripe.com/webhooks",
		},
	},
}));

import {
	sendAdminNewOrderEmail,
	sendAdminRefundFailedAlert,
	sendWebhookFailedAlertEmail,
	sendAdminCronFailedAlert,
	sendAdminCheckoutFailedAlert,
	sendAdminDisputeAlert,
	sendAdminInvoiceFailedAlert,
	sendAdminOrderProcessingFailedAlert,
} from "../admin-emails";

const mockShippingAddress = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 rue de la Paix",
	city: "Paris",
	postalCode: "75001",
	country: "FR",
	phone: "+33612345678",
};

const mockItems = [
	{
		productTitle: "Bague en or",
		skuColor: "Or jaune",
		skuMaterial: null,
		skuSize: "52",
		quantity: 1,
		price: 12000,
	},
];

describe("sendAdminNewOrderEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } });
	});

	it("should call renderAndSend with EMAIL_ADMIN as recipient", async () => {
		await sendAdminNewOrderEmail({
			orderId: "order_1",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			customerEmail: "customer@test.com",
			items: mockItems,
			subtotal: 12000,
			discount: 0,
			shipping: 500,
			total: 12500,
			shippingAddress: mockShippingAddress,
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "AdminNewOrderEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					customerEmail: "customer@test.com",
					items: mockItems,
					subtotal: 12000,
					discount: 0,
					shipping: 500,
					total: 12500,
					shippingAddress: mockShippingAddress,
					dashboardUrl: "https://test.com/admin/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "admin@test.com",
				subject: "🎉 Nouvelle commande CMD-001 - 125.00€",
				tags: [{ name: "category", value: "admin" }],
				idempotencyKey: "admin-new-order:order_1",
			}),
		);
	});

	it("should format total correctly in subject", async () => {
		await sendAdminNewOrderEmail({
			orderId: "order_2",
			orderNumber: "CMD-002",
			customerName: "Jean Martin",
			customerEmail: "jean@test.com",
			items: mockItems,
			subtotal: 9999,
			discount: 0,
			shipping: 0,
			total: 9999,
			shippingAddress: mockShippingAddress,
			dashboardUrl: "https://test.com/admin/commandes/CMD-002",
		});

		const callArgs = mockRenderAndSend.mock.calls[0]![1];
		expect(callArgs.subject).toBe("🎉 Nouvelle commande CMD-002 - 99.99€");
	});

	it("EMAIL-AUDIT-002 : forwards a stable idempotencyKey derived from orderId", async () => {
		await sendAdminNewOrderEmail({
			orderId: "order_42",
			orderNumber: "CMD-042",
			customerName: "Léa",
			customerEmail: "lea@test.com",
			items: mockItems,
			subtotal: 5000,
			discount: 0,
			shipping: 0,
			total: 5000,
			shippingAddress: mockShippingAddress,
			dashboardUrl: "https://test.com/admin/commandes/CMD-042",
		});
		const callArgs = mockRenderAndSend.mock.calls[0]![1];
		expect(callArgs.idempotencyKey).toBe("admin-new-order:order_42");
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendAdminNewOrderEmail({
			orderId: "order_1",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			customerEmail: "customer@test.com",
			items: mockItems,
			subtotal: 12000,
			discount: 0,
			shipping: 500,
			total: 12500,
			shippingAddress: mockShippingAddress,
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		expect(result).toEqual({ success: true, data: { id: "email-1" } });
	});
});

describe("sendAdminRefundFailedAlert", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-2" } });
	});

	it("should render AdminAlertEmail with type=refund and include context+summary+stripeCtaUrl", async () => {
		await sendAdminRefundFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 5000,
			reason: "payment_failed",
			errorMessage: "Insufficient funds",
			stripePaymentIntentId: "pi_test123",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.type).toBe("AdminAlertEmail");
		expect(emailArg.props.type).toBe("refund");
		expect(emailArg.props.context).toContain("CMD-001");
		expect(emailArg.props.context).toContain("customer@test.com");
		expect(emailArg.props.context).toContain("pi_test123");
		expect(emailArg.props.summary).toContain("Échec du paiement");
		expect(emailArg.props.stackTrace).toBe("Insufficient funds");
		expect(emailArg.props.ctaUrl).toBe("https://test.com/admin/commandes/CMD-001");
		expect(emailArg.props.stripeCtaUrl).toBe("https://dashboard.stripe.com/payments/pi_test123");

		const sendOpts = mockRenderAndSend.mock.calls[0]![1];
		expect(sendOpts).toMatchObject({
			to: "admin@test.com",
			subject: "[Admin] Échec remboursement — CMD-001",
			tags: [{ name: "category", value: "admin" }],
		});
	});

	it("should construct stripeCtaUrl from stripePaymentIntentId", async () => {
		await sendAdminRefundFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 5000,
			reason: "other",
			errorMessage: "Error",
			stripePaymentIntentId: "pi_unique456",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.stripeCtaUrl).toBe("https://dashboard.stripe.com/payments/pi_unique456");
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendAdminRefundFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 5000,
			reason: "payment_canceled",
			errorMessage: "Canceled",
			stripePaymentIntentId: "pi_test123",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		expect(result).toEqual({ success: true, data: { id: "email-2" } });
	});
});

describe("sendWebhookFailedAlertEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-3" } });
	});

	it("should render AdminAlertEmail with type=webhook and include eventId+eventType+attempts", async () => {
		await sendWebhookFailedAlertEmail({
			eventId: "evt_test123",
			eventType: "payment_intent.succeeded",
			attempts: 3,
			error: "Connection timeout",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.type).toBe("webhook");
		expect(emailArg.props.context).toContain("evt_test123");
		expect(emailArg.props.context).toContain("payment_intent.succeeded");
		expect(emailArg.props.context).toContain("3");
		expect(emailArg.props.stackTrace).toBe("Connection timeout");
		expect(emailArg.props.ctaUrl).toBe("https://test.com/admin");
		expect(emailArg.props.stripeCtaUrl).toBe("https://dashboard.stripe.com/webhooks");

		const sendOpts = mockRenderAndSend.mock.calls[0]![1];
		expect(sendOpts).toMatchObject({
			to: "admin@test.com",
			subject: "[Admin] Webhook payment_intent.succeeded échoué (3 tentatives)",
			tags: [{ name: "category", value: "admin" }],
		});
	});

	it("should use EXTERNAL_URLS.STRIPE.WEBHOOKS for stripeCtaUrl", async () => {
		await sendWebhookFailedAlertEmail({
			eventId: "evt_test123",
			eventType: "checkout.session.completed",
			attempts: 5,
			error: "Database error",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.stripeCtaUrl).toBe("https://dashboard.stripe.com/webhooks");
	});

	it("should use getBaseUrl() to build ctaUrl", async () => {
		const { getBaseUrl } = await import("@/shared/constants/urls");

		await sendWebhookFailedAlertEmail({
			eventId: "evt_test123",
			eventType: "payment_intent.succeeded",
			attempts: 1,
			error: "Error",
		});

		expect(getBaseUrl).toHaveBeenCalled();
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendWebhookFailedAlertEmail({
			eventId: "evt_test123",
			eventType: "payment_intent.succeeded",
			attempts: 3,
			error: "Error",
		});

		expect(result).toEqual({ success: true, data: { id: "email-3" } });
	});
});

describe("sendAdminCronFailedAlert", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-4" } });
	});

	it("should render AdminAlertEmail with type=cron and include job+errors+details", async () => {
		await sendAdminCronFailedAlert({
			job: "cleanup-carts",
			errors: 5,
			details: { failedIds: ["abc", "def"] },
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.type).toBe("cron");
		expect(emailArg.props.context).toContain("cleanup-carts");
		expect(emailArg.props.context).toContain("5");
		expect(emailArg.props.summary).toContain("cleanup-carts");
		expect(emailArg.props.stackTrace).toContain("failedIds");
		expect(emailArg.props.ctaUrl).toBe("https://test.com/admin");

		const sendOpts = mockRenderAndSend.mock.calls[0]![1];
		expect(sendOpts).toMatchObject({
			to: "admin@test.com",
			subject: "[Admin] Cron cleanup-carts — 5 erreur(s)",
			tags: [{ name: "category", value: "admin" }],
		});
	});

	it("should include error count in subject", async () => {
		await sendAdminCronFailedAlert({
			job: "sync-async-payments",
			errors: 12,
			details: {},
		});

		const callArgs = mockRenderAndSend.mock.calls[0]![1];
		expect(callArgs.subject).toBe("[Admin] Cron sync-async-payments — 12 erreur(s)");
	});

	it("CRON-AUDIT-003 : idempotencyKey bucket horaire stable dans la même heure", async () => {
		// 2 appels dans la même fenêtre horaire → même clé → Resend dédoublonne
		// (1 alerte max/h/cron, évite le spam d'un cron 5-min en échec).
		const nowSpy = vi.spyOn(Date, "now").mockReturnValue(3_600_000 * 471_000 + 123_456);
		const bucket = Math.floor((3_600_000 * 471_000 + 123_456) / 3_600_000);

		await sendAdminCronFailedAlert({ job: "retry-post-webhook-tasks", errors: 1, details: {} });
		await sendAdminCronFailedAlert({ job: "retry-post-webhook-tasks", errors: 9, details: {} });

		const key1 = mockRenderAndSend.mock.calls[0]![1].idempotencyKey;
		const key2 = mockRenderAndSend.mock.calls[1]![1].idempotencyKey;
		expect(key1).toBe(`alert:cron-failed:retry-post-webhook-tasks:${bucket}`);
		expect(key2).toBe(key1);
		nowSpy.mockRestore();
	});

	it("CRON-AUDIT-003 : idempotencyKey diffère par cron (un cron cassé n'éteint pas l'alerte d'un autre)", async () => {
		const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000_000);

		await sendAdminCronFailedAlert({ job: "cron-a", errors: 1, details: {} });
		await sendAdminCronFailedAlert({ job: "cron-b", errors: 1, details: {} });

		const keyA = mockRenderAndSend.mock.calls[0]![1].idempotencyKey;
		const keyB = mockRenderAndSend.mock.calls[1]![1].idempotencyKey;
		expect(keyA).not.toBe(keyB);
		nowSpy.mockRestore();
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendAdminCronFailedAlert({
			job: "cleanup-carts",
			errors: 1,
			details: {},
		});

		expect(result).toEqual({ success: true, data: { id: "email-4" } });
	});
});

describe("sendAdminCheckoutFailedAlert", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-5" } });
	});

	it("should render AdminAlertEmail with type=checkout", async () => {
		await sendAdminCheckoutFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			total: 12500,
			errorMessage: "stripe.checkout.sessions.create failed",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.type).toBe("checkout");
		expect(emailArg.props.context).toContain("CMD-001");
		expect(emailArg.props.context).toContain("customer@test.com");
		expect(emailArg.props.stackTrace).toBe("stripe.checkout.sessions.create failed");
		expect(emailArg.props.ctaUrl).toBe("https://test.com/admin");

		const sendOpts = mockRenderAndSend.mock.calls[0]![1];
		expect(sendOpts).toMatchObject({
			to: "admin@test.com",
			subject: "[Admin] Échec checkout Stripe — CMD-001",
			tags: [{ name: "category", value: "admin" }],
		});
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendAdminCheckoutFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			total: 12500,
			errorMessage: "Error",
		});

		expect(result).toEqual({ success: true, data: { id: "email-5" } });
	});
});

describe("sendAdminDisputeAlert", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-6" } });
	});

	it("should render AdminAlertEmail with type=dispute and include disputeId", async () => {
		await sendAdminDisputeAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 12500,
			reason: "fraudulent",
			disputeId: "dp_test123",
			deadline: "2026-03-10",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
			stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_test123",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.type).toBe("dispute");
		expect(emailArg.props.context).toContain("CMD-001");
		expect(emailArg.props.context).toContain("dp_test123");
		expect(emailArg.props.context).toContain("2026-03-10");
		expect(emailArg.props.ctaUrl).toBe("https://test.com/admin/commandes/CMD-001");
		expect(emailArg.props.stripeCtaUrl).toBe("https://dashboard.stripe.com/disputes/dp_test123");

		const sendOpts = mockRenderAndSend.mock.calls[0]![1];
		expect(sendOpts).toMatchObject({
			to: "admin@test.com",
			subject: "[Admin] Litige commande CMD-001 — Action requise",
			tags: [{ name: "category", value: "admin" }],
		});
	});

	it("should accept null deadline and omit deadline line from context", async () => {
		await sendAdminDisputeAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 12500,
			reason: "fraudulent",
			disputeId: "dp_test123",
			deadline: null,
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
			stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_test123",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.context).not.toContain("Deadline");
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendAdminDisputeAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 12500,
			reason: "fraudulent",
			disputeId: "dp_test123",
			deadline: null,
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
			stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_test123",
		});

		expect(result).toEqual({ success: true, data: { id: "email-6" } });
	});
});

describe("sendAdminInvoiceFailedAlert", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-7" } });
	});

	it("should render AdminAlertEmail with type=invoice and include B2B fields", async () => {
		await sendAdminInvoiceFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			customerCompanyName: "SARL Dupont",
			customerSiret: "12345678901234",
			amount: 12500,
			errorMessage: "PDF generation failed",
			stripePaymentIntentId: "pi_test123",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.type).toBe("invoice");
		expect(emailArg.props.context).toContain("SARL Dupont");
		expect(emailArg.props.context).toContain("12345678901234");
		expect(emailArg.props.stripeCtaUrl).toBe("https://dashboard.stripe.com/payments/pi_test123");

		const sendOpts = mockRenderAndSend.mock.calls[0]![1];
		expect(sendOpts).toMatchObject({
			to: "admin@test.com",
			subject: "[Admin] Échec génération facture — CMD-001",
			tags: [{ name: "category", value: "admin" }],
		});
	});

	it("should omit optional B2B fields from context when not provided and omit stripeCtaUrl", async () => {
		await sendAdminInvoiceFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 12500,
			errorMessage: "Error",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.context).not.toContain("Entreprise");
		expect(emailArg.props.context).not.toContain("SIRET");
		expect(emailArg.props.stripeCtaUrl).toBeUndefined();
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendAdminInvoiceFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 12500,
			errorMessage: "Error",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		expect(result).toEqual({ success: true, data: { id: "email-7" } });
	});
});

describe("sendAdminOrderProcessingFailedAlert", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-8" } });
	});

	it("should render AdminAlertEmail with type=order-processing and include paymentIntentId", async () => {
		await sendAdminOrderProcessingFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			total: 12500,
			errorMessage: "processOrderTransaction failed",
			paymentIntentId: "pi_test123",
		});

		const emailArg = mockRenderAndSend.mock.calls[0]![0];
		expect(emailArg.props.type).toBe("order-processing");
		expect(emailArg.props.context).toContain("CMD-001");
		expect(emailArg.props.context).toContain("pi_test123");
		expect(emailArg.props.stackTrace).toBe("processOrderTransaction failed");
		expect(emailArg.props.ctaUrl).toBe("https://test.com/admin");
		expect(emailArg.props.stripeCtaUrl).toBe("https://dashboard.stripe.com/payments/pi_test123");

		const sendOpts = mockRenderAndSend.mock.calls[0]![1];
		expect(sendOpts).toMatchObject({
			to: "admin@test.com",
			subject: "[URGENT] Paiement recu — Echec traitement commande CMD-001",
			tags: [{ name: "category", value: "admin" }],
		});
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendAdminOrderProcessingFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			total: 12500,
			errorMessage: "Error",
			paymentIntentId: "pi_test123",
		});

		expect(result).toEqual({ success: true, data: { id: "email-8" } });
	});
});
