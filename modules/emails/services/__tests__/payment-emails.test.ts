import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}));

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/payment-failed-email", () => ({
	PaymentFailedEmail: vi.fn((props) => ({ type: "PaymentFailedEmail", props })),
}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		PAYMENT_FAILED: "Échec de votre paiement - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}));

import { sendPaymentFailedEmail } from "../payment-emails";

describe("sendPaymentFailedEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } });
	});

	it("should call renderAndSend with correct component props", async () => {
		await sendPaymentFailedEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			orderNumber: "CMD-001",
			retryUrl: "https://test.com/paiement/retry?order=CMD-001",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "PaymentFailedEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					retryUrl: "https://test.com/paiement/retry?order=CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Échec de votre paiement - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "payment" }],
			}),
		);
	});

	it("should return the result from renderAndSend", async () => {
		const result = await sendPaymentFailedEmail({
			to: "customer@test.com",
			customerName: "Marie Dupont",
			orderNumber: "CMD-001",
			retryUrl: "https://test.com/paiement/retry?order=CMD-001",
		});

		expect(result).toEqual({ success: true, data: { id: "email-1" } });
	});

	it("should pass all params to the component correctly", async () => {
		await sendPaymentFailedEmail({
			to: "autre@test.com",
			customerName: "Jean Martin",
			orderNumber: "CMD-999",
			retryUrl: "https://test.com/paiement/retry?order=CMD-999",
		});

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					orderNumber: "CMD-999",
					customerName: "Jean Martin",
					retryUrl: "https://test.com/paiement/retry?order=CMD-999",
				}),
			}),
			expect.objectContaining({
				to: "autre@test.com",
			}),
		);
	});
});
