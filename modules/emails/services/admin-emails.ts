import { AdminNewOrderEmail } from "@/emails/admin-new-order-email";
import { AdminAlertEmail } from "@/emails/admin-alert-email";
import { formatEuro } from "@/shared/utils/format-euro";
import { EMAIL_ADMIN } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import { EXTERNAL_URLS, getBaseUrl } from "@/shared/constants/urls";
import type { RefundReason } from "@/app/generated/prisma/client";
import { REFUND_REASON_LABELS as INTERNAL_REFUND_REASON_LABELS } from "@/modules/refunds/constants/refund.constants";
import type { EmailResult, ShippingAddress, OrderItem } from "../types/email.types";

const REFUND_FAILURE_LABELS: Record<"payment_failed" | "payment_canceled" | "other", string> = {
	payment_failed: "Échec du paiement",
	payment_canceled: "Paiement annulé",
	other: "Autre raison",
};

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
	orderNumber: string;
	customerName: string;
	customerEmail: string;
	items: OrderItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	total: number;
	shippingAddress: ShippingAddress & { phone: string };
	dashboardUrl: string;
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
		},
	);
}

/**
 * Envoie une alerte admin en cas d'echec de remboursement automatique
 */
export async function sendAdminRefundFailedAlert({
	orderNumber,
	customerEmail,
	amount,
	reason,
	refundReason,
	errorMessage,
	stripePaymentIntentId,
	dashboardUrl,
}: {
	orderNumber: string;
	customerEmail: string;
	amount: number;
	reason: "payment_failed" | "payment_canceled" | "other";
	refundReason?: RefundReason;
	errorMessage: string;
	stripePaymentIntentId: string;
	dashboardUrl: string;
}): Promise<EmailResult> {
	const stripeDashboardUrl = `https://dashboard.stripe.com/payments/${stripePaymentIntentId}`;
	const contextLines = [
		`Commande   : ${orderNumber}`,
		`Client     : ${customerEmail}`,
		`Montant    : ${formatEuro(amount)}`,
		`Type échec : ${REFUND_FAILURE_LABELS[reason]}`,
	];
	if (refundReason) {
		contextLines.push(`Motif      : ${INTERNAL_REFUND_REASON_LABELS[refundReason]}`);
	}
	contextLines.push(`Payment ID : ${stripePaymentIntentId}`);
	const context = contextLines.join("\n");
	return renderAndSend(
		AdminAlertEmail({
			type: "refund",
			context,
			summary: `Le remboursement automatique a échoué. Type: ${REFUND_FAILURE_LABELS[reason]}. Une intervention manuelle est requise pour rembourser le client ${customerEmail}.`,
			stackTrace: errorMessage,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
			stripeCtaUrl: stripeDashboardUrl,
			stripeCtaLabel: "Ouvrir Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Échec remboursement — ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
		},
	);
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
	eventId: string;
	eventType: string;
	attempts: number;
	error: string;
}): Promise<EmailResult> {
	const stripeDashboardUrl = EXTERNAL_URLS.STRIPE.WEBHOOKS;
	const adminDashboardUrl = `${getBaseUrl()}/admin`;
	const context = [
		`Event ID   : ${eventId}`,
		`Type       : ${eventType}`,
		`Tentatives : ${attempts}`,
	].join("\n");
	return renderAndSend(
		AdminAlertEmail({
			type: "webhook",
			context,
			summary: `Le webhook ${eventType} a échoué ${attempts} fois. Vérifiez le dashboard Stripe pour plus de détails et rejouer si nécessaire.`,
			stackTrace: error,
			ctaUrl: adminDashboardUrl,
			ctaLabel: "Dashboard Admin",
			stripeCtaUrl: stripeDashboardUrl,
			stripeCtaLabel: "Voir dans Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Webhook ${eventType} échoué (${attempts} tentatives)`,
			tags: [{ name: "category", value: "admin" }],
		},
	);
}

/**
 * Alerte admin : Echecs dans un cron job critique
 */
export async function sendAdminCronFailedAlert({
	job,
	errors,
	details,
}: {
	job: string;
	errors: number;
	details: Record<string, unknown>;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin`;
	const context = [`Cron job : ${job}`, `Erreurs  : ${errors}`].join("\n");
	const detailLines = Object.entries(details)
		.map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
		.join("\n");
	return renderAndSend(
		AdminAlertEmail({
			type: "cron",
			context,
			summary: `Le cron ${job} a rencontré ${errors} erreur(s). Vérifiez les logs Vercel pour les détails complets.`,
			stackTrace: detailLines || undefined,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir le dashboard",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Cron ${job} — ${errors} erreur(s)`,
			tags: [{ name: "category", value: "admin" }],
		},
	);
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
	orderNumber: string;
	customerEmail: string;
	total: number;
	errorMessage: string;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin`;
	const context = [
		`Commande : ${orderNumber}`,
		`Client   : ${customerEmail}`,
		`Total    : ${formatEuro(total)}`,
	].join("\n");
	return renderAndSend(
		AdminAlertEmail({
			type: "checkout",
			context,
			summary: `La création de la session Stripe Checkout a échoué pour la commande ${orderNumber}. La commande orpheline sera nettoyée automatiquement. Vérifiez l'état Stripe et la configuration.`,
			stackTrace: errorMessage,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir le dashboard",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Échec checkout Stripe — ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
		},
	);
}

/**
 * Alerte admin : Paiement recu mais traitement de commande echoue
 * Envoyee quand processOrderTransaction ou processOrderFromPaymentIntent echoue
 * apres un paiement reussi — intervention manuelle requise
 */
export async function sendAdminOrderProcessingFailedAlert({
	orderNumber,
	customerEmail,
	total,
	errorMessage,
	paymentIntentId,
}: {
	orderNumber: string;
	customerEmail: string;
	total: number;
	errorMessage: string;
	paymentIntentId: string;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin`;
	const stripeDashboardUrl = `https://dashboard.stripe.com/payments/${paymentIntentId}`;
	const context = [
		`Commande   : ${orderNumber}`,
		`Client     : ${customerEmail}`,
		`Total      : ${formatEuro(total)}`,
		`Payment ID : ${paymentIntentId}`,
	].join("\n");
	return renderAndSend(
		AdminAlertEmail({
			type: "order-processing",
			context,
			summary: `Le paiement a été reçu sur Stripe mais le traitement de la commande ${orderNumber} a échoué. Une intervention manuelle est requise : créer la commande manuellement ou rembourser le client.`,
			stackTrace: errorMessage,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir le dashboard",
			stripeCtaUrl: stripeDashboardUrl,
			stripeCtaLabel: "Voir dans Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[URGENT] Paiement recu — Echec traitement commande ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
		},
	);
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
	orderNumber: string;
	customerEmail: string;
	amount: number;
	reason: string;
	disputeId: string;
	deadline: string | null;
	dashboardUrl: string;
	stripeDashboardUrl: string;
}): Promise<EmailResult> {
	const contextLines = [
		`Commande        : ${orderNumber}`,
		`Client          : ${customerEmail}`,
		`Montant contesté: ${formatEuro(amount)}`,
		`Raison          : ${reason}`,
		`Dispute ID      : ${disputeId}`,
	];
	if (deadline) {
		contextLines.push(`Deadline        : ${deadline}`);
	}
	return renderAndSend(
		AdminAlertEmail({
			type: "dispute",
			context: contextLines.join("\n"),
			summary: `Un client a ouvert un litige (chargeback) sur la commande ${orderNumber}${deadline ? ` — deadline de réponse : ${deadline}` : ""}. Préparez les preuves et répondez via le dashboard Stripe.`,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
			stripeCtaUrl: stripeDashboardUrl,
			stripeCtaLabel: "Répondre au litige",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Litige commande ${orderNumber} — Action requise`,
			tags: [{ name: "category", value: "admin" }],
		},
	);
}

/**
 * Alerte admin : Commandes en attente prolongee (stuck orders)
 *
 * Aggrege en un seul email les commandes PROCESSING > 7j et SHIPPED > 14j
 * sans livraison confirmee. Envoye par le cron `alert-stuck-orders`.
 */
export async function sendAdminStuckOrdersAlert({
	processingOrders,
	shippedOrders,
}: {
	processingOrders: Array<{ orderNumber: string; ageDays: number; total: number; orderId: string }>;
	shippedOrders: Array<{ orderNumber: string; ageDays: number; total: number; orderId: string }>;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin/ventes/commandes`;
	const totalStuck = processingOrders.length + shippedOrders.length;

	const formatLine = (o: { orderNumber: string; ageDays: number; total: number }) =>
		`  • ${o.orderNumber} — ${formatEuro(o.total)} — ${o.ageDays}j`;

	const sections: string[] = [];
	if (processingOrders.length > 0) {
		sections.push(
			`En préparation depuis plus de 7 jours (${processingOrders.length}) :`,
			...processingOrders.map(formatLine),
		);
	}
	if (shippedOrders.length > 0) {
		if (sections.length > 0) sections.push("");
		sections.push(
			`Expédiées sans livraison depuis plus de 14 jours (${shippedOrders.length}) :`,
			...shippedOrders.map(formatLine),
		);
	}
	const context = sections.join("\n");

	return renderAndSend(
		AdminAlertEmail({
			type: "stuck-orders",
			context,
			summary: `${totalStuck} commande(s) nécessitent une vérification. Pour les commandes en préparation, vérifiez l'avancement ou expédiez. Pour les commandes expédiées sans livraison, vérifiez le suivi transporteur ou contactez le client.`,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir les commandes",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] ${totalStuck} commande(s) en attente prolongée`,
			tags: [{ name: "category", value: "admin" }],
		},
	);
}

/**
 * Alerte admin : Echec generation facture (Conformite legale)
 *
 * Preparatory code for automated invoice generation.
 * Will be wired up when the invoice feature is implemented.
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
	orderNumber: string;
	customerEmail: string;
	customerCompanyName?: string;
	customerSiret?: string;
	amount: number;
	errorMessage: string;
	stripePaymentIntentId?: string;
	dashboardUrl: string;
}): Promise<EmailResult> {
	const contextLines = [
		`Commande : ${orderNumber}`,
		`Client   : ${customerEmail}`,
		`Montant  : ${formatEuro(amount)}`,
	];
	if (customerCompanyName) contextLines.push(`Entreprise: ${customerCompanyName}`);
	if (customerSiret) contextLines.push(`SIRET    : ${customerSiret}`);
	if (stripePaymentIntentId) contextLines.push(`Payment ID: ${stripePaymentIntentId}`);
	const stripeCtaUrl = stripePaymentIntentId
		? `https://dashboard.stripe.com/payments/${stripePaymentIntentId}`
		: undefined;
	return renderAndSend(
		AdminAlertEmail({
			type: "invoice",
			context: contextLines.join("\n"),
			summary: `La génération automatique de la facture pour la commande ${orderNumber} a échoué. Conformité légale : générer la facture manuellement et l'envoyer au client.`,
			stackTrace: errorMessage,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
			stripeCtaUrl,
			stripeCtaLabel: "Voir dans Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Échec génération facture — ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
		},
	);
}
