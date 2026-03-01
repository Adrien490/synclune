import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}));

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/cancel-order-confirmation-email", () => ({
	CancelOrderConfirmationEmail: vi.fn((props) => ({ type: "CancelOrderConfirmationEmail", props })),
}));

vi.mock("@/emails/return-confirmation-email", () => ({
	ReturnConfirmationEmail: vi.fn((props) => ({ type: "ReturnConfirmationEmail", props })),
}));

vi.mock("@/emails/revert-shipping-notification-email", () => ({
	RevertShippingNotificationEmail: vi.fn((props) => ({
		type: "RevertShippingNotificationEmail",
		props,
	})),
}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		ORDER_CANCELLED: "Votre commande a été annulée - Synclune",
		ORDER_RETURNED: "Retour enregistré pour votre commande - Synclune",
		ORDER_SHIPPING_REVERTED: "Mise à jour de l'expédition de votre commande - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}));

import {
	sendCancelOrderConfirmationEmail,
	sendReturnConfirmationEmail,
	sendRevertShippingNotificationEmail,
} from "../status-emails";

describe("sendCancelOrderConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendCancelOrderConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			orderTotal: 12500,
			reason: "Commande en double",
			wasRefunded: true,
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "CancelOrderConfirmationEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					orderTotal: 12500,
					reason: "Commande en double",
					wasRefunded: true,
					orderDetailsUrl: "https://test.com/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Votre commande a été annulée - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			}),
		);
	});

	it("should accept undefined reason", async () => {
		await sendCancelOrderConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			orderTotal: 12500,
			wasRefunded: false,
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ reason: undefined }),
			}),
			expect.anything(),
		);
	});

	it("should handle wasRefunded: false", async () => {
		await sendCancelOrderConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			orderTotal: 12500,
			wasRefunded: false,
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ wasRefunded: false }),
			}),
			expect.anything(),
		);
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendCancelOrderConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			orderTotal: 12500,
			wasRefunded: true,
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(result).toEqual({ success: true, data: { id: "email-1" } });
	});
});

describe("sendReturnConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-2" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendReturnConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			orderTotal: 12500,
			reason: "Article non conforme",
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ReturnConfirmationEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					orderTotal: 12500,
					reason: "Article non conforme",
					orderDetailsUrl: "https://test.com/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Retour enregistré pour votre commande - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			}),
		);
	});

	it("should accept undefined reason", async () => {
		await sendReturnConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			orderTotal: 12500,
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ reason: undefined }),
			}),
			expect.anything(),
		);
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendReturnConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			orderTotal: 12500,
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(result).toEqual({ success: true, data: { id: "email-2" } });
	});
});

describe("sendRevertShippingNotificationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-3" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendRevertShippingNotificationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			reason: "Erreur de transporteur",
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "RevertShippingNotificationEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					reason: "Erreur de transporteur",
					orderDetailsUrl: "https://test.com/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Mise à jour de l'expédition de votre commande - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			}),
		);
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendRevertShippingNotificationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			reason: "Erreur de transporteur",
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		});

		expect(result).toEqual({ success: true, data: { id: "email-3" } });
	});
});
