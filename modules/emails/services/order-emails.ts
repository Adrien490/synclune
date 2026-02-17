import { OrderConfirmationEmail } from "@/emails/order-confirmation-email"
import { ShippingConfirmationEmail } from "@/emails/shipping-confirmation-email"
import { TrackingUpdateEmail } from "@/emails/tracking-update-email"
import { DeliveryConfirmationEmail } from "@/emails/delivery-confirmation-email"
import { EMAIL_CONTACT, EMAIL_SUBJECTS } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
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
	total: number
	shippingAddress: ShippingAddress
	trackingUrl: string
}): Promise<EmailResult> {
	return renderAndSend(
		OrderConfirmationEmail({
			orderNumber,
			customerName,
			items,
			subtotal,
			discount,
			shipping,
			total,
			shippingAddress,
			trackingUrl,
		}),
		{ to, subject: EMAIL_SUBJECTS.ORDER_CONFIRMATION, replyTo: EMAIL_CONTACT, tags: [{ name: "category", value: "order" }] }
	)
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
	return renderAndSend(
		ShippingConfirmationEmail({
			orderNumber,
			customerName,
			trackingNumber,
			trackingUrl,
			carrierLabel,
			shippingAddress,
			estimatedDelivery,
		}),
		{ to, subject: EMAIL_SUBJECTS.ORDER_SHIPPED, replyTo: EMAIL_CONTACT, tags: [{ name: "category", value: "order" }] }
	)
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
	return renderAndSend(
		TrackingUpdateEmail({
			orderNumber,
			customerName,
			trackingNumber,
			trackingUrl,
			carrierLabel,
			estimatedDelivery,
		}),
		{ to, subject: EMAIL_SUBJECTS.ORDER_TRACKING_UPDATE, replyTo: EMAIL_CONTACT, tags: [{ name: "category", value: "order" }] }
	)
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
	return renderAndSend(
		DeliveryConfirmationEmail({
			orderNumber,
			customerName,
			deliveryDate,
			orderDetailsUrl,
		}),
		{ to, subject: EMAIL_SUBJECTS.ORDER_DELIVERED, replyTo: EMAIL_CONTACT, tags: [{ name: "category", value: "order" }] }
	)
}
