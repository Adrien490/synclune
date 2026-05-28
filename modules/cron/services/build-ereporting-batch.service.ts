import { EReportingStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import { BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

/**
 * Agrège les `EReportingTransaction` PENDING en `EReportingBatch` par jour
 * UTC. Squelette : ce cron CRÉE les batches mais NE TRANSMET PAS — la
 * transmission à la DGFiP via PDP/PA viendra dans un cron séparé
 * `transmit-ereporting-batch` une fois le provider concret implémenté.
 *
 * Stratégie :
 *  1. Pick les transactions PENDING sans batchId, occurredAt strictement
 *     antérieur à aujourd'hui UTC (on n'agrège pas la journée en cours pour
 *     laisser le temps aux mutations de la journée).
 *  2. Group par jour UTC. Pour chaque journée, ouvre une transaction Prisma :
 *     créer un `EReportingBatch` (status=PENDING) + assigner les transactions
 *     + recalculer les agrégats (count, totaux).
 *  3. Renvoie `CronResult` standard. `hasMore: true` si le batch size cap a
 *     été atteint (le prochain run continuera).
 *
 * Idempotent : le filtre `batchId IS NULL` empêche tout double-rattachement.
 * Atomique : chaque journée est une tx Prisma — si l'update batch+transactions
 * échoue, rien n'est persisté.
 *
 * Cf. EINV-AUDIT-004 (Phase 3).
 */
export async function buildEReportingBatch(): Promise<CronResult> {
	logger.info("Starting e-reporting batch aggregation", { cronJob: "build-ereporting-batch" });

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
		},
		orderBy: { occurredAt: "asc" },
		take: BATCH_SIZE_MEDIUM,
	});

	if (candidates.length === 0) {
		logger.info("No pending transactions to aggregate", { cronJob: "build-ereporting-batch" });
		return { processed: 0, errored: 0, skipped: 0 };
	}

	// Group by UTC day. Map key = ISO date string YYYY-MM-DD (UTC).
	const byDay = new Map<string, typeof candidates>();
	for (const tx of candidates) {
		const key = utcDateKey(tx.occurredAt);
		const bucket = byDay.get(key);
		if (bucket) {
			bucket.push(tx);
		} else {
			byDay.set(key, [tx]);
		}
	}

	let processed = 0;
	let errored = 0;
	const createdBatches: string[] = [];

	for (const [day, txs] of byDay) {
		try {
			const dayStart = parseUtcDay(day);
			const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

			const totalAmountIncTax = txs.reduce((sum, t) => sum + t.amountIncTax, 0);
			const totalAmountExclTax = txs.reduce((sum, t) => sum + t.amountExclTax, 0);
			const totalTaxAmount = txs.reduce((sum, t) => sum + t.taxAmount, 0);

			const batch = await prisma.$transaction(
				async (tx) => {
					const created = await tx.eReportingBatch.create({
						data: {
							periodFrom: dayStart,
							periodTo: dayEnd,
							status: EReportingStatus.PENDING,
							transactionCount: txs.length,
							totalAmountIncTax,
							totalAmountExclTax,
							totalTaxAmount,
						},
						select: { id: true },
					});

					// Assigner les transactions au batch. updateMany retourne le
					// count : s'il diffère de txs.length, une transaction a été
					// concurrent-assigned ailleurs (race extrêmement improbable
					// dans ce cron monocaller, mais on log).
					const ids = txs.map((t) => t.id);
					const updated = await tx.eReportingTransaction.updateMany({
						where: { id: { in: ids }, batchId: null },
						data: { batchId: created.id },
					});
					if (updated.count !== txs.length) {
						logger.warn(
							`build-ereporting-batch — assigned ${updated.count}/${txs.length} transactions (concurrent rebatch?)`,
							{ cronJob: "build-ereporting-batch", batchId: created.id, day },
						);
					}

					return created;
				},
				{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
			);

			createdBatches.push(batch.id);
			processed += txs.length;
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
			batchCount: createdBatches.length,
			hasMore: candidates.length === BATCH_SIZE_MEDIUM,
		},
	);

	return {
		processed,
		errored,
		skipped: 0,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
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

function utcDateKey(date: Date): string {
	const y = date.getUTCFullYear().toString().padStart(4, "0");
	const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const d = date.getUTCDate().toString().padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function parseUtcDay(isoDate: string): Date {
	// Parse strict YYYY-MM-DD as UTC midnight (pas de timezone shift).
	return new Date(`${isoDate}T00:00:00.000Z`);
}
