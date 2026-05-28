import * as Sentry from "@sentry/nextjs";
import { EReportingStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getInvoiceProvider } from "@/modules/invoices/providers/factory";
import { INVOICE_FEATURE_FLAGS } from "@/modules/invoices/constants/feature-flags";

/**
 * Pousse un `EReportingBatch` individuel vers la Plateforme Agréée (PA)
 * configurée via `INVOICE_PROVIDER`. Service extrait du cron
 * `transmitEReportingBatch` pour permettre :
 *  - le replay ad-hoc d'un batch précis (debug admin / RUN ops),
 *  - des tests unitaires granulaires par branche (backoff, error mapping, ABANDONED),
 *  - la réutilisation depuis d'autres orchestrateurs (Server Action admin future).
 *
 * Transitions de statut :
 *  - succès SENT/ACCEPTED → batch updated + transactions enfants propagées
 *  - succès REJECTED synchrone → batch REJECTED + rejectionReason (1000 chars max)
 *  - dry-run PENDING (LocalPdfProvider stub) → no-op, `SKIPPED_DRY_RUN`
 *  - business error (4xx) → REJECTED + rejectionReason (no retry, admin fix)
 *  - network/unknown error → RETRYING + retryCount++ ou ABANDONED si > MAX_RETRY
 *
 * Garanties :
 *  - **Idempotent** : si batch déjà SENT/ACCEPTED → retour `NOT_ELIGIBLE`, aucune
 *    update DB ne se produit. `providerBatchId @unique` côté DB protège côté PA.
 *  - **Best-effort** : pas de re-throw, l'erreur est mappée en status DB.
 *  - **Feature-flagged** : si `INVOICE_ENABLE_EREPORTING=false`, retour
 *    `SKIPPED_FLAG_OFF` sans aucune query DB.
 *  - **Deadline-aware** : la promise provider est racée contre un timer pour
 *    rester sous BATCH_DEADLINE_MS (cron-side).
 *
 * Cf. EINV-EREPORT-002.
 */

export const MAX_RETRY = 5;

/**
 * Délais minimum (en ms) entre 2 tentatives selon le retryCount courant.
 * Index 0 utilisé après le 1er échec, etc. Au-delà du dernier index, on
 * passe en ABANDONED.
 */
export const RETRY_BACKOFF_MS: readonly number[] = [
	1 * 60 * 60 * 1000, // 1h après 1er échec
	4 * 60 * 60 * 1000, // 4h après 2e
	12 * 60 * 60 * 1000, // 12h après 3e
	24 * 60 * 60 * 1000, // 24h après 4e
	48 * 60 * 60 * 1000, // 48h après 5e (dernière tentative)
];

/**
 * Erreurs « métier » (4xx) qui doivent flip directement REJECTED, sans retry.
 * Distingue erreurs réseau (5xx, timeout) → RETRYING.
 */
export class ProviderBusinessError extends Error {
	constructor(
		message: string,
		readonly httpStatus?: number,
	) {
		super(message);
		this.name = "ProviderBusinessError";
	}
}

/**
 * Race une promise contre un setTimeout local pour SDK PA sans AbortSignal
 * natif. Pattern aligné [[cron-audit-2026-05-26]] (cleanup-orphan-media).
 *
 * Export pour réutilisation depuis d'autres orchestrateurs (`submitInvoiceById`).
 */
export async function withDeadline<T>(
	promise: Promise<T>,
	deadline: number,
	label: string,
): Promise<T> {
	const timeoutMs = Math.max(0, deadline - Date.now());
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			reject(new Error(`${label} timeout after ${timeoutMs}ms`));
		}, timeoutMs);
	});
	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

export type SubmitBatchStatus =
	| "SKIPPED_FLAG_OFF"
	| "SKIPPED_BACKOFF"
	| "SKIPPED_DRY_RUN"
	| "NOT_FOUND"
	| "NOT_ELIGIBLE"
	| "SENT"
	| "ACCEPTED"
	| "REJECTED"
	| "RETRYING"
	| "ABANDONED";

export interface SubmitBatchResult {
	batchId: string;
	status: SubmitBatchStatus;
	providerBatchId?: string;
	retryCount?: number;
	rejectionReason?: string;
}

export interface SubmitBatchOptions {
	/**
	 * Timestamp absolu (Date.now()) après lequel `withDeadline` annule la promise
	 * provider. Si omis, par défaut 30s à partir de l'appel.
	 */
	deadline?: number;
}

const DEFAULT_DEADLINE_MS = 30_000;

/**
 * Statuses de batch éligibles à transmission (PENDING ou RETRYING).
 */
const ELIGIBLE_STATUSES: ReadonlySet<EReportingStatus> = new Set([
	EReportingStatus.PENDING,
	EReportingStatus.RETRYING,
]);

export async function submitEReportingBatchById(
	batchId: string,
	options: SubmitBatchOptions = {},
): Promise<SubmitBatchResult> {
	if (!INVOICE_FEATURE_FLAGS.enable_ereporting) {
		logger.info("E-reporting disabled (feature flag OFF), skipping batch submission", {
			service: "submit-ereporting-batch",
			batchId,
		});
		return { batchId, status: "SKIPPED_FLAG_OFF" };
	}

	const deadline = options.deadline ?? Date.now() + DEFAULT_DEADLINE_MS;
	const provider = getInvoiceProvider();

	const batch = await prisma.eReportingBatch.findUnique({
		where: { id: batchId },
		select: {
			id: true,
			status: true,
			retryCount: true,
			updatedAt: true,
			periodFrom: true,
			periodTo: true,
			transactionCount: true,
			totalAmountIncTax: true,
			totalAmountExclTax: true,
			totalTaxAmount: true,
		},
	});

	if (!batch) {
		return { batchId, status: "NOT_FOUND" };
	}

	if (!ELIGIBLE_STATUSES.has(batch.status)) {
		// Déjà SENT/ACCEPTED/REJECTED/ABANDONED → no-op idempotent.
		return { batchId, status: "NOT_ELIGIBLE" };
	}

	// Backoff check pour RETRYING.
	if (batch.status === EReportingStatus.RETRYING) {
		const sinceLastTry = Date.now() - batch.updatedAt.getTime();
		const requiredDelay =
			RETRY_BACKOFF_MS[Math.min(batch.retryCount - 1, RETRY_BACKOFF_MS.length - 1)];
		if (requiredDelay !== undefined && sinceLastTry < requiredDelay) {
			return { batchId, status: "SKIPPED_BACKOFF", retryCount: batch.retryCount };
		}
	}

	try {
		const transactions = await prisma.eReportingTransaction.findMany({
			where: { batchId: batch.id },
			select: {
				occurredAt: true,
				countryCode: true,
				amountIncTax: true,
				amountExclTax: true,
				taxAmount: true,
				// EINV-EREPORT-002 : mode de règlement + devise + type transmis à la
				// PA (arrêté 2022-1299 §4.3). Capturés à la création mais auparavant
				// droppés du payload provider.
				paymentMethod: true,
				currency: true,
				type: true,
			},
		});

		const result = await withDeadline(
			provider.submitEReportingBatch({
				batch: {
					periodFrom: batch.periodFrom,
					periodTo: batch.periodTo,
					transactionCount: batch.transactionCount,
					totalAmountIncTax: batch.totalAmountIncTax,
					totalAmountExclTax: batch.totalAmountExclTax,
					totalTaxAmount: batch.totalTaxAmount,
					transactions,
				},
				// EINV-EREPORT-003 : clé d'idempotence déterministe = batch.id. La PA
				// dédup sur cette clé → un re-submit après crash (entre l'appel réseau
				// et l'update DB ci-dessous) ne double-transmet pas à la DGFiP.
				idempotencyKey: batch.id,
			}),
			deadline,
			`provider.submitEReportingBatch[${batch.id}]`,
		);

		// LocalPdfProvider retourne PENDING dry-run (capability eReporting: false).
		// On laisse le batch en PENDING ; un vrai provider retournera SENT/ACCEPTED.
		if (result.status === "PENDING") {
			logger.info(`Batch ${batch.id} dry-run PENDING (provider stub)`, {
				service: "submit-ereporting-batch",
				batchId: batch.id,
				providerId: provider.id,
			});
			return {
				batchId,
				status: "SKIPPED_DRY_RUN",
				providerBatchId: result.providerBatchId,
			};
		}

		// Fail-safe : un statut non terminal (RETRYING/ABANDONED) ou inattendu signifie
		// que le batch n'a PAS été accepté/transmis. Ne jamais coercer vers SENT
		// (fail-open = données marquées transmises à tort à la DGFiP). On route vers le
		// même handler que les erreurs réseau : retryCount/backoff/ABANDONED/Sentry
		// s'appliquent uniformément.
		if (
			result.status !== EReportingStatus.ACCEPTED &&
			result.status !== EReportingStatus.SENT &&
			result.status !== EReportingStatus.REJECTED
		) {
			return handleTransmitError(
				batch.id,
				batch.retryCount,
				new Error(`Provider returned non-terminal status "${result.status}" for batch ${batch.id}`),
			);
		}

		const targetStatus =
			result.status === EReportingStatus.ACCEPTED
				? EReportingStatus.ACCEPTED
				: result.status === EReportingStatus.SENT
					? EReportingStatus.SENT
					: EReportingStatus.REJECTED;

		await prisma.eReportingBatch.update({
			where: { id: batch.id },
			data: {
				status: targetStatus,
				providerBatchId: result.providerBatchId,
				providerResponse: result as object,
				...(targetStatus === EReportingStatus.SENT && { sentAt: result.submittedAt }),
				...(targetStatus === EReportingStatus.ACCEPTED && {
					sentAt: result.submittedAt,
					acceptedAt: result.submittedAt,
				}),
				...(targetStatus === EReportingStatus.REJECTED && {
					rejectedAt: result.submittedAt,
					rejectionReason: (
						result.rejectionReason ?? "Provider returned REJECTED without reason"
					).slice(0, 1000),
				}),
			},
		});

		// Propager le status aux transactions enfants.
		await prisma.eReportingTransaction.updateMany({
			where: { batchId: batch.id },
			data: { status: targetStatus },
		});

		logger.info(`Batch ${batch.id} transmitted → ${targetStatus}`, {
			service: "submit-ereporting-batch",
			batchId: batch.id,
			providerBatchId: result.providerBatchId,
		});

		// EINV-EREPORT-004 : un rejet synchrone PA est un blocage fiscal (données
		// non transmises à la DGFiP) qui exige une action admin. Sentry warning en
		// plus du dashboard passif et du scan hebdo alert-stuck-orders.
		if (targetStatus === EReportingStatus.REJECTED) {
			captureRejectedBatch(
				batch.id,
				(result.rejectionReason ?? "Provider returned REJECTED without reason").slice(0, 1000),
			);
		}

		return {
			batchId,
			status: targetStatus as SubmitBatchStatus,
			providerBatchId: result.providerBatchId,
			...(targetStatus === EReportingStatus.REJECTED && {
				rejectionReason: (
					result.rejectionReason ?? "Provider returned REJECTED without reason"
				).slice(0, 1000),
			}),
		};
	} catch (e) {
		return handleTransmitError(batch.id, batch.retryCount, e);
	}
}

async function handleTransmitError(
	batchId: string,
	currentRetryCount: number,
	error: unknown,
): Promise<SubmitBatchResult> {
	const nextRetryCount = currentRetryCount + 1;
	const isBusinessError = error instanceof ProviderBusinessError;

	// Erreur métier 4xx → REJECTED direct (pas de retry, correction admin requise).
	if (isBusinessError) {
		const reason = error.message.slice(0, 1000);
		await prisma.eReportingBatch.update({
			where: { id: batchId },
			data: {
				status: EReportingStatus.REJECTED,
				rejectedAt: new Date(),
				rejectionReason: reason,
			},
		});
		logger.error(`Batch ${batchId} REJECTED (business error)`, error, {
			service: "submit-ereporting-batch",
			batchId,
		});
		// EINV-EREPORT-004 : rejet métier 4xx = blocage fiscal nécessitant correction
		// admin (jamais re-tenté automatiquement). Alerte Sentry warning.
		captureRejectedBatch(batchId, reason);
		return { batchId, status: "REJECTED", rejectionReason: reason };
	}

	// Erreur réseau ou inconnue → RETRYING ou ABANDONED selon retryCount.
	const finalStatus =
		nextRetryCount > MAX_RETRY ? EReportingStatus.ABANDONED : EReportingStatus.RETRYING;

	await prisma.eReportingBatch.update({
		where: { id: batchId },
		data: {
			status: finalStatus,
			retryCount: nextRetryCount,
			...(finalStatus === EReportingStatus.ABANDONED && { rejectedAt: new Date() }),
		},
	});

	if (finalStatus === EReportingStatus.ABANDONED) {
		Sentry.withScope((scope) => {
			scope.setTag("service", "submit-ereporting-batch");
			scope.setTag("batchId", batchId);
			scope.setFingerprint(["service", "submit-ereporting-batch", "abandoned"]);
			scope.setLevel("error");
			Sentry.captureException(
				new Error(`E-reporting batch ${batchId} abandoned after ${MAX_RETRY} retries`),
			);
		});
		logger.error(`Batch ${batchId} ABANDONED (max retry exceeded)`, error, {
			service: "submit-ereporting-batch",
			batchId,
			retryCount: nextRetryCount,
		});
		return { batchId, status: "ABANDONED", retryCount: nextRetryCount };
	}

	logger.warn(`Batch ${batchId} RETRYING (count=${nextRetryCount})`, {
		service: "submit-ereporting-batch",
		batchId,
		retryCount: nextRetryCount,
		error: error instanceof Error ? error.message : String(error),
	});
	return { batchId, status: "RETRYING", retryCount: nextRetryCount };
}

/**
 * EINV-EREPORT-004 : émet une alerte Sentry `warning` quand un batch e-reporting
 * passe REJECTED (ACK synchrone PA ou erreur métier 4xx). Un REJECTED bloque la
 * transmission des données fiscales jusqu'à correction admin (`retryEReportingBatch`)
 * et, contrairement à ABANDONED, n'était auparavant ni alerté par Sentry ni repris
 * par le scan PENDING/RETRYING de `alert-stuck-orders`. Fingerprint dédié pour ne
 * pas se mélanger aux alertes ABANDONED.
 */
function captureRejectedBatch(batchId: string, reason: string): void {
	Sentry.withScope((scope) => {
		scope.setTag("service", "submit-ereporting-batch");
		scope.setTag("batchId", batchId);
		scope.setFingerprint(["service", "submit-ereporting-batch", "rejected"]);
		scope.setLevel("warning");
		Sentry.captureException(new Error(`E-reporting batch ${batchId} REJECTED: ${reason}`));
	});
}
