import { AdminNewOrderEmail } from "@/emails/admin-new-order-email"
import { AdminRefundFailedEmail } from "@/emails/admin-refund-failed-email"
import { AdminWebhookFailedEmail } from "@/emails/admin-webhook-failed-email"
import { AdminInvoiceFailedEmail } from "@/emails/admin-invoice-failed-email"
import { AdminCronFailedEmail } from "@/emails/admin-cron-failed-email"
import { AdminCheckoutFailedEmail } from "@/emails/admin-checkout-failed-email"
import { AdminDisputeAlertEmail } from "@/emails/admin-dispute-alert-email"
import { EMAIL_ADMIN } from "../constants/email.constants"
import { renderAndSend } from "./send-email"
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
	return renderAndSend(
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
		}),
		{
			to: EMAIL_ADMIN,
			subject: `🎉 Nouvelle commande ${orderNumber} - ${(total / 100).toFixed(2)}€`,
			tags: [{ name: "category", value: "admin" }],
		}
	)
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
	return renderAndSend(
		AdminRefundFailedEmail({
			orderNumber,
			customerEmail,
			amount,
			reason,
			errorMessage,
			stripePaymentIntentId,
			dashboardUrl,
			stripeDashboardUrl,
		}),
		{
			to: EMAIL_ADMIN,
			subject: `🚨 ACTION REQUISE : Échec remboursement ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
		}
	)
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
	return renderAndSend(
		AdminWebhookFailedEmail({
			eventId,
			eventType,
			attempts,
			error,
			stripeDashboardUrl,
			adminDashboardUrl,
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[ALERTE] Webhook ${eventType} échoué (${attempts} tentatives)`,
			tags: [{ name: "category", value: "admin" }],
		}
	)
}

/**
 * Alerte admin : Echecs dans un cron job critique
 */
export async function sendAdminCronFailedAlert({
	job,
	errors,
	details,
}: {
	job: string
	errors: number
	details: Record<string, unknown>
}): Promise<EmailResult> {
	return renderAndSend(
		AdminCronFailedEmail({ job, errors, details }),
		{
			to: EMAIL_ADMIN,
			subject: `[ALERTE CRON] ${job} — ${errors} erreur(s)`,
			tags: [{ name: "category", value: "admin" }],
		}
	)
}

/**
 * Alerte admin : Echec creation session Stripe Checkout
 * Envoyee quand stripe.checkout.sessions.create() echoue
 * (la commande orpheline est nettoyee automatiquement)
 */
export async function sendAdminCheckoutFailedAlert({
	orderNumber,
	customerEmail,
	total,
	errorMessage,
}: {
	orderNumber: string
	customerEmail: string
	total: number
	errorMessage: string
}): Promise<EmailResult> {
	return renderAndSend(
		AdminCheckoutFailedEmail({
			orderNumber,
			customerEmail,
			total,
			errorMessage,
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[ALERTE CHECKOUT] Échec session Stripe — ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
		}
	)
}

/**
 * Envoie une alerte admin en cas de litige (chargeback) Stripe
 */
export async function sendAdminDisputeAlert({
	orderNumber,
	customerEmail,
	amount,
	reason,
	disputeId,
	deadline,
	dashboardUrl,
	stripeDashboardUrl,
}: {
	orderNumber: string
	customerEmail: string
	amount: number
	reason: string
	disputeId: string
	deadline: string | null
	dashboardUrl: string
	stripeDashboardUrl: string
}): Promise<EmailResult> {
	return renderAndSend(
		AdminDisputeAlertEmail({
			orderNumber,
			customerEmail,
			amount,
			reason,
			disputeId,
			deadline,
			dashboardUrl,
			stripeDashboardUrl,
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[LITIGE] Commande ${orderNumber} — Action requise`,
			tags: [{ name: "category", value: "admin" }],
		}
	)
}

/**
 * Alerte admin : Echec generation facture (Conformite legale)
 *
 * TODO: Invoice generation feature is not yet implemented.
 * This function is preparatory code for when automated invoice
 * generation is added. It will be wired up at that time.
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
	return renderAndSend(
		AdminInvoiceFailedEmail({
			orderNumber,
			customerEmail,
			customerCompanyName,
			customerSiret,
			amount,
			errorMessage,
			stripePaymentIntentId,
			dashboardUrl,
		}),
		{
			to: EMAIL_ADMIN,
			subject: `🚨 ACTION REQUISE : Échec génération facture ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
		}
	)
}
