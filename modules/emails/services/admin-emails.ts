import { AdminAlertEmail } from "@/emails/admin-alert-email";
import { formatEuro } from "@/shared/utils/format-euro";
import { EMAIL_ADMIN } from "../constants/email.constants";
import { renderAndSend } from "./send-email";
import { EXTERNAL_URLS, getBaseUrl } from "@/shared/constants/urls";
import type { RefundReason } from "@/app/generated/prisma/client";
import { REFUND_REASON_LABELS as INTERNAL_REFUND_REASON_LABELS } from "@/modules/refunds/constants/refund.constants";
import type { EmailResult } from "../types/email.types";

const REFUND_FAILURE_LABELS: Record<"payment_failed" | "payment_canceled" | "other", string> = {
	payment_failed: "Échec du paiement",
	payment_canceled: "Paiement annulé",
	other: "Autre raison",
};

/**
 * Limite la taille des stack traces injectées dans les emails admin (EMAIL-AUDIT-011).
 * Évite (a) bombes de payload Resend, (b) forward accidentel de détails internes verbeux.
 */
const STACK_TRACE_MAX_CHARS = 2000;
function truncateStackTrace(input?: string): string | undefined {
	if (!input) return undefined;
	if (input.length <= STACK_TRACE_MAX_CHARS) return input;
	return `${input.slice(0, STACK_TRACE_MAX_CHARS)}\n…[tronqué — ${input.length - STACK_TRACE_MAX_CHARS} caractères omis. Voir Sentry pour la stack complète]`;
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
			stackTrace: truncateStackTrace(errorMessage),
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
			stripeCtaUrl: stripeDashboardUrl,
			stripeCtaLabel: "Ouvrir Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Échec remboursement — ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
			// Resend server-side 24h dedup — protège contre N retries Stripe + cron
			// retry-webhooks qui rejoueraient le même handler refund-failed (audit
			// monitoring 2026-05-28 EINV-OPS-009).
			idempotencyKey: `alert:refund-failed:${stripePaymentIntentId}`,
		},
	);
}

/**
 * ORD-STRIPE-006 — alerte admin pour un refund créé via Dashboard Stripe qui
 * nécessite une intervention manuelle (refund partiel sans RefundItem → impossible
 * de connaître les articles remboursés ni de restocker automatiquement).
 */
export async function sendAdminDashboardRefundAttentionAlert({
	orderNumber,
	orderId,
	stripeRefundId,
	amount,
	isFullRefund,
}: {
	orderNumber: string;
	orderId: string;
	stripeRefundId: string;
	amount: number;
	isFullRefund: boolean;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin/ventes/commandes/${orderId}`;
	const stripeDashboardUrl = `https://dashboard.stripe.com/refunds/${stripeRefundId}`;
	const kind = isFullRefund ? "TOTAL" : "PARTIEL";
	const context = [
		`Commande   : ${orderNumber}`,
		`Refund ID  : ${stripeRefundId}`,
		`Type       : ${kind}`,
		`Montant    : ${formatEuro(amount)}`,
	].join("\n");
	const summary = isFullRefund
		? `Refund TOTAL via Dashboard Stripe sans RefundItem. Vérifier si les articles doivent être restockés (intervention admin manuelle requise).`
		: `Refund PARTIEL via Dashboard Stripe SANS RefundItem détaillé. Impossible de déterminer quels articles ont été remboursés ni de restocker. Intervention admin requise pour compléter la traçabilité.`;
	return renderAndSend(
		AdminAlertEmail({
			type: "refund",
			context,
			summary,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
			stripeCtaUrl: stripeDashboardUrl,
			stripeCtaLabel: "Voir le refund Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Refund Dashboard ${kind} — ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
			// Resend 24h dedup : éviter spam si le webhook charge.refunded est rejoué
			idempotencyKey: `alert:dashboard-refund:${stripeRefundId}`,
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
			stackTrace: truncateStackTrace(error),
			ctaUrl: adminDashboardUrl,
			ctaLabel: "Dashboard Admin",
			stripeCtaUrl: stripeDashboardUrl,
			stripeCtaLabel: "Voir dans Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Webhook ${eventType} échoué (${attempts} tentatives)`,
			tags: [{ name: "category", value: "admin" }],
			// Clé stable par eventId (sans `:${attempts}`) : 1 alerte max/24h par
			// webhook défaillant, quelle que soit la cascade de redélivrances Stripe
			// (le compteur dépasse largement le seuil de 3, donc `:${attempts}`
			// générait ~10-15 emails). Le nb de tentatives reste dans le corps du mail
			// + Sentry → aucune perte d'info actionnable (anti-spam, infléchit
			// EINV-OPS-009 en servant mieux son objectif déclaré).
			idempotencyKey: `alert:webhook-failed:${eventId}`,
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
			stackTrace: truncateStackTrace(detailLines || undefined),
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir le dashboard",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Cron ${job} — ${errors} erreur(s)`,
			tags: [{ name: "category", value: "admin" }],
			// Bucket horaire : 1 alerte max/heure/cron. Un cron persistant en échec
			// (ex: retry-post-webhook-tasks toutes les 5 min) sinon spamme l'admin
			// jusqu'à 288 mails/j → désensibilisation. Le bucket borne la fenêtre
			// tout en laissant remonter la persistance heure par heure. Cf. CRON-AUDIT-003.
			idempotencyKey: `alert:cron-failed:${job}:${Math.floor(Date.now() / 3_600_000)}`,
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
			stackTrace: truncateStackTrace(errorMessage),
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir le dashboard",
			stripeCtaUrl: stripeDashboardUrl,
			stripeCtaLabel: "Voir dans Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[URGENT] Paiement recu — Echec traitement commande ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
			// 1 alerte par PI peu importe le nombre de retries Stripe (audit
			// monitoring 2026-05-28 EINV-OPS-009).
			idempotencyKey: `alert:order-processing-failed:${paymentIntentId}`,
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
 * Alerte admin : Echec generation facture (Conformite legale Art. 286/289-I CGI)
 *
 * Declenchee par `ensure-invoice-number.service.ts` quand `persistInvoiceNumber`
 * echoue malgre les 5 retries (advisory lock conflict, P2002 persistant, etc.).
 * Le cron `reconcile-invoices` (daily) prend le relais via `Order.invoiceRetryDeferred`,
 * mais l'admin doit etre prevenu pour suivre l'incident.
 */
export async function sendAdminInvoiceFailedAlert({
	orderId,
	orderNumber,
	customerEmail,
	amount,
	errorMessage,
	stripePaymentIntentId,
	dashboardUrl,
}: {
	orderId?: string;
	orderNumber: string;
	customerEmail: string;
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
	if (stripePaymentIntentId) contextLines.push(`Payment ID: ${stripePaymentIntentId}`);
	const stripeCtaUrl = stripePaymentIntentId
		? `https://dashboard.stripe.com/payments/${stripePaymentIntentId}`
		: undefined;
	// 1 alerte par order (peu importe le nombre de retries cron), cf. audit
	// monitoring 2026-05-28 EINV-OPS-001 / EINV-OPS-009.
	const idempotencyKey = `alert:invoice-failed:${orderId ?? orderNumber}`;
	return renderAndSend(
		AdminAlertEmail({
			type: "invoice",
			context: contextLines.join("\n"),
			summary: `La génération automatique de la facture pour la commande ${orderNumber} a échoué. Conformité légale : générer la facture manuellement et l'envoyer au client. Voir docs/RUNBOOK-INVOICING.md.`,
			stackTrace: truncateStackTrace(errorMessage),
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
			stripeCtaUrl,
			stripeCtaLabel: "Voir dans Stripe",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Échec génération facture — ${orderNumber}`,
			tags: [{ name: "category", value: "admin" }],
			idempotencyKey,
		},
	);
}

/**
 * Alerte admin : Echec archivage PDF facture (Art. L102 B LPF - conservation 10 ans)
 *
 * Declenchee par `archive-invoice-pdf.service.ts` quand UploadThing retourne
 * une erreur ou ne fournit pas d'URL. Le fallback est la regeneration a chaque
 * download — risque de drift template si on touche au layout/SIRET/mentions TVA.
 * Cf. audit monitoring 2026-05-28 EINV-OPS-002.
 */
export async function sendAdminPdfArchiveFailedAlert({
	orderId,
	orderNumber,
	invoiceNumber,
	errorMessage,
}: {
	orderId: string;
	orderNumber: string;
	invoiceNumber: string;
	errorMessage: string;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin/ventes/commandes/${orderId}`;
	const contextLines = [
		`Commande   : ${orderNumber}`,
		`Facture    : ${invoiceNumber}`,
		`Order ID   : ${orderId}`,
	];
	return renderAndSend(
		AdminAlertEmail({
			type: "invoice",
			context: contextLines.join("\n"),
			summary: `L'archivage immuable du PDF facture ${invoiceNumber} sur UploadThing a échoué. La facture est actuellement régénérée à chaque téléchargement — risque de drift template. Vérifier UploadThing puis relancer via le bouton "Relancer" du dashboard /admin/ventes/facturation.`,
			stackTrace: truncateStackTrace(errorMessage),
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Échec archivage PDF facture — ${orderNumber} (${invoiceNumber})`,
			tags: [{ name: "category", value: "admin" }],
			idempotencyKey: `alert:pdf-archive-failed:${orderId}`,
		},
	);
}

/**
 * Alerte admin : Echec archivage PDF avoir (Art. L102 B LPF - conservation 10 ans)
 *
 * Symetrie de `sendAdminPdfArchiveFailedAlert` pour les avoirs (Art. 272-I CGI).
 * Declenchee par `archive-credit-note-pdf.service.ts` quand UploadThing retourne
 * une erreur ou ne fournit pas d'URL. Le fallback est la regeneration a chaque
 * download — risque de drift template. Cf. audit e-invoicing 2026-05-29 (F2).
 */
export async function sendAdminCreditNotePdfArchiveFailedAlert({
	orderId,
	orderNumber,
	creditNoteNumber,
	errorMessage,
}: {
	orderId: string;
	orderNumber: string;
	creditNoteNumber: string;
	errorMessage: string;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin/ventes/commandes/${orderId}`;
	const contextLines = [
		`Commande   : ${orderNumber}`,
		`Avoir      : ${creditNoteNumber}`,
		`Order ID   : ${orderId}`,
	];
	return renderAndSend(
		AdminAlertEmail({
			type: "invoice",
			context: contextLines.join("\n"),
			summary: `L'archivage immuable du PDF avoir ${creditNoteNumber} sur UploadThing a échoué. L'avoir est actuellement régénéré à chaque téléchargement — risque de drift template. Vérifier UploadThing puis relancer un téléchargement de l'avoir.`,
			stackTrace: truncateStackTrace(errorMessage),
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Échec archivage PDF avoir — ${orderNumber} (${creditNoteNumber})`,
			tags: [{ name: "category", value: "admin" }],
			idempotencyKey: `alert:credit-note-archive-failed:${orderId}`,
		},
	);
}

/**
 * Alerte admin : Echec emission avoir post-refund (Art. 272-I CGI)
 *
 * Declenchee par `void-invoice.service.ts` quand l'emission d'avoir
 * (`A-YYYY-NNNNN`) echoue apres 5 retries. Le refund est traite (paymentStatus
 * = REFUNDED) mais la facture reste GENERATED + creditNoteNumber NULL — etat
 * comptable incoherent. Le cron `reconcile-invoices` (passe 3) rejouera, mais
 * l'admin doit valider l'incident.
 * Cf. audit monitoring 2026-05-28 EINV-OPS-003.
 */
export async function sendAdminCreditNoteFailedAlert({
	orderId,
	orderNumber,
	invoiceNumber,
	errorMessage,
}: {
	orderId: string;
	orderNumber: string;
	invoiceNumber: string;
	errorMessage: string;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin/ventes/commandes/${orderId}`;
	const contextLines = [
		`Commande   : ${orderNumber}`,
		`Facture    : ${invoiceNumber}`,
		`Order ID   : ${orderId}`,
	];
	return renderAndSend(
		AdminAlertEmail({
			type: "invoice",
			context: contextLines.join("\n"),
			summary: `L'émission de l'avoir post-remboursement pour la facture ${invoiceNumber} a échoué. État comptable incohérent : facture émise + remboursement enregistré + pas d'avoir. Le cron reconcile-invoices rejouera dans la nuit. Voir docs/RUNBOOK-INVOICING.md.`,
			stackTrace: truncateStackTrace(errorMessage),
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir la commande",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] Échec émission avoir — ${orderNumber} (${invoiceNumber})`,
			tags: [{ name: "category", value: "admin" }],
			idempotencyKey: `alert:credit-note-failed:${orderId}`,
		},
	);
}

/**
 * Alerte admin URGENT : Saturation sequence facture/avoir (Art. 286 CGI)
 *
 * Declenchee quand le compteur sequentiel annuel atteint 99 999 (limite CHECK
 * DB). Au-dela, aucune nouvelle facture/avoir n'est emise. Etendre la regex
 * DB (`{5,6}`) requiert un deploiement — a faire AVANT que ca casse en prod.
 * Cf. audit monitoring 2026-05-28 EINV-OPS-005.
 */
export async function sendAdminSequenceOverflowAlert({
	year,
	documentType,
}: {
	year: number;
	documentType: "invoice" | "credit-note";
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin/ventes/facturation`;
	const label = documentType === "invoice" ? "facture" : "avoir";
	return renderAndSend(
		AdminAlertEmail({
			type: "invoice",
			context: [`Type    : ${label}`, `Année   : ${year}`, `Limite  : 99 999`].join("\n"),
			summary: `La séquence ${label} a atteint sa limite annuelle de 99 999. Toute nouvelle émission est bloquée. Action requise : étendre la CHECK regex DB à 6 chiffres puis déployer. Voir docs/RUNBOOK-INVOICING.md § Sequence Overflow.`,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir le dashboard",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[URGENT] Saturation séquence ${label} ${year} — émission bloquée`,
			tags: [{ name: "category", value: "admin" }],
			idempotencyKey: `alert:sequence-overflow:${documentType}:${year}`,
		},
	);
}

/**
 * Alerte admin : E-reporting batches stuck PENDING/RETRYING > 48h
 *
 * Declenchee par le cron `alert-stuck-orders` (hebdo) si des batches n'ont pas
 * ete transmis. A l'approche de la reforme (1er sept 2027 emission B2B/B2G),
 * un blocage de transmission DGFiP/PDP doit etre escalade rapidement.
 * Cf. audit monitoring 2026-05-28 EINV-OPS-010.
 */
export async function sendAdminEReportingStuckAlert({
	stuckBatches,
}: {
	stuckBatches: Array<{ id: string; status: string; ageHours: number }>;
}): Promise<EmailResult> {
	const dashboardUrl = `${getBaseUrl()}/admin/ventes/facturation`;
	const lines = stuckBatches.map((b) => `  • ${b.id} — ${b.status} — ${b.ageHours}h`);
	const oldest = stuckBatches.reduce((max, b) => (b.ageHours > max ? b.ageHours : max), 0);
	return renderAndSend(
		AdminAlertEmail({
			type: "invoice",
			context: [
				`Batches bloqués : ${stuckBatches.length}`,
				`Plus ancien     : ${oldest}h`,
				"",
				...lines,
			].join("\n"),
			summary: `${stuckBatches.length} batch(es) e-reporting bloqués depuis plus de 48h (status PENDING/RETRYING). Vérifier la configuration provider PDP / Chorus Pro et débloquer via le dashboard. Voir docs/RUNBOOK-INVOICING.md.`,
			ctaUrl: dashboardUrl,
			ctaLabel: "Voir les batches",
		}),
		{
			to: EMAIL_ADMIN,
			subject: `[Admin] ${stuckBatches.length} batch(es) e-reporting bloqué(s) > 48h`,
			tags: [{ name: "category", value: "admin" }],
			// 1 alerte par "cohorte" hebdo : si le hash des IDs change, c'est une
			// nouvelle situation a signaler.
			// EMAIL-AUDIT-105 : tri des IDs avant jointure — sinon une même cohorte
			// retournée dans un ordre différent produit une clé différente ⇒ alerte
			// dupliquée pour la même situation.
			idempotencyKey: `alert:ereporting-stuck:${[...stuckBatches.map((b) => b.id)].sort().join(",")}`,
		},
	);
}
