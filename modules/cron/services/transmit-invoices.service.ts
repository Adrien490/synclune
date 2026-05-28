import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getInvoiceProvider } from "@/modules/invoices/providers/factory";
import { shouldTransmitInvoice } from "@/modules/invoices/services/should-transmit-invoice";
import { submitInvoiceById } from "@/modules/invoices/services/submit-invoice-by-id.service";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

/**
 * Cron initial de transmission B2B/B2G (toutes les 30 min).
 *
 * Pousse vers la PDP/PA configurée les factures qui :
 *  - ont un `invoiceNumber` persisté + un `invoicePdfUrl` archivé (artefacts prêts),
 *  - ont `pdpStatus = NULL` (jamais transmises — `persist-pdp-transmission` set
 *    le status au premier passage via `submitInvoiceById`),
 *  - ont `paidAt < now() - 5 min` (grace window pour laisser le webhook eager
 *    finir son boulot ; évite de re-pousser pendant que l'archive est in-flight),
 *  - ont `pdpProviderRef IS NULL` (idempotence — protection ceinture-bretelles
 *    en plus du `pdpStatus` null).
 *
 * Pour chacune, applique le canary `shouldTransmitInvoice` (kill-switch global
 * `INVOICE_ENABLE_PROVIDER_TRANSMISSION` + canary % + min amount) puis délègue
 * à `submitInvoiceById` qui gère capability check, fetch artifacts, deadline,
 * persistPdpTransmission, recordFailure.
 *
 * Complémentaire à `retry-invoice-transmissions` (cron DLQ qui rejoue les
 * REJECTED après backoff). Sans `transmit-invoices`, aucune facture B2B/B2G
 * n'est jamais transmise — `submitInvoiceById` était orphelin.
 *
 * Garanties :
 *  - **Idempotent** : `submitInvoiceById` court-circuite en `ALREADY_SENT` si
 *    `pdpProviderRef` set et `pdpStatus ∈ {SENT, ACCEPTED}` (race-condition safe).
 *  - **Capability-aware** : si le provider courant ne supporte pas la transmission
 *    (LocalPdfProvider par défaut), early return sans toucher la DB.
 *  - **Canary-protected** : kill-switch global OFF par défaut → no-op pour tout.
 *  - **Deadline-aware** : guard `Date.now() > deadline` entre chaque candidat.
 *  - **Best-effort** : exceptions de `submitInvoiceById` (théoriquement
 *    impossibles — il convertit tout en `REJECTED`) sont catch/comptées en
 *    `errored` sans bloquer le batch.
 *
 * Référence : audit Phase 5 EINV-PROVIDER-001 + audit e-invoicing 2026-05-28.
 */

const MIN_AGE_MS = 5 * 60 * 1000; // 5 min grace post-paiement (laisse webhook eager archiver le PDF)

interface TransmitBreakdown {
	transmittedSent: number;
	transmittedRejected: number;
	skippedCanary: number;
	skippedNotEligible: number;
}

export async function transmitInvoices(): Promise<CronResult & TransmitBreakdown> {
	const provider = getInvoiceProvider();

	if (!provider.capabilities.submitInvoice) {
		logger.info("Provider does not support submitInvoice — skipping transmission sweep", {
			cronJob: "transmit-invoices",
			provider: provider.id,
		});
		return {
			processed: 0,
			errored: 0,
			skipped: 0,
			reason: "provider-no-submit-capability",
			transmittedSent: 0,
			transmittedRejected: 0,
			skippedCanary: 0,
			skippedNotEligible: 0,
		};
	}

	const minAge = new Date(Date.now() - MIN_AGE_MS);

	const candidates = await prisma.order.findMany({
		where: {
			pdpStatus: null,
			pdpProviderRef: null,
			invoiceNumber: { not: null },
			invoicePdfUrl: { not: null },
			paidAt: { lt: minAge, not: null },
			...notDeleted,
		},
		select: {
			id: true,
			total: true,
		},
		orderBy: { paidAt: "asc" },
		take: BATCH_SIZE_MEDIUM,
	});

	logger.info("Found invoice transmission candidates", {
		cronJob: "transmit-invoices",
		count: candidates.length,
	});

	const breakdown: TransmitBreakdown = {
		transmittedSent: 0,
		transmittedRejected: 0,
		skippedCanary: 0,
		skippedNotEligible: 0,
	};
	let processed = 0;
	let errored = 0;
	let skipped = 0;

	const deadline = Date.now() + BATCH_DEADLINE_MS;

	for (const candidate of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching cron deadline, stopping batch early", {
				cronJob: "transmit-invoices",
			});
			break;
		}

		if (
			!shouldTransmitInvoice({
				orderId: candidate.id,
				orderTotal: candidate.total,
			})
		) {
			breakdown.skippedCanary++;
			skipped++;
			continue;
		}

		try {
			const result = await submitInvoiceById(candidate.id, { deadline });
			switch (result.status) {
				case "SUBMITTED":
					breakdown.transmittedSent++;
					processed++;
					break;
				case "REJECTED":
					breakdown.transmittedRejected++;
					// REJECTED = transmission tentée, audit posé par persistPdpTransmission,
					// le cron retry-invoice-transmissions reprendra la main → compté en
					// `processed` (le travail du cron est fait).
					processed++;
					break;
				case "ALREADY_SENT":
					// Race ou candidat re-picked entre 2 invocations — pas une erreur.
					breakdown.skippedNotEligible++;
					skipped++;
					break;
				case "ORDER_NOT_FOUND":
				case "NOT_INVOICED":
				case "NO_INVOICE_DATA_SNAPSHOT":
					breakdown.skippedNotEligible++;
					skipped++;
					break;
				case "SKIPPED_CAPABILITY_OFF":
					// Théoriquement inatteignable (déjà filtré ligne 60), mais le compiler
					// l'exige et c'est défense en profondeur si le provider mute en cours.
					skipped++;
					break;
			}
		} catch (e) {
			// submitInvoiceById convertit déjà tout en REJECTED (best-effort).
			// Si on arrive ici, c'est un bug à remonter — on compte sans bloquer.
			errored++;
			logger.error("transmitInvoices: submitInvoiceById threw unexpectedly", e, {
				cronJob: "transmit-invoices",
				orderId: candidate.id,
			});
		}
	}

	logger.info("Invoice transmission sweep completed", {
		cronJob: "transmit-invoices",
		processed,
		errored,
		skipped,
		...breakdown,
	});

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
		...breakdown,
	};
}
