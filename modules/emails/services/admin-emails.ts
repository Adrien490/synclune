import { render } from "@react-email/components"
import { AdminNewOrderEmail } from "@/emails/admin-new-order-email"
import { AdminRefundFailedEmail } from "@/emails/admin-refund-failed-email"
import { AdminWebhookFailedEmail } from "@/emails/admin-webhook-failed-email"
import { AdminInvoiceFailedEmail } from "@/emails/admin-invoice-failed-email"
import { EMAIL_ADMIN } from "../constants/email.constants"
import { sendEmail } from "./send-email"
import { EXTERNAL_URLS, getBaseUrl } from "@/shared/constants/urls"
import type { EmailResult, ShippingAddress, OrderItem } from "../types/email.types"

/**
 * Envoie un email de notification admin pour une nouvelle commande
 */
export async function sendAdminNewOrderEmail({
	orderNumber,
	customerName,
	customerEmail,
	items,
	subtotal,
	discount,
	shipping,
	total,
	shippingAddress,
	dashboardUrl,
}: {
	orderNumber: string
	customerName: string
	customerEmail: string
	items: OrderItem[]
	subtotal: number
	discount: number
	shipping: number
	total: number
	shippingAddress: ShippingAddress & { phone: string }
	dashboardUrl: string
}): Promise<EmailResult> {
	const component = AdminNewOrderEmail({
		orderNumber,
		customerName,
		customerEmail,
		items,
		subtotal,
		discount,
		shipping,
		total,
		shippingAddress,
		dashboardUrl,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to: EMAIL_ADMIN,
		subject: `🎉 Nouvelle commande ${orderNumber} - ${(total / 100).toFixed(2)}€`,
		html,
		text,
		tags: [{ name: "category", value: "admin" }],
	})
}

/**
 * Envoie une alerte admin en cas d'echec de remboursement automatique
 */
export async function sendAdminRefundFailedAlert({
	orderNumber,
	customerEmail,
	amount,
	reason,
	errorMessage,
	stripePaymentIntentId,
	dashboardUrl,
}: {
	orderNumber: string
	customerEmail: string
	amount: number
	reason: "payment_failed" | "payment_canceled" | "other"
	errorMessage: string
	stripePaymentIntentId: string
	dashboardUrl: string
}): Promise<EmailResult> {
	const stripeDashboardUrl = `https://dashboard.stripe.com/payments/${stripePaymentIntentId}`
	const component = AdminRefundFailedEmail({
		orderNumber,
		customerEmail,
		amount,
		reason,
		errorMessage,
		stripePaymentIntentId,
		dashboardUrl,
		stripeDashboardUrl,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to: EMAIL_ADMIN,
		subject: `🚨 ACTION REQUISE : Échec remboursement ${orderNumber}`,
		html,
		text,
		tags: [{ name: "category", value: "admin" }],
	})
}

/**
 * Envoie une alerte admin lorsqu'un webhook echoue plusieurs fois
 */
export async function sendWebhookFailedAlertEmail({
	eventId,
	eventType,
	attempts,
	error,
}: {
	eventId: string
	eventType: string
	attempts: number
	error: string
}): Promise<EmailResult> {
	const stripeDashboardUrl = EXTERNAL_URLS.STRIPE.WEBHOOKS
	const adminDashboardUrl = `${getBaseUrl()}/admin`
	const component = AdminWebhookFailedEmail({
		eventId,
		eventType,
		attempts,
		error,
		stripeDashboardUrl,
		adminDashboardUrl,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to: EMAIL_ADMIN,
		subject: `[ALERTE] Webhook ${eventType} echoue (${attempts} tentatives)`,
		html,
		text,
		tags: [{ name: "category", value: "admin" }],
	})
}

/**
 * Alerte admin : Echec generation facture (Conformite legale)
 */
export async function sendAdminInvoiceFailedAlert({
	orderNumber,
	customerEmail,
	customerCompanyName,
	customerSiret,
	amount,
	errorMessage,
	stripePaymentIntentId,
	dashboardUrl,
}: {
	orderNumber: string
	customerEmail: string
	customerCompanyName?: string
	customerSiret?: string
	amount: number
	errorMessage: string
	stripePaymentIntentId?: string
	dashboardUrl: string
}): Promise<EmailResult> {
	const component = AdminInvoiceFailedEmail({
		orderNumber,
		customerEmail,
		customerCompanyName,
		customerSiret,
		amount,
		errorMessage,
		stripePaymentIntentId,
		dashboardUrl,
	})
	const html = await render(component)
	const text = await render(component, { plainText: true })
	return sendEmail({
		to: EMAIL_ADMIN,
		subject: `🚨 ACTION REQUISE : Échec génération facture ${orderNumber}`,
		html,
		text,
		tags: [{ name: "category", value: "admin" }],
	})
}
