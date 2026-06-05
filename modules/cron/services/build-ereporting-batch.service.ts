import { EReportingStatus, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import {
	EREPORTING_BUILD_CANDIDATE_CAP,
	MAX_BATCH_TRANSACTIONS,
} from "@/modules/cron/constants/limits";
import { computeEReportingPeriod } from "@/modules/invoices/constants/ereporting-period";
import {
	mergeVatBreakdowns,
	parseVatBreakdown,
} from "@/modules/invoices/services/build-ereporting-transaction";
import type { CronResult } from "@/modules/cron/lib/cron-result";

/**
 * Agrège les `EReportingTransaction` PENDING en `EReportingBatch` par PÉRIODE
 * (`EREPORTING_PERIOD_LENGTH`, défaut DAILY = jour UTC). Squelette : ce cron CRÉE
 * les batches mais NE TRANSMET PAS — la transmission à la DGFiP via PDP/PA viendra
 * dans un cron séparé `transmit-ereporting-batch` une fois le provider concret
 * implémenté.
 *
 * Stratégie :
 *  1. Pick les transactions PENDING sans batchId, occurredAt strictement
 *     antérieur à aujourd'hui UTC (on n'agrège pas la journée en cours pour
 *     laisser le temps aux mutations de la journée).
 *  2. Group par période calculée (`computeEReportingPeriod`). Une période encore
 *     OUVERTE (periodTo > now) est DÉFÉRÉE — on n'émet pas de batch partiel
 *     prématuré (sans effet sous DAILY, où les lignes tirées ont toujours une
 *     période déjà close). Pour chaque période close, ouvre une transaction
 *     Prisma : upsert `EReportingPeriod` + créer `EReportingBatch` (status=PENDING)
 *     + assigner les transactions + recalculer les agrégats (count, totaux).
 *  3. Renvoie `CronResult` standard. `hasMore: true` si le batch size cap a
 *     été atteint (le prochain run continuera).
 *
 * Idempotent : le filtre `batchId IS NULL` empêche tout double-rattachement.
 * Atomique : chaque période est une tx Prisma — si l'update batch+transactions
 * échoue, rien n'est persisté.
 *
 * Le non-recouvrement des périodes est garanti par l'exclusion constraint
 * `EReportingPeriod_no_overlap` ; l'absence de trou par CE build (qui crée la
 * période contiguë de toute période ayant des transactions) + le contrôle de
 * continuité orphelins (`check-ereporting-period-continuity.service.ts`).
 *
 * Cf. EINV-AUDIT-004 (Phase 3), EINV-EREPORT-006/008.
 */
export async function buildEReportingBatch(): Promise<CronResult> {
	logger.info("Starting e-reporting batch aggregation", { cronJob: "build-ereporting-batch" });

	const now = Date.now();
	// Borne supérieure : minuit UTC aujourd'hui — on n'agrège pas la journée en
	// cours pour laisser les transactions du jour finir de se créer.
	const todayUtcStart = startOfUtcDay(new Date());

	const candidates = await prisma.eReportingTransaction.findMany({
		where: {
			batchId: null,
			status: EReportingStatus.PENDING,
			occurredAt: { lt: todayUtcStart },
		},
		select: {
			id: true,
			occurredAt: true,
			amountIncTax: true,
			amountExclTax: true,
			taxAmount: true,
			vatBreakdown: true,
		},
		orderBy: { occurredAt: "asc" },
		// ≥ MAX_BATCH_TRANSACTIONS : permet au cap-split (EINV-EREPORT-005) de se
		// déclencher dans un seul run plutôt que de fragmenter une période en
		// micro-batches sur plusieurs runs. Cf. audit P2-1.
		take: EREPORTING_BUILD_CANDIDATE_CAP,
	});

	if (candidates.length === 0) {
		logger.info("No pending transactions to aggregate", { cronJob: "build-ereporting-batch" });
		return { processed: 0, errored: 0, skipped: 0 };
	}

	// Group by PÉRIODE calculée (EREPORTING_PERIOD_LENGTH). Clé = periodFrom ISO.
	// C'est l'unité réglementaire de non-recouvrement portée par EReportingPeriod
	// (exclusion constraint Postgres). Les éventuels splits de la même période la
	// partagent.
	const byPeriod = new Map<string, { periodFrom: Date; periodTo: Date; txs: typeof candidates }>();
	for (const tx of candidates) {
		const { periodFrom, periodTo } = computeEReportingPeriod(tx.occurredAt);
		const key = periodFrom.toISOString();
		const bucket = byPeriod.get(key);
		if (bucket) {
			bucket.txs.push(tx);
		} else {
			byPeriod.set(key, { periodFrom, periodTo, txs: [tx] });
		}
	}

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	const createdBatches: string[] = [];

	for (const [key, { periodFrom: dayStart, periodTo: dayEnd, txs }] of byPeriod) {
		// Période encore ouverte → on diffère (pas de batch partiel prématuré).
		// Sous DAILY ce garde est toujours faux pour les lignes tirées
		// (occurredAt < minuit UTC ⇒ periodTo ≤ minuit UTC ≤ now).
		if (dayEnd.getTime() > now) {
			skipped += txs.length;
			continue;
		}
		const day = key;
		try {
			// Split par cap MAX_BATCH_TRANSACTIONS — un Black Friday à 5000 tx
			// dépasse la limite PA typique (1000-5000/batch). Chaque chunk devient
			// un EReportingBatch indépendant pour la même journée (EINV-EREPORT-005).
			const chunks: (typeof txs)[] = [];
			for (let i = 0; i < txs.length; i += MAX_BATCH_TRANSACTIONS) {
				chunks.push(txs.slice(i, i + MAX_BATCH_TRANSACTIONS));
			}

			for (const chunk of chunks) {
				const totalAmountIncTax = chunk.reduce((sum, t) => sum + t.amountIncTax, 0);
				const totalAmountExclTax = chunk.reduce((sum, t) => sum + t.amountExclTax, 0);
				const totalTaxAmount = chunk.reduce((sum, t) => sum + t.taxAmount, 0);
				// Ventilation TVA agrégée par taux (DORMANT) : null en franchise
				// (toutes les transactions ont vatBreakdown null) → DbNull en DB.
				const mergedVatBreakdown = mergeVatBreakdowns(
					chunk.map((t) => parseVatBreakdown(t.vatBreakdown)),
				);

				const batch = await prisma.$transaction(
					async (tx) => {
						// Unité réglementaire de non-recouvrement : 1 ligne EReportingPeriod
						// par période (idempotent via periodFrom @unique). Les splits de la
						// même période la réutilisent — l'exclusion constraint
						// `EReportingPeriod_no_overlap` n'est testée qu'au create initial.
						const period = await tx.eReportingPeriod.upsert({
							where: { periodFrom: dayStart },
							create: { periodFrom: dayStart, periodTo: dayEnd },
							update: {},
							select: { id: true },
						});

						const created = await tx.eReportingBatch.create({
							data: {
								periodId: period.id,
								periodFrom: dayStart,
								periodTo: dayEnd,
								status: EReportingStatus.PENDING,
								transactionCount: chunk.length,
								totalAmountIncTax,
								totalAmountExclTax,
								totalTaxAmount,
								vatBreakdown: mergedVatBreakdown ?? Prisma.DbNull,
							},
							select: { id: true },
						});

						// Assigner les transactions au batch. updateMany retourne le
						// count : s'il diffère de chunk.length, une transaction a été
						// concurrent-assigned ailleurs (race extrêmement improbable
						// dans ce cron monocaller, mais on log).
						const ids = chunk.map((t) => t.id);
						const updated = await tx.eReportingTransaction.updateMany({
							where: { id: { in: ids }, batchId: null },
							data: { batchId: created.id },
						});
						if (updated.count !== chunk.length) {
							logger.warn(
								`build-ereporting-batch — assigned ${updated.count}/${chunk.length} transactions (concurrent rebatch?)`,
								{ cronJob: "build-ereporting-batch", batchId: created.id, day },
							);
						}

						return created;
					},
					{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
				);

				createdBatches.push(batch.id);
				processed += chunk.length;
			}

			if (chunks.length > 1) {
				logger.info(
					`build-ereporting-batch — day ${day} split into ${chunks.length} batches (${txs.length} tx, cap ${MAX_BATCH_TRANSACTIONS})`,
					{ cronJob: "build-ereporting-batch", day, chunkCount: chunks.length },
				);
			}
		} catch (e) {
			errored += txs.length;
			logger.error(`build-ereporting-batch — failed to aggregate day ${day}`, e, {
				cronJob: "build-ereporting-batch",
				day,
				transactionCount: txs.length,
			});
		}
	}

	logger.info(
		`build-ereporting-batch — aggregated ${processed} transactions into ${createdBatches.length} batches`,
		{
			cronJob: "build-ereporting-batch",
			processed,
			errored,
			skipped,
			batchCount: createdBatches.length,
			hasMore: candidates.length === EREPORTING_BUILD_CANDIDATE_CAP,
		},
	);

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === EREPORTING_BUILD_CANDIDATE_CAP,
		batchCount: createdBatches.length,
	};
}

// ============================================================================
// Date helpers (UTC day boundaries)
// ============================================================================

function startOfUtcDay(date: Date): Date {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	return d;
}
