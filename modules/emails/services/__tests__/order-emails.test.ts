import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRenderAndSend } = vi.hoisted(() => ({
	mockRenderAndSend: vi.fn(),
}))

vi.mock("../send-email", () => ({
	renderAndSend: mockRenderAndSend,
}))

vi.mock("@/emails/order-confirmation-email", () => ({
	OrderConfirmationEmail: vi.fn((props) => ({ type: "OrderConfirmationEmail", props })),
}))

vi.mock("@/emails/shipping-confirmation-email", () => ({
	ShippingConfirmationEmail: vi.fn((props) => ({ type: "ShippingConfirmationEmail", props })),
}))

vi.mock("@/emails/tracking-update-email", () => ({
	TrackingUpdateEmail: vi.fn((props) => ({ type: "TrackingUpdateEmail", props })),
}))

vi.mock("@/emails/delivery-confirmation-email", () => ({
	DeliveryConfirmationEmail: vi.fn((props) => ({ type: "DeliveryConfirmationEmail", props })),
}))

vi.mock("../../constants/email.constants", () => ({
	EMAIL_SUBJECTS: {
		ORDER_CONFIRMATION: "Confirmation de commande - Synclune",
		ORDER_SHIPPED: "Votre commande a été expédiée - Synclune",
		ORDER_TRACKING_UPDATE: "Mise à jour du suivi de votre commande - Synclune",
		ORDER_DELIVERED: "Votre commande a été livrée - Synclune",
	},
	EMAIL_CONTACT: "contact@test.com",
}))

import {
	sendOrderConfirmationEmail,
	sendShippingConfirmationEmail,
	sendTrackingUpdateEmail,
	sendDeliveryConfirmationEmail,
} from "../order-emails"

const mockShippingAddress = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 rue de la Paix",
	city: "Paris",
	postalCode: "75001",
	country: "FR",
}

const mockItems = [
	{
		productTitle: "Bague en or",
		skuColor: "Or jaune",
		skuMaterial: null,
		skuSize: "52",
		quantity: 1,
		price: 12000,
	},
]

describe("sendOrderConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-1" } })
	})

	it("should call renderAndSend with correct component props", async () => {
		await sendOrderConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			items: mockItems,
			subtotal: 12000,
			discount: 0,
			shipping: 500,
			total: 12500,
			shippingAddress: mockShippingAddress,
			trackingUrl: "https://tracking.test.com/abc",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "OrderConfirmationEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					items: mockItems,
					subtotal: 12000,
					discount: 0,
					shipping: 500,
					total: 12500,
					shippingAddress: mockShippingAddress,
					trackingUrl: "https://tracking.test.com/abc",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Confirmation de commande - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			})
		)
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendOrderConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			items: mockItems,
			subtotal: 12000,
			discount: 0,
			shipping: 500,
			total: 12500,
			shippingAddress: mockShippingAddress,
			trackingUrl: "https://tracking.test.com/abc",
		})

		expect(result).toEqual({ success: true, data: { id: "email-1" } })
	})
})

describe("sendShippingConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-2" } })
	})

	it("should call renderAndSend with correct component props", async () => {
		await sendShippingConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			trackingNumber: "TRACK123",
			trackingUrl: "https://tracking.test.com/TRACK123",
			carrierLabel: "Colissimo",
			shippingAddress: mockShippingAddress,
			estimatedDelivery: "2026-02-28",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ShippingConfirmationEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					trackingNumber: "TRACK123",
					trackingUrl: "https://tracking.test.com/TRACK123",
					carrierLabel: "Colissimo",
					shippingAddress: mockShippingAddress,
					estimatedDelivery: "2026-02-28",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Votre commande a été expédiée - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			})
		)
	})

	it("should accept null trackingUrl", async () => {
		await sendShippingConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			trackingNumber: "TRACK123",
			trackingUrl: null,
			carrierLabel: "Colissimo",
			shippingAddress: mockShippingAddress,
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ trackingUrl: null }),
			}),
			expect.anything()
		)
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendShippingConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			trackingNumber: "TRACK123",
			trackingUrl: null,
			carrierLabel: "Colissimo",
			shippingAddress: mockShippingAddress,
		})

		expect(result).toEqual({ success: true, data: { id: "email-2" } })
	})
})

describe("sendTrackingUpdateEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-3" } })
	})

	it("should call renderAndSend with correct component props", async () => {
		await sendTrackingUpdateEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			trackingNumber: "TRACK123",
			trackingUrl: "https://tracking.test.com/TRACK123",
			carrierLabel: "Chronopost",
			estimatedDelivery: "2026-02-27",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "TrackingUpdateEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					trackingNumber: "TRACK123",
					trackingUrl: "https://tracking.test.com/TRACK123",
					carrierLabel: "Chronopost",
					estimatedDelivery: "2026-02-27",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Mise à jour du suivi de votre commande - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			})
		)
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendTrackingUpdateEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			trackingNumber: "TRACK123",
			trackingUrl: null,
			carrierLabel: "Chronopost",
		})

		expect(result).toEqual({ success: true, data: { id: "email-3" } })
	})
})

describe("sendDeliveryConfirmationEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockRenderAndSend.mockResolvedValue({ success: true, data: { id: "email-4" } })
	})

	it("should call renderAndSend with correct component props", async () => {
		await sendDeliveryConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			deliveryDate: "2026-02-24",
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		})

		expect(mockRenderAndSend).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "DeliveryConfirmationEmail",
				props: expect.objectContaining({
					orderNumber: "CMD-001",
					customerName: "Marie Dupont",
					deliveryDate: "2026-02-24",
					orderDetailsUrl: "https://test.com/commandes/CMD-001",
				}),
			}),
			expect.objectContaining({
				to: "customer@test.com",
				subject: "Votre commande a été livrée - Synclune",
				replyTo: "contact@test.com",
				tags: [{ name: "category", value: "order" }],
			})
		)
	})

	it("should return the result from renderAndSend", async () => {
		const result = await sendDeliveryConfirmationEmail({
			to: "customer@test.com",
			orderNumber: "CMD-001",
			customerName: "Marie Dupont",
			deliveryDate: "2026-02-24",
			orderDetailsUrl: "https://test.com/commandes/CMD-001",
		})

		expect(result).toEqual({ success: true, data: { id: "email-4" } })
	})
})
