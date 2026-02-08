import { render } from "@react-email/components"
import { OrderConfirmationEmail } from "@/emails/order-confirmation-email"
import { ShippingConfirmationEmail } from "@/emails/shipping-confirmation-email"
import { TrackingUpdateEmail } from "@/emails/tracking-update-email"
import { DeliveryConfirmationEmail } from "@/emails/delivery-confirmation-email"
import { EMAIL_SUBJECTS } from "../constants/email.constants"
import { sendEmail } from "./send-email"
import type { EmailResult, ShippingAddress, OrderItem } from "../types/email.types"

/**
 * Envoie un email de confirmation de commande au client
 */
export async function sendOrderConfirmationEmail({
	to,
	orderNumber,
	customerName,
	items,
	subtotal,
	discount,
	shipping,
	tax,
	total,
	shippingAddress,
	trackingUrl,
}: {
	to: string
	orderNumber: string
	customerName: string
	items: OrderItem[]
	subtotal: number
	discount: number
	shipping: number
	tax: number
	total: number
	shippingAddress: ShippingAddress
	trackingUrl: string
}): Promise<EmailResult> {
	const component = OrderConfirmationEmail({
		orderNumber,
		customerName,
		items,
		subtotal,
		discount,
		shipping,
		tax,
		total,
		shippingAddress,
		trackingUrl,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.ORDER_CONFIRMATION,
		html,
		text,
		tags: [{ name: "category", value: "order" }],
	})
}

/**
 * Envoie un email de confirmation d'expedition au client
 */
export async function sendShippingConfirmationEmail({
	to,
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	shippingAddress,
	estimatedDelivery,
}: {
	to: string
	orderNumber: string
	customerName: string
	trackingNumber: string
	trackingUrl: string | null
	carrierLabel: string
	shippingAddress: ShippingAddress
	estimatedDelivery?: string
}): Promise<EmailResult> {
	const component = ShippingConfirmationEmail({
		orderNumber,
		customerName,
		trackingNumber,
		trackingUrl,
		carrierLabel,
		shippingAddress,
		estimatedDelivery,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.ORDER_SHIPPED,
		html,
		text,
		tags: [{ name: "category", value: "order" }],
	})
}

/**
 * Envoie un email de mise a jour du suivi de commande au client
 */
export async function sendTrackingUpdateEmail({
	to,
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	estimatedDelivery,
}: {
	to: string
	orderNumber: string
	customerName: string
	trackingNumber: string
	trackingUrl: string | null
	carrierLabel: string
	estimatedDelivery?: string
}): Promise<EmailResult> {
	const component = TrackingUpdateEmail({
		orderNumber,
		customerName,
		trackingNumber,
		trackingUrl,
		carrierLabel,
		estimatedDelivery,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.ORDER_TRACKING_UPDATE,
		html,
		text,
		tags: [{ name: "category", value: "order" }],
	})
}

/**
 * Envoie un email de confirmation de livraison au client
 */
export async function sendDeliveryConfirmationEmail({
	to,
	orderNumber,
	customerName,
	deliveryDate,
	orderDetailsUrl,
}: {
	to: string
	orderNumber: string
	customerName: string
	deliveryDate: string
	orderDetailsUrl: string
}): Promise<EmailResult> {
	const component = DeliveryConfirmationEmail({
		orderNumber,
		customerName,
		deliveryDate,
		orderDetailsUrl,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to,
		subject: EMAIL_SUBJECTS.ORDER_DELIVERED,
		html,
		text,
		tags: [{ name: "category", value: "order" }],
	})
}
