import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { persistInvoiceNumber } from "./persist-invoice-number.service";

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
				`Failed to persist invoice number for paid order ${orderId} after retries — will fallback to lazy generation`,
				undefined,
				{ service: "ensure-invoice-number" },
			);
			return;
		}

		logger.info(`📑 Invoice number ${result.invoiceNumber} persisted for order ${orderId}`, {
			service: "ensure-invoice-number",
		});
	} catch (error) {
		// Best-effort: invoice generation failure must NOT break the webhook.
		// Lazy fallback in the download route will recover at first request.
		logger.error("ensureInvoiceNumberPersisted threw", error, {
			service: "ensure-invoice-number",
			orderId,
		});
	}
}
