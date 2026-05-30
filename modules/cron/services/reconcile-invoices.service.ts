import { updateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import {
	HistorySource,
	OrderAction,
	PaymentStatus,
	InvoiceStatus,
	RefundStatus,
	Prisma,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getParisDateParts } from "@/shared/utils/timezone";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
import { checkSequenceContinuity } from "@/modules/invoices/services/check-sequence-continuity.service";
import { checkEReportingOrphanTransactions } from "@/modules/invoices/services/check-ereporting-period-continuity.service";
import {
	recordSalesEReporting,
	recordRefundEReporting,
} from "@/modules/invoices/services/record-ereporting.service";
import {
	persistInvoiceNumber,
	backfillInvoiceDataSnapshot,
} from "@/modules/orders/services/persist-invoice-number.service";
import { archiveInvoicePdf } from "@/modules/orders/services/archive-invoice-pdf.service";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { resolveInvoiceDataForRender } from "@/modules/invoices/services/resolve-invoice-data";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import { GET_ORDER_SELECT_ADMIN } from "@/modules/orders/constants/order.constants";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { createOrderAudit } from "@/modules/orders/utils/order-audit";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

const CRON_JOB = "reconcile-invoices";
const ESCALATION_THRESHOLD = 3;
const MIN_AGE_MS = 6 * 60 * 60 * 1000; // 6h quarantine — eager path a sa chance

interface ReconcileBreakdown {
	snapshotBackfilled: number;
	invoiceNumberRecovered: number;
	pdfArchiveRecovered: number;
	creditNoteRecovered: number;
	escalated: number;
	/** EINV-SEQ-007 — nombre d'anomalies de continuité de séquence détectées (Art. 286 CGI). */
	continuityIssues: number;
	/** EINV-EREPORT-008 — nombre de transactions e-reporting orphelines (période close, jamais batchées). */
	ereportingOrphans: number;
	/** EINV-EREPORT-009 — nombre de commandes dont la transaction SALES e-reporting a été rattrapée. */
	ereportingSalesRecovered: number;
	/** EINV-EREPORT-009 — nombre de refunds dont la transaction REFUND e-reporting a été rattrapée. */
	ereportingRefundRecovered: number;
}

/**
 * DLQ facturation (audit monitoring 2026-05-28 EINV-OPS-004).
 *
 * Cron daily 02:00 qui rattrape les Orders en état pathologique :
 *   0. invoiceNumber + invoiceDataSnapshot NULL → backfillInvoiceDataSnapshot (EINV-PDF-005)
 *   1. PAID + invoiceNumber NULL + paidAt > 6h → persistInvoiceNumber
 *   2. invoiceNumber + invoicePdfUrl NULL → archiveInvoicePdf (régénère PDF depuis snapshot)
 *   3. REFUNDED + invoiceStatus GENERATED + creditNoteNumber NULL → voidInvoice
 *
 * Sélection : `invoiceRetryDeferred=true` (DLQ) OU facture legacy à snapshot
 * manquant (`invoiceNumber` présent + `invoiceDataSnapshot` NULL — EINV-PDF-005).
 * Compteur `invoiceReconcileAttempts` incrémenté à chaque tentative ;
 * au-dessus du seuil `ESCALATION_THRESHOLD`, l'admin est alerté pour
 * intervention manuelle.
 *
 * Reset `invoiceRetryDeferred=false` automatique après une passe entièrement
 * réussie (les services sous-jacents reflagment si besoin sur erreur future).
 */
export async function reconcileInvoices(): Promise<CronResult & ReconcileBreakdown> {
	logger.info("Starting invoice reconciliation", { cronJob: CRON_JOB });

	const now = Date.now();
	const minAge = new Date(now - MIN_AGE_MS);

	const candidates = await prisma.order.findMany({
		where: {
			AND: [
				{
					OR: [
						// DLQ : anomalie facturation déjà flaguée.
						{ invoiceRetryDeferred: true },
						// EINV-EREPORT-009 : DLQ e-reporting SALES — recordSalesEReporting
						// a échoué ("error") sur le hot path. Drainé par la Passe SALES.
						{ ereportingRetryDeferred: true },
						// EINV-PDF-005 : facture legacy à snapshot comptable manquant
						// (numéro émis avant l'introduction du snapshot figé).
						{
							invoiceNumber: { not: null },
							invoiceDataSnapshot: { equals: Prisma.DbNull },
						},
					],
				},
				{ OR: [{ paidAt: { lt: minAge } }, { paidAt: null }] },
			],
			...notDeleted,
		},
		select: GET_ORDER_SELECT_ADMIN,
		take: BATCH_SIZE_MEDIUM,
		orderBy: { paidAt: "asc" },
	});

	logger.info("Found invoice reconcile candidates", {
		cronJob: CRON_JOB,
		count: candidates.length,
	});

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	const breakdown: ReconcileBreakdown = {
		snapshotBackfilled: 0,
		invoiceNumberRecovered: 0,
		pdfArchiveRecovered: 0,
		creditNoteRecovered: 0,
		escalated: 0,
		continuityIssues: 0,
		ereportingOrphans: 0,
		ereportingSalesRecovered: 0,
		ereportingRefundRecovered: 0,
	};
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	for (const order of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", { cronJob: CRON_JOB });
			break;
		}

		try {
			const recovered = await reconcileOrder(order);
			if (recovered.kind === "recovered") {
				processed++;
				if (recovered.snapshotBackfilled) breakdown.snapshotBackfilled++;
				if (recovered.invoiceNumberRecovered) breakdown.invoiceNumberRecovered++;
				if (recovered.pdfArchiveRecovered) breakdown.pdfArchiveRecovered++;
				if (recovered.creditNoteRecovered) breakdown.creditNoteRecovered++;
				if (recovered.ereportingSalesRecovered) breakdown.ereportingSalesRecovered++;
				for (const tag of getOrderInvalidationTags(order.userId ?? undefined, order.id)) {
					tagsToInvalidate.add(tag);
				}
			} else if (recovered.kind === "escalated") {
				breakdown.escalated++;
				errored++;
			} else {
				skipped++;
			}
		} catch (e) {
			logger.error("Error reconciling invoice", e, {
				cronJob: CRON_JOB,
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
			errored++;
		}
	}

	for (const tag of tagsToInvalidate) {
		updateTag(tag);
	}

	// Passe 4 (EINV-SEQ-007) : contrôle de continuité gap-free — défense en
	// profondeur Art. 286 CGI. Lecture seule, hors deadline batch (2 requêtes
	// légères), jamais bloquant. Détecte trous + doublons que la construction
	// MAX+1-sous-lock est censée empêcher. Années couvertes : courante + N-1
	// jusqu'à fin mars (période de clôture comptable où des avoirs N-1 sortent).
	breakdown.continuityIssues = await runContinuityCheck(now);

	// Passe 5 (EINV-EREPORT-008) : contrôle de continuité anti-trou e-reporting —
	// défense en profondeur. L'exclusion constraint garantit le non-recouvrement
	// des périodes mais PAS l'absence de trou ; ce contrôle détecte les
	// transactions PENDING dont la période est close depuis > grâce et qui n'ont
	// jamais été batchées (sous-déclaration DGFiP). Lecture seule, jamais bloquant.
	breakdown.ereportingOrphans = await runEReportingOrphanCheck(new Date(now));

	// Passe 6 (EINV-EREPORT-009) : drainage du DLQ e-reporting REFUND. Un refund
	// COMPLETED dont recordRefundEReporting a échoué ("error") porte
	// Refund.ereportingRetryDeferred=true (posé par recordRefundEReportingDeferrable
	// depuis process-refund / mark-as-fully-refunded). Le chemin de finalisation
	// (webhook / SAGA) ne le re-sélectionne plus → sans ce filet, sa ligne DGFiP
	// négative ne serait jamais créée (sur-déclaration : vente reportée, remboursement
	// non reporté — Art. 286 CGI). On retente (idempotent) puis on lève le flag au
	// succès. Hébergé ici (et non dans reconcile-refunds) pour regrouper toute la
	// réconciliation e-reporting/facture dans un seul cron.
	breakdown.ereportingRefundRecovered = await runRefundEReportingDeferredSweep(deadline);

	logger.info("Invoice reconciliation completed", {
		cronJob: CRON_JOB,
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

export type ReconcileOutcome =
	| {
			kind: "recovered";
			snapshotBackfilled: boolean;
			invoiceNumberRecovered: boolean;
			pdfArchiveRecovered: boolean;
			creditNoteRecovered: boolean;
			ereportingSalesRecovered: boolean;
	  }
	| { kind: "escalated" }
	| { kind: "skipped" };

/**
 * Variante 1-order utilisée par la Server Action "Relancer" du dashboard admin
 * (`/admin/ventes/facturation`). Charge l'order et exécute la même logique
 * que la passe batch du cron. Cf. EINV-OPS-007.
 */
export async function reconcileInvoiceOrder(orderId: string): Promise<ReconcileOutcome> {
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: GET_ORDER_SELECT_ADMIN,
	});
	if (!order) return { kind: "skipped" };
	return reconcileOrder(order as GetOrderReturn);
}

async function reconcileOrder(order: GetOrderReturn): Promise<ReconcileOutcome> {
	let snapshotBackfilled = false;
	let invoiceNumberRecovered = false;
	let pdfArchiveRecovered = false;
	let creditNoteRecovered = false;
	let ereportingSalesRecovered = false;
	let anyFailure = false;

	// Passe 0 : snapshot comptable manquant sur facture déjà émise (legacy
	// pré-snapshot) — EINV-PDF-005. Fige les données pour que la régénération
	// PDF/XML soit reconstituable à l'identique (Art. L102 B LPF).
	const withSnapshot = order as GetOrderReturn & { invoiceDataSnapshot?: unknown };
	if (order.invoiceNumber && order.invoiceGeneratedAt && withSnapshot.invoiceDataSnapshot == null) {
		try {
			const result = await backfillInvoiceDataSnapshot(order.id);
			if (result) {
				snapshotBackfilled = true;
				// Charge le snapshot fraîchement figé en mémoire pour que la Passe 2
				// rende le PDF depuis lui (cohérence hash archive ↔ snapshot).
				withSnapshot.invoiceDataSnapshot = result.invoiceDataSnapshot;
				order.invoiceDataHash = result.invoiceDataHash;
			}
		} catch (e) {
			logger.error("Snapshot backfill threw during reconcile", e, {
				cronJob: CRON_JOB,
				orderId: order.id,
				invoiceNumber: order.invoiceNumber,
			});
			anyFailure = true;
		}
	}

	// Passe 1 : invoiceNumber manquant
	if (!order.invoiceNumber && order.paymentStatus === PaymentStatus.PAID) {
		const result = await persistInvoiceNumber(order.id, order.userId, {
			source: HistorySource.SYSTEM,
			authorName: "Système (reconcile-invoices)",
		});
		if (result) {
			invoiceNumberRecovered = true;
			order.invoiceNumber = result.invoiceNumber;
			order.invoiceStatus = InvoiceStatus.GENERATED;
			order.invoiceGeneratedAt = result.invoiceGeneratedAt;
		} else {
			anyFailure = true;
		}
	}

	// Passe 2 : invoicePdfUrl manquant (archive perdue)
	if (
		order.invoiceNumber &&
		!order.invoicePdfUrl &&
		order.invoiceStatus === InvoiceStatus.GENERATED
	) {
		try {
			// EINV-PDF-001 : rendre depuis le snapshot figé (Passe 0 l'a chargé en
			// mémoire si backfill, sinon il était déjà présent ; fallback legacy
			// uniquement si snapshot toujours absent).
			const pdf = renderInvoicePdf(resolveInvoiceDataForRender(order));
			const archived = await archiveInvoicePdf(order.id, order.invoiceNumber, pdf);
			if (archived) {
				pdfArchiveRecovered = true;
			} else {
				anyFailure = true;
			}
		} catch (e) {
			logger.error("PDF re-archive threw during reconcile", e, {
				cronJob: CRON_JOB,
				orderId: order.id,
				invoiceNumber: order.invoiceNumber,
			});
			anyFailure = true;
		}
	}

	// Passe 3 : avoir manquant (REFUNDED mais invoice GENERATED + pas de creditNote)
	if (
		order.invoiceNumber &&
		order.paymentStatus === PaymentStatus.REFUNDED &&
		order.invoiceStatus === InvoiceStatus.GENERATED &&
		!order.creditNoteNumber
	) {
		const result = await voidInvoice({
			orderId: order.id,
			authorId: null,
			authorName: "Système (reconcile-invoices)",
			source: HistorySource.SYSTEM,
			reason: "Reconciliation cron — credit note missing post-refund",
		});
		if (result.kind === "voided") {
			creditNoteRecovered = true;
		} else if (result.kind === "failed") {
			anyFailure = true;
		}
		// noop = facture déjà voided ou rien à voider → on laisse anyFailure=false
	}

	// Passe SALES (EINV-EREPORT-009) : transaction SALES e-reporting non enregistrée.
	// Drapeau posé par recordSalesEReportingDeferrable quand l'enregistrement a
	// échoué ("error") sur le hot path. On retente l'enregistrement (idempotent :
	// findFirst + unique index). Un "error" persistant ⇒ anyFailure → escalade via
	// le compteur partagé invoiceReconcileAttempts. "skipped" (flag e-reporting OFF,
	// déjà enregistrée, hors B2C) ⇒ succès, on lèvera le flag.
	const withFlags = order as GetOrderReturn & { ereportingRetryDeferred?: boolean };
	if (withFlags.ereportingRetryDeferred && order.paymentStatus === PaymentStatus.PAID) {
		const result = await recordSalesEReporting(order.id);
		if (result === "error") {
			anyFailure = true;
		} else {
			ereportingSalesRecovered = true;
		}
	}

	if (anyFailure) {
		// Increment compteur + decide d'escalader
		const updated = await prisma.order.update({
			where: { id: order.id },
			data: { invoiceReconcileAttempts: { increment: 1 } },
			select: { invoiceReconcileAttempts: true },
		});
		if (updated.invoiceReconcileAttempts >= ESCALATION_THRESHOLD) {
			await escalate(order.id, order.orderNumber, updated.invoiceReconcileAttempts);
			return { kind: "escalated" };
		}
		return { kind: "skipped" };
	}

	if (
		!snapshotBackfilled &&
		!invoiceNumberRecovered &&
		!pdfArchiveRecovered &&
		!creditNoteRecovered &&
		!ereportingSalesRecovered
	) {
		// Rien à faire : drapeau posé sur une commande qui n'a finalement pas
		// d'anomalie (déjà rattrapée par lazy fallback). On le baisse — y compris
		// le flag e-reporting (EINV-EREPORT-009).
		await prisma.order.update({
			where: { id: order.id },
			data: {
				invoiceRetryDeferred: false,
				invoiceReconcileAttempts: 0,
				ereportingRetryDeferred: false,
			},
		});
		return { kind: "skipped" };
	}

	// Reset flags après succès complet + audit trail
	await prisma.order.update({
		where: { id: order.id },
		data: {
			invoiceRetryDeferred: false,
			invoiceReconcileAttempts: 0,
			ereportingRetryDeferred: false,
		},
	});
	await createOrderAudit({
		orderId: order.id,
		action: OrderAction.INVOICE_RECONCILED,
		source: HistorySource.SYSTEM,
		authorName: "Système (reconcile-invoices)",
		note: "Anomalie facture rattrapée par cron",
		metadata: {
			snapshotBackfilled,
			invoiceNumberRecovered,
			pdfArchiveRecovered,
			creditNoteRecovered,
			ereportingSalesRecovered,
		},
	});
	return {
		kind: "recovered",
		snapshotBackfilled,
		invoiceNumberRecovered,
		pdfArchiveRecovered,
		creditNoteRecovered,
		ereportingSalesRecovered,
	};
}

async function escalate(orderId: string, orderNumber: string, attempts: number): Promise<void> {
	logger.error("Invoice reconciliation exceeded threshold — escalating to admin", undefined, {
		cronJob: CRON_JOB,
		orderId,
		orderNumber,
		attempts,
	});
	await sendAdminCronFailedAlert({
		job: CRON_JOB,
		errors: 1,
		details: {
			orderId,
			orderNumber,
			attempts,
			threshold: ESCALATION_THRESHOLD,
			action:
				"Intervention manuelle requise : voir /admin/ventes/commandes/" +
				orderId +
				" + docs/RUNBOOK-INVOICING.md",
		},
	}).catch((alertError) =>
		logger.error("Failed to send escalation alert", alertError, {
			cronJob: CRON_JOB,
			orderId,
		}),
	);
}

/**
 * EINV-SEQ-007 — contrôle de continuité gap-free (Art. 286 CGI). Lecture seule,
 * jamais bloquant : toute exception est avalée (le cœur du cron a déjà tourné).
 * Sentry fingerprinté par séquence+année + UNE alerte admin agrégée (l'idempotency
 * key horaire de `sendAdminCronFailedAlert` collapse de toute façon les envois du
 * même cron sur la même heure → on agrège pour ne pas perdre de détail).
 *
 * @returns nombre d'anomalies détectées (0 = séquences saines).
 */
async function runContinuityCheck(now: number): Promise<number> {
	try {
		const { year, month } = getParisDateParts(new Date(now));
		// month 0-indexé : 0=jan … 2=mars → couvre N-1 jusqu'au 31 mars.
		const years = month <= 2 ? [year, year - 1] : [year];

		const issues = await checkSequenceContinuity(years);
		if (issues.length === 0) return 0;

		for (const issue of issues) {
			logger.error("Sequence continuity breach detected", undefined, {
				cronJob: CRON_JOB,
				kind: issue.kind,
				year: issue.year,
				prefix: issue.prefix,
				max: issue.max,
				count: issue.count,
				missingCount: issue.missing.length,
				duplicateCount: issue.duplicates.length,
			});
			Sentry.withScope((scope) => {
				scope.setLevel("error");
				scope.setFingerprint(["invoice", "sequence-continuity", issue.kind, String(issue.year)]);
				scope.setContext("sequence-continuity", {
					kind: issue.kind,
					year: issue.year,
					prefix: issue.prefix,
					max: issue.max,
					count: issue.count,
					missing: issue.missing.slice(0, 50),
					duplicates: issue.duplicates.slice(0, 50),
				});
				Sentry.captureMessage(
					`Séquence ${issue.kind} ${issue.prefix} non-contiguë — ${issue.missing.length} trou(s), ${issue.duplicates.length} doublon(s) (Art. 286 CGI)`,
					"error",
				);
			});
		}

		await sendAdminCronFailedAlert({
			job: CRON_JOB,
			errors: issues.length,
			details: {
				type: "sequence-continuity-breach",
				issues: issues.map((i) => ({
					sequence: i.kind,
					year: i.year,
					prefix: i.prefix,
					max: i.max,
					count: i.count,
					missing: i.missing.slice(0, 50),
					duplicates: i.duplicates.slice(0, 50),
				})),
				action:
					"Trou/doublon de séquence légale (Art. 286 CGI) — investigation immédiate, voir docs/RUNBOOK-INVOICING.md",
			},
		}).catch((alertError) =>
			logger.error("Failed to send continuity breach alert", alertError, { cronJob: CRON_JOB }),
		);

		return issues.length;
	} catch (e) {
		logger.error("Sequence continuity check threw", e, { cronJob: CRON_JOB });
		return 0;
	}
}

/**
 * EINV-EREPORT-008 — contrôle de continuité anti-trou des périodes e-reporting.
 *
 * Détecte les transactions PENDING non rattachées dont la période est close
 * depuis plus que le délai de grâce (= jamais batchées, sous-déclaration DGFiP).
 * Lecture seule, jamais bloquant : log + Sentry fingerprinté + UNE alerte admin
 * agrégée. Calqué sur `runContinuityCheck`.
 *
 * @returns nombre de transactions orphelines (0 = sain).
 */
async function runEReportingOrphanCheck(now: Date): Promise<number> {
	try {
		const report = await checkEReportingOrphanTransactions(now);
		if (!report) return 0;

		logger.error("E-reporting orphan transactions detected", undefined, {
			cronJob: CRON_JOB,
			orphanCount: report.orphanCount,
			oldestOccurredAt: report.oldestOccurredAt,
			oldestPeriodTo: report.oldestPeriodTo,
		});

		Sentry.withScope((scope) => {
			scope.setLevel("error");
			scope.setFingerprint(["ereporting", "orphan-transactions"]);
			scope.setContext("ereporting-orphans", {
				orphanCount: report.orphanCount,
				oldestOccurredAt: report.oldestOccurredAt,
				oldestPeriodTo: report.oldestPeriodTo,
				sampleIds: report.sampleIds,
			});
			Sentry.captureMessage(
				`${report.orphanCount} transaction(s) e-reporting orpheline(s) — période close jamais batchée (sous-déclaration DGFiP)`,
				"error",
			);
		});

		await sendAdminCronFailedAlert({
			// Label distinct du contrôle de numérotation : l'idempotency key de
			// sendAdminCronFailedAlert est bucketée par heure ET par `job` — un même
			// `CRON_JOB` collapserait l'alerte orphelins avec une éventuelle alerte de
			// continuité de numérotation dans la même heure. On veut les deux.
			job: `${CRON_JOB}:ereporting-orphans`,
			errors: 1,
			details: {
				type: "ereporting-orphan-transactions",
				orphanCount: report.orphanCount,
				oldestOccurredAt: report.oldestOccurredAt,
				oldestPeriodTo: report.oldestPeriodTo,
				sampleIds: report.sampleIds,
				action:
					"Transactions e-reporting non rattachées à un batch au-delà du délai — vérifier build-ereporting-batch, voir docs/RUNBOOK-INVOICING.md",
			},
		}).catch((alertError) =>
			logger.error("Failed to send e-reporting orphan alert", alertError, { cronJob: CRON_JOB }),
		);

		return report.orphanCount;
	} catch (e) {
		logger.error("E-reporting orphan check threw", e, { cronJob: CRON_JOB });
		return 0;
	}
}

/**
 * Passe 6 (EINV-EREPORT-009) — drainage du DLQ e-reporting REFUND.
 *
 * Sélectionne les Refund COMPLETED flagués `ereportingRetryDeferred=true` (posé par
 * `recordRefundEReportingDeferrable` quand l'enregistrement a échoué sur le hot path
 * admin) et retente `recordRefundEReporting` (idempotent : findFirst + unique index).
 * Au succès ("skipped" ou id créé) on lève le flag ; sur "error" persistant on le
 * laisse pour le prochain run (Sentry déjà émis par recordRefundEReporting). Borné
 * par BATCH_SIZE_MEDIUM + la deadline batch. Jamais bloquant.
 *
 * @returns nombre de refunds dont la transaction REFUND a été (ré)enregistrée.
 */
async function runRefundEReportingDeferredSweep(deadline: number): Promise<number> {
	try {
		const deferred = await prisma.refund.findMany({
			where: {
				ereportingRetryDeferred: true,
				status: RefundStatus.COMPLETED,
				...notDeleted,
			},
			select: { id: true },
			take: BATCH_SIZE_MEDIUM,
			orderBy: { processedAt: "asc" },
		});

		let recovered = 0;
		for (const refund of deferred) {
			if (Date.now() > deadline) {
				logger.warn("Approaching timeout, stopping refund e-reporting sweep early", {
					cronJob: CRON_JOB,
				});
				break;
			}
			const result = await recordRefundEReporting(refund.id);
			if (result === "error") continue; // flag conservé → prochain run
			await prisma.refund.update({
				where: { id: refund.id },
				data: { ereportingRetryDeferred: false },
			});
			recovered++;
		}
		if (recovered > 0) {
			logger.info("Refund e-reporting DLQ drained", { cronJob: CRON_JOB, recovered });
		}
		return recovered;
	} catch (e) {
		logger.error("Refund e-reporting deferred sweep threw", e, { cronJob: CRON_JOB });
		return 0;
	}
}
