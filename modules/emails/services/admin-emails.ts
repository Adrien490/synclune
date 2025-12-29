import { render } from "@react-email/components"
import { AdminNewOrderEmail } from "@/emails/admin-new-order-email"
import { AdminRefundFailedEmail } from "@/emails/admin-refund-failed-email"
import { EMAIL_ADMIN } from "../constants/email.constants"
import { sendEmail } from "./send-email"
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
	orderId: string
	customerName: string
	customerEmail: string
	items: OrderItem[]
	subtotal: number
	discount: number
	shipping: number
	tax: number
	total: number
	shippingAddress: ShippingAddress & { phone: string }
	dashboardUrl: string
	stripePaymentIntentId?: string
}): Promise<EmailResult> {
	const html = await render(
		AdminNewOrderEmail({
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
	)
	return sendEmail({
		to: EMAIL_ADMIN,
		subject: `🎉 Nouvelle commande ${orderNumber} - ${(total / 100).toFixed(2)}€`,
		html,
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
	orderId: string
	customerEmail: string
	amount: number
	reason: "payment_failed" | "payment_canceled" | "other"
	errorMessage: string
	stripePaymentIntentId: string
	dashboardUrl: string
}): Promise<EmailResult> {
	const stripeDashboardUrl = `https://dashboard.stripe.com/payments/${stripePaymentIntentId}`
	const html = await render(
		AdminRefundFailedEmail({
			orderNumber,
			customerEmail,
			amount,
			reason,
			errorMessage,
			stripePaymentIntentId,
			dashboardUrl,
			stripeDashboardUrl,
		})
	)
	return sendEmail({
		to: EMAIL_ADMIN,
		subject: `🚨 ACTION REQUISE : Échec remboursement ${orderNumber}`,
		html,
	})
}

/**
 * Alerte admin : Echec generation facture (Conformite legale)
 * Temporairement desactive en attendant la creation du template email
 */
export async function sendAdminInvoiceFailedAlert(_params: {
	orderNumber: string
	orderId: string
	customerEmail: string
	customerCompanyName?: string
	customerSiret?: string
	amount: number
	errorMessage: string
	stripePaymentIntentId?: string
	dashboardUrl: string
}): Promise<void> {
	// Temporairement desactive en attendant la creation du template email
	// TODO: Activer quand le template sera cree
}
