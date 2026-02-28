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

vi.mock("@/emails/admin-refund-failed-email", () => ({
	AdminRefundFailedEmail: vi.fn((props) => ({ type: "AdminRefundFailedEmail", props })),
}));

vi.mock("@/emails/admin-webhook-failed-email", () => ({
	AdminWebhookFailedEmail: vi.fn((props) => ({ type: "AdminWebhookFailedEmail", props })),
}));

vi.mock("@/emails/admin-invoice-failed-email", () => ({
	AdminInvoiceFailedEmail: vi.fn((props) => ({ type: "AdminInvoiceFailedEmail", props })),
}));

vi.mock("@/emails/admin-cron-failed-email", () => ({
	AdminCronFailedEmail: vi.fn((props) => ({ type: "AdminCronFailedEmail", props })),
}));

vi.mock("@/emails/admin-checkout-failed-email", () => ({
	AdminCheckoutFailedEmail: vi.fn((props) => ({ type: "AdminCheckoutFailedEmail", props })),
}));

vi.mock("@/emails/admin-dispute-alert-email", () => ({
	AdminDisputeAlertEmail: vi.fn((props) => ({ type: "AdminDisputeAlertEmail", props })),
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
			}),
		);
	});

	it("should format total correctly in subject", async () => {
		await sendAdminNewOrderEmail({
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

	it("should return the result from renderAndSend", async () => {
		const result = await sendAdminNewOrderEmail({
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

	it("should call renderAndSend with EMAIL_ADMIN as recipient and constructed stripeDashboardUrl", async () => {
		await sendAdminRefundFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 5000,
			reason: "payment_failed",
			errorMessage: "Insufficient funds",
			stripePaymentIntentId: "pi_test123",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "AdminRefundFailedEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerEmail: "customer@test.com",
					amount: 5000,
					reason: "payment_failed",
					errorMessage: "Insufficient funds",
					stripePaymentIntentId: "pi_test123",
					dashboardUrl: "https://test.com/admin/commandes/CMD-001",
					stripeDashboardUrl: "https://dashboard.stripe.com/payments/pi_test123",
				}),
			}),
			expect.objectContaining({
				to: "admin@test.com",
				subject: "🚨 ACTION REQUISE : Échec remboursement CMD-001",
				tags: [{ name: "category", value: "admin" }],
			}),
		);
	});

	it("should construct stripeDashboardUrl from stripePaymentIntentId", async () => {
		await sendAdminRefundFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 5000,
			reason: "other",
			errorMessage: "Error",
			stripePaymentIntentId: "pi_unique456",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					stripeDashboardUrl: "https://dashboard.stripe.com/payments/pi_unique456",
				}),
			}),
			expect.anything(),
		);
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

	it("should call renderAndSend with EMAIL_ADMIN as recipient and constructed URLs", async () => {
		await sendWebhookFailedAlertEmail({
			eventId: "evt_test123",
			eventType: "payment_intent.succeeded",
			attempts: 3,
			error: "Connection timeout",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "AdminWebhookFailedEmail",
				props: expect.objectContaining({
					eventId: "evt_test123",
					eventType: "payment_intent.succeeded",
					attempts: 3,
					error: "Connection timeout",
					stripeDashboardUrl: "https://dashboard.stripe.com/webhooks",
					adminDashboardUrl: "https://test.com/admin",
				}),
			}),
			expect.objectContaining({
				to: "admin@test.com",
				subject: "[ALERTE] Webhook payment_intent.succeeded échoué (3 tentatives)",
				tags: [{ name: "category", value: "admin" }],
			}),
		);
	});

	it("should use EXTERNAL_URLS.STRIPE.WEBHOOKS for stripeDashboardUrl", async () => {
		await sendWebhookFailedAlertEmail({
			eventId: "evt_test123",
			eventType: "checkout.session.completed",
			attempts: 5,
			error: "Database error",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					stripeDashboardUrl: "https://dashboard.stripe.com/webhooks",
				}),
			}),
			expect.anything(),
		);
	});

	it("should use getBaseUrl() to build adminDashboardUrl", async () => {
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

	it("should call renderAndSend with EMAIL_ADMIN as recipient", async () => {
		await sendAdminCronFailedAlert({
			job: "cleanup-carts",
			errors: 5,
			details: { failedIds: ["abc", "def"] },
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "AdminCronFailedEmail",
				props: expect.objectContaining({
					job: "cleanup-carts",
					errors: 5,
					details: { failedIds: ["abc", "def"] },
				}),
			}),
			expect.objectContaining({
				to: "admin@test.com",
				subject: "[ALERTE CRON] cleanup-carts — 5 erreur(s)",
				tags: [{ name: "category", value: "admin" }],
			}),
		);
	});

	it("should include error count in subject", async () => {
		await sendAdminCronFailedAlert({
			job: "sync-async-payments",
			errors: 12,
			details: {},
		});

		const callArgs = mockRenderAndSend.mock.calls[0]![1];
		expect(callArgs.subject).toBe("[ALERTE CRON] sync-async-payments — 12 erreur(s)");
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

	it("should call renderAndSend with EMAIL_ADMIN as recipient", async () => {
		await sendAdminCheckoutFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			total: 12500,
			errorMessage: "stripe.checkout.sessions.create failed",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "AdminCheckoutFailedEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerEmail: "customer@test.com",
					total: 12500,
					errorMessage: "stripe.checkout.sessions.create failed",
				}),
			}),
			expect.objectContaining({
				to: "admin@test.com",
				subject: "[ALERTE CHECKOUT] Échec session Stripe — CMD-001",
				tags: [{ name: "category", value: "admin" }],
			}),
		);
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

	it("should call renderAndSend with EMAIL_ADMIN as recipient", async () => {
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

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "AdminDisputeAlertEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerEmail: "customer@test.com",
					amount: 12500,
					reason: "fraudulent",
					disputeId: "dp_test123",
					deadline: "2026-03-10",
					dashboardUrl: "https://test.com/admin/commandes/CMD-001",
					stripeDashboardUrl: "https://dashboard.stripe.com/disputes/dp_test123",
				}),
			}),
			expect.objectContaining({
				to: "admin@test.com",
				subject: "[LITIGE] Commande CMD-001 — Action requise",
				tags: [{ name: "category", value: "admin" }],
			}),
		);
	});

	it("should accept null deadline", async () => {
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

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ deadline: null }),
			}),
			expect.anything(),
		);
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

	it("should call renderAndSend with EMAIL_ADMIN as recipient", async () => {
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

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "AdminInvoiceFailedEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerEmail: "customer@test.com",
					customerCompanyName: "SARL Dupont",
					customerSiret: "12345678901234",
					amount: 12500,
					errorMessage: "PDF generation failed",
					stripePaymentIntentId: "pi_test123",
					dashboardUrl: "https://test.com/admin/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "admin@test.com",
				subject: "🚨 ACTION REQUISE : Échec génération facture CMD-001",
				tags: [{ name: "category", value: "admin" }],
			}),
		);
	});

	it("should accept undefined optional fields", async () => {
		await sendAdminInvoiceFailedAlert({
			orderNumber: "CMD-001",
			customerEmail: "customer@test.com",
			amount: 12500,
			errorMessage: "Error",
			dashboardUrl: "https://test.com/admin/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					customerCompanyName: undefined,
					customerSiret: undefined,
					stripePaymentIntentId: undefined,
				}),
			}),
			expect.anything(),
		);
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
