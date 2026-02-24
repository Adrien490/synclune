import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}))

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}))

vi.mock("@/emails/customization-request-email", () => ({
	CustomizationRequestEmail: vi.fn((props) => ({ type: "CustomizationRequestEmail", props })),
}))

vi.mock("@/emails/customization-confirmation-email", () => ({
	CustomizationConfirmationEmail: vi.fn((props) => ({ type: "CustomizationConfirmationEmail", props })),
}))

vi.mock("@/emails/customization-status-email", () => ({
	CustomizationStatusEmail: vi.fn((props) => ({ type: "CustomizationStatusEmail", props })),
}))

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		CUSTOMIZATION_REQUEST: "✨ Nouvelle demande de personnalisation - Synclune",
		CUSTOMIZATION_CONFIRMATION: "Votre demande de personnalisation a été reçue - Synclune",
		CUSTOMIZATION_IN_PROGRESS: "Votre personnalisation est en cours - Synclune",
		CUSTOMIZATION_COMPLETED: "Votre personnalisation est terminée ! - Synclune",
		CUSTOMIZATION_CANCELLED: "Votre demande de personnalisation a été annulée - Synclune",
	},
	EMAIL_ADMIN: "admin@test.com",
	EMAIL_CONTACT: "contact@test.com",
}))

vi.mock("@/shared/constants/urls", () => ({
	buildUrl: vi.fn((route: string) => `https://test.com${route}`),
	ROUTES: {
		SHOP: {
			PRODUCTS: "/boutique",
		},
	},
}))

import {
	sendCustomizationRequestEmail,
	sendCustomizationConfirmationEmail,
	sendCustomizationStatusEmail,
} from "../customization-emails"

const mockInspirationProducts = [{ title: "Bague solitaire" }, { title: "Alliance double" }]

describe("sendCustomizationRequestEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } })
	})

	it("should call renderAndSend with EMAIL_ADMIN as recipient", async () => {
		await sendCustomizationRequestEmail({
			firstName: "Marie",
			email: "marie@test.com",
			phone: "+33612345678",
			productTypeLabel: "Bague",
			details: "Je souhaite une bague en or avec un diamant.",
			inspirationProducts: mockInspirationProducts,
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "CustomizationRequestEmail",
				props: expect.objectContaining({
					firstName: "Marie",
					email: "marie@test.com",
					phone: "+33612345678",
					productTypeLabel: "Bague",
					details: "Je souhaite une bague en or avec un diamant.",
					inspirationProducts: mockInspirationProducts,
				}),
			}),
			expect.objectContaining({
				to: "admin@test.com",
				subject: "✨ Nouvelle demande de personnalisation - Synclune - Marie",
				replyTo: "marie@test.com",
				tags: [{ name: "category", value: "customization" }],
			})
		)
	})

	it("should use customer email as replyTo", async () => {
		await sendCustomizationRequestEmail({
			firstName: "Jean",
			email: "jean@test.com",
			productTypeLabel: "Collier",
			details: "Un collier personnalisé.",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				replyTo: "jean@test.com",
			})
		)
	})

	it("should include firstName in subject", async () => {
		await sendCustomizationRequestEmail({
			firstName: "Sophie",
			email: "sophie@test.com",
			productTypeLabel: "Bracelet",
			details: "Un bracelet doré.",
		})

		const callArgs = mockRenderAndSend.mock.calls[0][1]
		expect(callArgs.subject).toContain("Sophie")
	})

	it("should accept undefined optional fields", async () => {
		await sendCustomizationRequestEmail({
			firstName: "Marie",
			email: "marie@test.com",
			productTypeLabel: "Bague",
			details: "Détails.",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					phone: undefined,
					inspirationProducts: undefined,
				}),
			}),
			expect.anything()
		)
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendCustomizationRequestEmail({
			firstName: "Marie",
			email: "marie@test.com",
			productTypeLabel: "Bague",
			details: "Détails.",
		})

		expect(result).toEqual({ success: true, data: { id: "email-1" } })
	})
})

describe("sendCustomizationConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-2" } })
	})

	it("should call renderAndSend with customer email as recipient", async () => {
		await sendCustomizationConfirmationEmail({
			firstName: "Marie",
			email: "marie@test.com",
			productTypeLabel: "Bague",
			details: "Je souhaite une bague en or avec un diamant.",
			inspirationProducts: mockInspirationProducts,
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "CustomizationConfirmationEmail",
				props: expect.objectContaining({
					firstName: "Marie",
					productTypeLabel: "Bague",
					details: "Je souhaite une bague en or avec un diamant.",
					inspirationProducts: mockInspirationProducts,
				}),
			}),
			expect.objectContaining({
				to: "marie@test.com",
				subject: "Votre demande de personnalisation a été reçue - Synclune",
				tags: [{ name: "category", value: "customization" }],
			})
		)
	})

	it("should not include replyTo", async () => {
		await sendCustomizationConfirmationEmail({
			firstName: "Marie",
			email: "marie@test.com",
			productTypeLabel: "Bague",
			details: "Détails.",
		})

		const callArgs = mockRenderAndSend.mock.calls[0][1]
		expect(callArgs).not.toHaveProperty("replyTo")
	})

	it("should not pass email field to the component", async () => {
		await sendCustomizationConfirmationEmail({
			firstName: "Marie",
			email: "marie@test.com",
			productTypeLabel: "Bague",
			details: "Détails.",
		})

		const componentProps = mockRenderAndSend.mock.calls[0][0].props
		expect(componentProps).not.toHaveProperty("email")
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendCustomizationConfirmationEmail({
			firstName: "Marie",
			email: "marie@test.com",
			productTypeLabel: "Bague",
			details: "Détails.",
		})

		expect(result).toEqual({ success: true, data: { id: "email-2" } })
	})
})

describe("sendCustomizationStatusEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-3" } })
	})

	it("should call renderAndSend with IN_PROGRESS status and correct subject", async () => {
		await sendCustomizationStatusEmail({
			email: "marie@test.com",
			firstName: "Marie",
			productTypeLabel: "Bague",
			status: "IN_PROGRESS",
			details: "En cours de fabrication.",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "CustomizationStatusEmail",
				props: expect.objectContaining({
					firstName: "Marie",
					productTypeLabel: "Bague",
					status: "IN_PROGRESS",
					details: "En cours de fabrication.",
					shopUrl: "https://test.com/boutique",
				}),
			}),
			expect.objectContaining({
				to: "marie@test.com",
				subject: "Votre personnalisation est en cours - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "customization" }],
			})
		)
	})

	it("should use COMPLETED subject for COMPLETED status", async () => {
		await sendCustomizationStatusEmail({
			email: "marie@test.com",
			firstName: "Marie",
			productTypeLabel: "Bague",
			status: "COMPLETED",
			details: "Votre bague est prête.",
		})

		const callArgs = mockRenderAndSend.mock.calls[0][1]
		expect(callArgs.subject).toBe("Votre personnalisation est terminée ! - Synclune")
	})

	it("should use CANCELLED subject for CANCELLED status", async () => {
		await sendCustomizationStatusEmail({
			email: "marie@test.com",
			firstName: "Marie",
			productTypeLabel: "Bague",
			status: "CANCELLED",
			details: "Demande annulée.",
		})

		const callArgs = mockRenderAndSend.mock.calls[0][1]
		expect(callArgs.subject).toBe("Votre demande de personnalisation a été annulée - Synclune")
	})

	it("should pass adminNotes to the component", async () => {
		await sendCustomizationStatusEmail({
			email: "marie@test.com",
			firstName: "Marie",
			productTypeLabel: "Bague",
			status: "IN_PROGRESS",
			adminNotes: "Nous attendons la livraison de l'or.",
			details: "En cours.",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					adminNotes: "Nous attendons la livraison de l'or.",
				}),
			}),
			expect.anything()
		)
	})

	it("should accept null adminNotes", async () => {
		await sendCustomizationStatusEmail({
			email: "marie@test.com",
			firstName: "Marie",
			productTypeLabel: "Bague",
			status: "IN_PROGRESS",
			adminNotes: null,
			details: "En cours.",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ adminNotes: null }),
			}),
			expect.anything()
		)
	})

	it("should build shopUrl from ROUTES.SHOP.PRODUCTS", async () => {
		const { buildUrl } = await import("@/shared/constants/urls")

		await sendCustomizationStatusEmail({
			email: "marie@test.com",
			firstName: "Marie",
			productTypeLabel: "Bague",
			status: "COMPLETED",
			details: "Prêt.",
		})

		expect(buildUrl).toHaveBeenCalledWith("/boutique")
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendCustomizationStatusEmail({
			email: "marie@test.com",
			firstName: "Marie",
			productTypeLabel: "Bague",
			status: "IN_PROGRESS",
			details: "En cours.",
		})

		expect(result).toEqual({ success: true, data: { id: "email-3" } })
	})
})
