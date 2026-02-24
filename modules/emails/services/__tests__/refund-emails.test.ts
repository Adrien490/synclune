import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}))

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}))

vi.mock("@/emails/refund-confirmation-email", () => ({
	RefundConfirmationEmail: vi.fn((props) => ({ type: "RefundConfirmationEmail", props })),
}))

vi.mock("@/emails/refund-approved-email", () => ({
	RefundApprovedEmail: vi.fn((props) => ({ type: "RefundApprovedEmail", props })),
}))

vi.mock("@/emails/refund-rejected-email", () => ({
	RefundRejectedEmail: vi.fn((props) => ({ type: "RefundRejectedEmail", props })),
}))

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		REFUND_CONFIRMATION: "Votre remboursement a été effectué - Synclune",
		REFUND_APPROVED: "Votre demande de remboursement a été acceptée - Synclune",
		REFUND_REJECTED: "Votre demande de remboursement a été refusée - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}))

import {
	sendRefundConfirmationEmail,
	sendRefundApprovedEmail,
	sendRefundRejectedEmail,
} from "../refund-emails"

const baseRefundParams = {
	to: "customer@test.com",
	orderNumber: "CMD-001",
	customerName: "Marie Dupont",
	refundAmount: 5000,
	originalOrderTotal: 12500,
	reason: "Article défectueux",
	isPartialRefund: true,
	orderDetailsUrl: "https://test.com/commandes/CMD-001",
}

describe("sendRefundConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } })
	})

	it("should call renderAndSend with correct component props", async () => {
		await sendRefundConfirmationEmail(baseRefundParams)

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "RefundConfirmationEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					refundAmount: 5000,
					originalOrderTotal: 12500,
					reason: "Article défectueux",
					isPartialRefund: true,
					orderDetailsUrl: "https://test.com/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Votre remboursement a été effectué - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "payment" }],
			})
		)
	})

	it("should handle full refund (isPartialRefund: false)", async () => {
		await sendRefundConfirmationEmail({ ...baseRefundParams, isPartialRefund: false })

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ isPartialRefund: false }),
			}),
			expect.anything()
		)
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendRefundConfirmationEmail(baseRefundParams)

		expect(result).toEqual({ success: true, data: { id: "email-1" } })
	})
})

describe("sendRefundApprovedEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-2" } })
	})

	it("should call renderAndSend with correct component props", async () => {
		await sendRefundApprovedEmail(baseRefundParams)

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "RefundApprovedEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					refundAmount: 5000,
					originalOrderTotal: 12500,
					reason: "Article défectueux",
					isPartialRefund: true,
					orderDetailsUrl: "https://test.com/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Votre demande de remboursement a été acceptée - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "payment" }],
			})
		)
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendRefundApprovedEmail(baseRefundParams)

		expect(result).toEqual({ success: true, data: { id: "email-2" } })
	})
})

describe("sendRefundRejectedEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-3" } })
	})

	it("should call renderAndSend with correct component props", async () => {
		await sendRefundRejectedEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			refundAmount: 5000,
			reason: "Hors délai de retour",
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "RefundRejectedEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					refundAmount: 5000,
					reason: "Hors délai de retour",
					orderDetailsUrl: "https://test.com/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Votre demande de remboursement a été refusée - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "payment" }],
			})
		)
	})

	it("should accept undefined reason", async () => {
		await sendRefundRejectedEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			refundAmount: 5000,
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ reason: undefined }),
			}),
			expect.anything()
		)
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendRefundRejectedEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			refundAmount: 5000,
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		})

		expect(result).toEqual({ success: true, data: { id: "email-3" } })
	})
})
