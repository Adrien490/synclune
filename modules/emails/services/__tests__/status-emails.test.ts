import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}));

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/cancel-order-confirmation-email", () => ({
	CancelOrderConfirmationEmail: vi.fn((props) => ({
		type: "CancelOrderConfirmationEmail",
		props,
	})),
}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		ORDER_CANCELLED: "Votre commande a été annulée - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}));

import { sendCancelOrderConfirmationEmail } from "../status-emails";

describe("sendCancelOrderConfirmationEmail", () => {
	const baseParams = {
		to: "client@test.com",
		orderNumber: "SYN-2026-0007",
		customerName: "Marie",
		orderTotal: 12500,
		reason: "Article rupture de stock",
		wasRefunded: false,
		orderDetailsUrl: "https://synclune.fr/compte/commandes/SYN-2026-0007",
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "cancel-1" } });
	});

	it("forwards all params (orderNumber, customerName, total, reason, refunded flag, url)", async () => {
		await sendCancelOrderConfirmationEmail(baseParams);

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "CancelOrderConfirmationEmail",
				props: {
					orderNumber: "SYN-2026-0007",
					customerName: "Marie",
					orderTotal: 12500,
					reason: "Article rupture de stock",
					wasRefunded: false,
					orderDetailsUrl: "https://synclune.fr/compte/commandes/SYN-2026-0007",
				},
			}),
			expect.objectContaining({
				to: "client@test.com",
				subject: "Votre commande a été annulée - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			}),
		);
	});

	it("supports omitting the optional 'reason' field", async () => {
		const { reason: _reason, ...withoutReason } = baseParams;

		await sendCancelOrderConfirmationEmail(withoutReason);

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					orderNumber: "SYN-2026-0007",
					reason: undefined,
				}),
			}),
			expect.anything(),
		);
	});

	it("propagates wasRefunded=true to the template (used to mention refund processing)", async () => {
		await sendCancelOrderConfirmationEmail({ ...baseParams, wasRefunded: true });

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ wasRefunded: true }),
			}),
			expect.anything(),
		);
	});

	it("returns the EmailResult from renderAndSend on success", async () => {
		const result = await sendCancelOrderConfirmationEmail(baseParams);
		expect(result).toEqual({ success: true, data: { id: "cancel-1" } });
	});

	it("returns the EmailResult unchanged on Resend failure", async () => {
		mockRenderAndSend.mockResolvedValue({ success: false, error: "smtp_down" });

		const result = await sendCancelOrderConfirmationEmail(baseParams);
		expect(result).toEqual({ success: false, error: "smtp_down" });
	});

	it("uses the 'order' email category tag", async () => {
		await sendCancelOrderConfirmationEmail(baseParams);

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tags: expect.arrayContaining([
					expect.objectContaining({ name: "category", value: "order" }),
				]),
			}),
		);
	});
});
