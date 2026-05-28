import { updateTag } from "next/cache";
import {
	HistorySource,
	OrderAction,
	PaymentStatus,
	InvoiceStatus,
	Prisma,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";
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
		!creditNoteRecovered
	) {
		// Rien à faire : drapeau posé sur une commande qui n'a finalement pas
		// d'anomalie (déjà rattrapée par lazy fallback). On le baisse.
		await prisma.order.update({
			where: { id: order.id },
			data: { invoiceRetryDeferred: false, invoiceReconcileAttempts: 0 },
		});
		return { kind: "skipped" };
	}

	// Reset flags après succès complet + audit trail
	await prisma.order.update({
		where: { id: order.id },
		data: { invoiceRetryDeferred: false, invoiceReconcileAttempts: 0 },
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
		},
	});
	return {
		kind: "recovered",
		snapshotBackfilled,
		invoiceNumberRecovered,
		pdfArchiveRecovered,
		creditNoteRecovered,
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
