import { EReportingStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { BATCH_DEADLINE_MS } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { INVOICE_FEATURE_FLAGS } from "@/modules/invoices/constants/feature-flags";
import {
	submitEReportingBatchById,
	MAX_RETRY,
} from "@/modules/invoices/services/submit-ereporting-batch.service";

/**
 * Cron loop e-reporting : sélectionne les batches PENDING/RETRYING éligibles,
 * délègue chaque batch au service `submitEReportingBatchById`, agrège le
 * `CronResult` final.
 *
 * Toute la logique métier (mapping status, error handling, backoff, ABANDONED,
 * idempotence) vit dans `modules/invoices/services/submit-ereporting-batch.service.ts`.
 * Ce fichier garde uniquement la sélection candidates, le respect du deadline
 * global, et l'agrégation `processed/errored/skipped`.
 *
 * Cf. EINV-EREPORT-002.
 */

export async function transmitEReportingBatch(): Promise<CronResult> {
	logger.info("Starting e-reporting batch transmission", {
		cronJob: "transmit-ereporting-batch",
	});

	if (!INVOICE_FEATURE_FLAGS.enable_ereporting) {
		logger.info("E-reporting disabled (feature flag OFF), skipping transmission", {
			cronJob: "transmit-ereporting-batch",
		});
		return { processed: 0, errored: 0, skipped: 0, reason: "feature_flag_disabled" };
	}

	const deadline = Date.now() + BATCH_DEADLINE_MS;

	// Sélection éligible : PENDING (retryCount=0) ou RETRYING avec backoff respecté.
	// On charge plus large que nécessaire puis on filtre par updatedAt côté service,
	// le SQL devient illisible avec CASE WHEN sur backoff variable.
	const BATCH_CAP = 50; // hard cap : on évite de bombarder la PA à chaque run

	const candidates = await prisma.eReportingBatch.findMany({
		where: {
			status: { in: [EReportingStatus.PENDING, EReportingStatus.RETRYING] },
			retryCount: { lte: MAX_RETRY },
		},
		select: { id: true },
		orderBy: { periodFrom: "asc" },
		take: BATCH_CAP,
	});

	if (candidates.length === 0) {
		logger.info("No batch to transmit", { cronJob: "transmit-ereporting-batch" });
		return { processed: 0, errored: 0, skipped: 0 };
	}

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	let deadlineHit = false;

	for (const candidate of candidates) {
		if (Date.now() >= deadline) {
			deadlineHit = true;
			logger.warn("Deadline reached, deferring remaining batches", {
				cronJob: "transmit-ereporting-batch",
				processed,
				errored,
				skipped,
				remaining: candidates.length - processed - errored - skipped,
			});
			break;
		}

		const result = await submitEReportingBatchById(candidate.id, { deadline });

		switch (result.status) {
			case "SENT":
			case "ACCEPTED":
				processed++;
				break;
			case "SKIPPED_BACKOFF":
			case "SKIPPED_DRY_RUN":
			case "SKIPPED_EMPTY":
			case "NOT_FOUND":
			case "NOT_ELIGIBLE":
				skipped++;
				break;
			case "SKIPPED_CADENCE_GUARD":
				// EINV-EREPORT-010 (fix FLAG-01) : la garde cadence a refusé une transmission
				// DAILY vers une vraie PA (fail-closed). C'est un SKIP comptabilisé — sans ce
				// case, le batch tombait dans le vide du switch (aucun compteur incrémenté) et
				// `withCronGuard` calculait `remaining` à tort. Le signal d'alerte primaire
				// reste le Sentry warning émis côté submit (isDailyTransmissionBlocked) ; on
				// l'agrège ici en `skipped` pour une comptabilité exacte.
				skipped++;
				break;
			case "RETRYING":
				// EINV-CRON-004 : RETRYING est un état transitoire auto-réparant (backoff
				// puis re-tentative au prochain run). Le compter en `errored` déclenchait
				// une alerte admin (withCronGuard) à chaque blip réseau → fatigue d'alerte.
				// Seuls REJECTED/ABANDONED (action humaine requise) restent `errored`.
				skipped++;
				break;
			case "REJECTED":
			case "ABANDONED":
				errored++;
				break;
			case "SKIPPED_FLAG_OFF":
				// Ne devrait jamais arriver ici (early return en début de cron).
				skipped++;
				break;
			default: {
				// Exhaustivité : si `SubmitBatchStatus` gagne un membre, `tsc` échoue ici
				// (plus de skip silencieux d'un statut non géré). Au runtime, fail-closed
				// en `errored` pour que `withCronGuard` alerte plutôt que d'ignorer.
				const _exhaustive: never = result.status;
				logger.error("Statut de transmission e-reporting non géré", undefined, {
					cronJob: "transmit-ereporting-batch",
					status: String(_exhaustive),
					batchId: candidate.id,
				});
				errored++;
				break;
			}
		}
	}

	logger.info(`Transmission completed`, {
		cronJob: "transmit-ereporting-batch",
		processed,
		errored,
		skipped,
	});

	// hasMore : reprise au prochain run si on a saturé le cap (>50 batches
	// éligibles) ou interrompu sur deadline. Évite un backlog e-reporting DGFiP
	// silencieux entre deux runs. Cf. CRON-AUDIT-002.
	return {
		processed,
		errored,
		skipped,
		hasMore: deadlineHit || candidates.length === BATCH_CAP,
	};
}
