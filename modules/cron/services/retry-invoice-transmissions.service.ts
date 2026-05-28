import { PdpTransmissionStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getInvoiceProvider } from "@/modules/invoices/providers/factory";
import { buildInvoiceData } from "@/modules/invoices/services/build-invoice-data";
import { persistPdpTransmission } from "@/modules/orders/services/persist-pdp-transmission.service";
import { shouldTransmitInvoice } from "@/modules/invoices/services/should-transmit-invoice";
import { BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import { GET_ORDER_SELECT_ADMIN } from "@/modules/orders/constants/order.constants";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

/**
 * Max retries avant ABANDONED + alerte admin.
 * Aligné avec MAX_WEBHOOK_RETRY_ATTEMPTS pour cohérence opérationnelle.
 */
const MAX_TRANSMISSION_RETRY = 5;

/**
 * Backoff exponentiel : 15min → 30min → 1h → 2h → 4h (capped).
 * Calcul : `min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2^retryCount)`.
 */
const BASE_BACKOFF_MS = 15 * 60 * 1000;
const MAX_BACKOFF_MS = 4 * 60 * 60 * 1000;

/**
 * Codes d'erreur considérés "récupérables" (retry automatique).
 * Codes non récupérables → ABANDONED direct + alerte admin (SIRET inconnu,
 * format invalide non corrigeable, etc.).
 */
const RETRYABLE_ERROR_CODES = new Set([
	"TIMEOUT",
	"NETWORK_ERROR",
	"PROVIDER_5XX",
	"RATE_LIMITED",
	"TEMPORARY_UNAVAILABLE",
]);

function isRetryableError(errorCode: string | null): boolean {
	if (!errorCode) return true; // Pas de code = best-effort retry (sera abandonné après MAX)
	return RETRYABLE_ERROR_CODES.has(errorCode);
}

function computeBackoffMs(retryCount: number): number {
	return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, retryCount));
}

/**
 * DLQ cron retry-invoice-transmissions (toutes les 15 minutes).
 *
 * Sélectionne les factures REJECTED avec retryCount < MAX et backoff respecté,
 * filtrées par code récupérable. Les non récupérables ou retries épuisés sont
 * marquées ABANDONED + alerte admin.
 *
 * Réutilise `persistPdpTransmission` pour idempotence + audit trail.
 * Référence : audit Phase 5 EINV-PROVIDER-005.
 */
export async function retryInvoiceTransmissions(): Promise<CronResult> {
	logger.info("Starting invoice transmission retry sweep", {
		cronJob: "retry-invoice-transmissions",
	});

	const provider = getInvoiceProvider();
	if (!provider.capabilities.submitInvoice) {
		logger.info("Provider does not support submitInvoice — skipping retry sweep", {
			cronJob: "retry-invoice-transmissions",
			provider: provider.id,
		});
		return { processed: 0, errored: 0, skipped: 0, reason: "provider-no-submit-capability" };
	}

	const now = new Date();
	const candidates = await prisma.order.findMany({
		where: {
			pdpStatus: PdpTransmissionStatus.REJECTED,
			pdpRetryCount: { lt: MAX_TRANSMISSION_RETRY },
		},
		select: {
			id: true,
			pdpRetryCount: true,
			pdpLastRetryAt: true,
			pdpRejectionCode: true,
			total: true,
		},
		orderBy: { pdpLastRetryAt: "asc" },
		take: BATCH_SIZE_MEDIUM,
	});

	if (candidates.length === 0) {
		return { processed: 0, errored: 0, skipped: 0 };
	}

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	let abandoned = 0;

	for (const candidate of candidates) {
		const retryCount = candidate.pdpRetryCount;
		const lastRetry = candidate.pdpLastRetryAt ?? null;
		const backoffMs = computeBackoffMs(retryCount);

		if (lastRetry && now.getTime() - lastRetry.getTime() < backoffMs) {
			skipped++;
			continue;
		}

		// Codes non récupérables → ABANDONED immédiat (pas d'I/O réseau)
		if (!isRetryableError(candidate.pdpRejectionCode)) {
			await markAbandoned(
				candidate.id,
				`Rejection code "${candidate.pdpRejectionCode}" is not retryable`,
			);
			abandoned++;
			continue;
		}

		// Canary kill-switch protégé
		if (
			!shouldTransmitInvoice({
				orderId: candidate.id,
				orderTotal: candidate.total,
			})
		) {
			skipped++;
			continue;
		}

		try {
			const order = await prisma.order.findUnique({
				where: { id: candidate.id },
				select: GET_ORDER_SELECT_ADMIN,
			});
			if (!order || !order.invoiceNumber) {
				skipped++;
				continue;
			}

			const invoiceData = buildInvoiceData(order as GetOrderReturn);
			const result = await provider.submitInvoice({
				invoiceData,
				pdfBuffer: null,
				xmlBuffer: null,
			});

			await persistPdpTransmission({
				orderId: candidate.id,
				providerName: provider.id,
				result,
			});

			processed++;
		} catch (error) {
			errored++;
			logger.error(`Retry transmission failed for order ${candidate.id}`, error, {
				cronJob: "retry-invoice-transmissions",
				orderId: candidate.id,
				retryCount,
			});

			// Si on est au dernier retry possible, marquer ABANDONED.
			if (retryCount + 1 >= MAX_TRANSMISSION_RETRY) {
				await markAbandoned(
					candidate.id,
					`Max retry reached (${MAX_TRANSMISSION_RETRY}) — last error: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
				abandoned++;
			}
		}
	}

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
		abandoned,
	};
}

/**
 * Marque une facture ABANDONED — la transmission ne sera plus retry par le cron.
 * L'admin doit intervenir manuellement (corriger le payload, contacter la PDP,
 * basculer en émission papier de secours).
 */
async function markAbandoned(orderId: string, reason: string): Promise<void> {
	await prisma.order.update({
		where: { id: orderId },
		data: {
			pdpStatus: PdpTransmissionStatus.ABANDONED,
			pdpRejectionReason: reason,
		},
	});
	logger.warn(`Invoice transmission ABANDONED for order ${orderId}: ${reason}`, {
		cronJob: "retry-invoice-transmissions",
		orderId,
	});
}
