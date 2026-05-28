import { PdpTransmissionStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getInvoiceProvider } from "@/modules/invoices/providers/factory";
import { persistPdpTransmission } from "@/modules/orders/services/persist-pdp-transmission.service";
import { withDeadline } from "@/modules/invoices/services/submit-ereporting-batch.service";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

/**
 * Filet anti perte de webhook : si un événement ACCEPTED/REJECTED n'arrive pas
 * (panne PDP, problème réseau, bug downstream), le polling fallback récupère
 * le statut courant via `provider.getInvoiceStatus(providerInvoiceId)`.
 *
 * Sélectionne les factures `pdpStatus = SENT` transmises il y a plus de
 * `STALE_THRESHOLD_MS` sans ACK.
 *
 * Réutilise `persistPdpTransmission` → idempotence + audit trail garantis.
 * Référence : audit Phase 5 (cron mentionné dans le plan ExitPlanMode).
 */
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function reconcileInvoiceStatuses(): Promise<CronResult> {
	logger.info("Starting invoice status reconciliation", {
		cronJob: "reconcile-invoice-statuses",
	});

	const provider = getInvoiceProvider();
	if (!provider.capabilities.submitInvoice) {
		return {
			processed: 0,
			errored: 0,
			skipped: 0,
			reason: "provider-no-submit-capability",
		};
	}

	const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
	const candidates = await prisma.order.findMany({
		where: {
			pdpStatus: PdpTransmissionStatus.SENT,
			pdpTransmittedAt: { lt: cutoff },
			pdpProviderRef: { not: null },
		},
		select: {
			id: true,
			pdpProviderRef: true,
		},
		orderBy: { pdpTransmittedAt: "asc" },
		take: BATCH_SIZE_MEDIUM,
	});

	if (candidates.length === 0) {
		return { processed: 0, errored: 0, skipped: 0 };
	}

	// Garde deadline : le polling provider peut hang (PDP lent). On race chaque
	// appel contre le deadline global et on s'arrête net avant le SIGTERM Vercel
	// 60s, en signalant hasMore pour reprise au run suivant. Cf. CRON-AUDIT-001.
	const deadline = Date.now() + BATCH_DEADLINE_MS;

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	let deadlineHit = false;

	for (const candidate of candidates) {
		if (Date.now() >= deadline) {
			deadlineHit = true;
			logger.warn("Deadline reached, deferring remaining invoices", {
				cronJob: "reconcile-invoice-statuses",
				processed,
				errored,
				skipped,
				remaining: candidates.length - processed - errored - skipped,
			});
			break;
		}
		if (!candidate.pdpProviderRef) {
			skipped++;
			continue;
		}
		try {
			const snapshot = await withDeadline(
				provider.getInvoiceStatus(candidate.pdpProviderRef),
				deadline,
				`reconcile-invoice-statuses:getInvoiceStatus:${candidate.id}`,
			);
			if (snapshot.status === "SUBMITTED" || snapshot.status === "PENDING_SUBMISSION") {
				skipped++;
				continue;
			}

			await persistPdpTransmission({
				orderId: candidate.id,
				providerName: provider.id,
				result: {
					providerInvoiceId: candidate.pdpProviderRef,
					status: snapshot.status,
					submittedAt: snapshot.receivedAt ?? new Date(),
				},
				errorMessage: snapshot.rejectionReason ?? null,
			});

			processed++;
		} catch (error) {
			errored++;
			logger.error(`Reconcile failed for order ${candidate.id}`, error, {
				cronJob: "reconcile-invoice-statuses",
				orderId: candidate.id,
				providerInvoiceId: candidate.pdpProviderRef,
			});
		}
	}

	return {
		processed,
		errored,
		skipped,
		hasMore: deadlineHit || candidates.length === BATCH_SIZE_MEDIUM,
	};
}
