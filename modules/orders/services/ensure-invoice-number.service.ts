import { HistorySource, OrderAction } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { sendAdminInvoiceFailedAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl } from "@/shared/constants/urls";
import { GET_ORDER_SELECT_ADMIN } from "../constants/order.constants";
import { archiveInvoicePdf } from "./archive-invoice-pdf.service";
import { persistInvoiceNumber } from "./persist-invoice-number.service";
import { buildInvoiceData } from "@/modules/invoices/services/build-invoice-data";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import { createOrderAudit } from "../utils/order-audit";
import type { GetOrderReturn } from "../types/order.types";

/**
 * Marque la commande comme "à reconcilier" + crée une entrée audit immuable +
 * envoie une alerte admin avec idempotency key. Best-effort sur chaque étape :
 * aucune ne doit casser le webhook caller. Cf. audit monitoring 2026-05-28
 * EINV-OPS-001 / EINV-OPS-004 / EINV-OPS-008.
 */
async function flagInvoiceFailureForReconcile(
	orderId: string,
	errorMessage: string,
): Promise<void> {
	try {
		const order = await prisma.order.update({
			where: { id: orderId },
			data: { invoiceRetryDeferred: true },
			select: {
				orderNumber: true,
				customerEmail: true,
				customerCompanyName: true,
				customerCompanySiret: true,
				total: true,
				stripePaymentIntentId: true,
			},
		});

		await createOrderAudit({
			orderId,
			action: OrderAction.INVOICE_GENERATION_FAILED,
			source: HistorySource.SYSTEM,
			authorName: "Système (ensure-invoice-number)",
			note: `Génération facture échouée — flag invoiceRetryDeferred posé (cron reconcile-invoices rejouera)`,
			metadata: {
				errorMessage: errorMessage.slice(0, 500),
				deferredAt: new Date().toISOString(),
			},
		});

		await sendAdminInvoiceFailedAlert({
			orderId,
			orderNumber: order.orderNumber,
			customerEmail: order.customerEmail,
			customerCompanyName: order.customerCompanyName ?? undefined,
			customerSiret: order.customerCompanySiret ?? undefined,
			amount: order.total,
			errorMessage,
			stripePaymentIntentId: order.stripePaymentIntentId ?? undefined,
			dashboardUrl: `${getBaseUrl()}/admin/ventes/commandes/${orderId}`,
		});
	} catch (sideEffectError) {
		logger.error("flagInvoiceFailureForReconcile threw — alert/audit partial", sideEffectError, {
			service: "ensure-invoice-number",
			orderId,
		});
	}
}

/**
 * Best-effort eager generation of the invoice number for a PAID order.
 *
 * Conformité Art. 289-I CGI : la facture doit être émise dès la réalisation
 * de la livraison/prestation (= encaissement en VPC). Appelé depuis les
 * webhooks Stripe juste après le passage en `paymentStatus = PAID`, donc
 * en dehors de la transaction principale (les locks Postgres advisory de
 * `persistInvoiceNumber` ne supportent pas l'imbrication).
 *
 * Idempotent : noop si `invoiceNumber` est déjà défini. Cf. lazy fallback
 * dans `/api/orders/[orderNumber]/invoice/route.ts` au cas où cet appel
 * échoue (Sentry trackera l'erreur sans bloquer le webhook).
 *
 * Étape supplémentaire (EINV-PDF-003 audit 2026-05-28) : le PDF est aussi
 * archivé immédiatement sur UploadThing après attribution du numéro.
 * Évite les factures qui n'ont jamais été téléchargées et donc jamais
 * archivées — leur premier rendu utiliserait le template courant au lieu
 * du template à la date d'émission (Art. L102 B LPF violation).
 *
 * Cf. audit conformité 2026-05-27 — ORD-COMPLY-002
 */
export async function ensureInvoiceNumberPersisted(orderId: string): Promise<void> {
	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { invoiceNumber: true, userId: true, paymentStatus: true },
		});

		if (!order) {
			logger.warn(`Cannot ensure invoice number — order not found: ${orderId}`, {
				service: "ensure-invoice-number",
			});
			return;
		}

		if (order.invoiceNumber) {
			// Numéro déjà attribué. On tente quand même d'archiver le PDF si
			// l'archive est manquante (auto-rattrapage best-effort des factures
			// historiques pré-2026-05-28 où l'archive lazy n'a jamais été déclenchée).
			await archiveIfMissing(orderId);
			return;
		}

		if (order.paymentStatus !== "PAID") {
			logger.warn(
				`Skipping invoice generation — order ${orderId} not PAID (status: ${order.paymentStatus})`,
				{ service: "ensure-invoice-number" },
			);
			return;
		}

		const result = await persistInvoiceNumber(orderId, order.userId);
		if (!result) {
			logger.error(
				`Failed to persist invoice number for paid order ${orderId} after retries — flagging for cron reconcile-invoices`,
				undefined,
				{ service: "ensure-invoice-number", orderId },
			);
			await flagInvoiceFailureForReconcile(
				orderId,
				"persistInvoiceNumber returned null after 5 retries",
			);
			return;
		}

		logger.info(`📑 Invoice number ${result.invoiceNumber} persisted for order ${orderId}`, {
			service: "ensure-invoice-number",
			orderId,
			invoiceNumber: result.invoiceNumber,
		});

		// Eager archive : génère + upload UploadThing immédiatement.
		// L'archive doit refléter le template/SDK courant au moment de l'émission,
		// pas celui d'un futur déploiement (cf EINV-PDF-003).
		await archiveAfterGeneration(orderId, result.invoiceNumber);
	} catch (error) {
		// Best-effort: invoice generation failure must NOT break the webhook.
		// Filet de sécurité = flag invoiceRetryDeferred + alerte admin + cron daily.
		logger.error("ensureInvoiceNumberPersisted threw", error, {
			service: "ensure-invoice-number",
			orderId,
		});
		const errorMessage = error instanceof Error ? error.message : String(error);
		await flagInvoiceFailureForReconcile(orderId, errorMessage);
	}
}

/**
 * Archive eager le PDF après attribution du numéro. Wrap try/catch interne
 * pour ne JAMAIS faire échouer le webhook : si UploadThing est down, le PDF
 * sera ré-archivé au prochain téléchargement (lazy fallback dans la route).
 */
async function archiveAfterGeneration(orderId: string, invoiceNumber: string): Promise<void> {
	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: GET_ORDER_SELECT_ADMIN,
		});
		if (!order || !order.invoiceNumber || !order.invoiceGeneratedAt) {
			return;
		}
		const pdf = renderInvoicePdf(buildInvoiceData(order as GetOrderReturn));
		await archiveInvoicePdf(orderId, invoiceNumber, pdf);
	} catch (error) {
		// Archive échoue → le PDF sera archivé au premier download. Pas d'incident
		// fonctionnel (le téléchargement régénère + tente l'archive en best-effort).
		logger.warn("Eager invoice archive failed — will retry on first download", {
			service: "ensure-invoice-number",
			orderId,
			invoiceNumber,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

async function archiveIfMissing(orderId: string): Promise<void> {
	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { invoicePdfUrl: true, invoiceNumber: true },
		});
		if (!order || order.invoicePdfUrl || !order.invoiceNumber) return;
		await archiveAfterGeneration(orderId, order.invoiceNumber);
	} catch {
		// Idempotent best-effort, jamais bloquant.
	}
}
