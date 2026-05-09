import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}));

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}));

vi.mock("@/emails/refund-confirmed-email", () => ({
	RefundConfirmedEmail: vi.fn((props) => ({ type: "RefundConfirmedEmail", props })),
}));

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		REFUND_CONFIRMATION: "Votre remboursement a été effectué - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}));

import { sendRefundConfirmationEmail } from "../refund-emails";

describe("sendRefundConfirmationEmail", () => {
	const baseParams = {
		to: "client@test.com",
		orderNumber: "SYN-2026-0042",
		customerName: "Marie",
		refundAmount: 4999,
		reason: "Article défectueux",
		orderDetailsUrl: "https://synclune.fr/compte/commandes/SYN-2026-0042",
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "rf-1" } });
	});

	it("forwards all template props (orderNumber, customerName, amount, reason, url)", async () => {
		await sendRefundConfirmationEmail(baseParams);

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "RefundConfirmedEmail",
				props: {
					orderNumber: "SYN-2026-0042",
					customerName: "Marie",
					refundAmount: 4999,
					reason: "Article défectueux",
					orderDetailsUrl: "https://synclune.fr/compte/commandes/SYN-2026-0042",
				},
			}),
			expect.objectContaining({
				to: "client@test.com",
				subject: "Votre remboursement a été effectué - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "payment" }],
			}),
		);
	});

	it("returns the EmailResult from renderAndSend on success", async () => {
		const result = await sendRefundConfirmationEmail(baseParams);
		expect(result).toEqual({ success: true, data: { id: "rf-1" } });
	});

	it("returns the EmailResult unchanged on Resend failure", async () => {
		mockRenderAndSend.mockResolvedValue({
			success: false,
			error: "rate_limit_exceeded",
		});

		const result = await sendRefundConfirmationEmail(baseParams);
		expect(result).toEqual({ success: false, error: "rate_limit_exceeded" });
	});

	it("preserves zero-amount refunds (e.g. discount-only refund) in template props", async () => {
		await sendRefundConfirmationEmail({ ...baseParams, refundAmount: 0 });

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ refundAmount: 0 }),
			}),
			expect.anything(),
		);
	});

	it("uses the 'payment' email category tag (not 'order')", async () => {
		await sendRefundConfirmationEmail(baseParams);

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tags: expect.arrayContaining([
					expect.objectContaining({ name: "category", value: "payment" }),
				]),
			}),
		);
	});
});
