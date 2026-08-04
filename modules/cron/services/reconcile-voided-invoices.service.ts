import {
	HistorySource,
	OrderStatus,
	InvoiceStatus,
	PaymentStatus,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const RECONCILE_AUDIT_AUTHOR = "Système (reconcile-voided-invoices)";

/**
 * Reconciles orphan invoices : commandes en état CANCELLED ou REFUNDED dont la
 * facture est restée GENERATED. Cas d'incident :
 *
 *  - `cancel-order.ts:289` ou `mark-as-fully-refunded.ts:145` appellent
 *    `voidInvoice()` HORS de la transaction parent (advisory lock incompatible
 *    avec imbrication). Si la mutation principale succeed mais voidInvoice
 *    échoue (saturations P2002, panne DB partielle), on a une commande
 *    annulée/remboursée SANS l'avoir correspondant (Art. 272-I CGI).
 *
 * Le cron rejoue voidInvoice. Idempotent : noop sur les factures déjà VOIDED.
 *
 * Audit : `INVOICE_VOIDED` source SYSTEM autorName "reconcile-voided-invoices"
 * via `voidInvoice` lui-même → trace l'origine du rattrapage.
 *
 * Cf. audit comptable-tech 2026-05-28 — EINV-PDF-007
 */
export async function reconcileVoidedInvoices(): Promise<CronResult> {
	logger.info("Starting voided invoice reconciliation", { cronJob: "reconcile-voided-invoices" });

	const candidates = await prisma.order.findMany({
		where: {
			OR: [{ status: OrderStatus.CANCELLED }, { paymentStatus: PaymentStatus.REFUNDED }],
			invoiceStatus: InvoiceStatus.GENERATED,
			invoiceNumber: { not: null },
			creditNoteNumber: null,
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			invoiceNumber: true,
			status: true,
			paymentStatus: true,
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { updatedAt: "asc" },
	});

	logger.info("Found voided invoice candidates", {
		cronJob: "reconcile-voided-invoices",
		count: candidates.length,
	});

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;

	for (const order of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "reconcile-voided-invoices",
			});
			break;
		}

		try {
			const result = await voidInvoice({
				orderId: order.id,
				authorName: RECONCILE_AUDIT_AUTHOR,
				source: HistorySource.SYSTEM,
				reason:
					order.status === OrderStatus.CANCELLED
						? "Rattrapage cron : commande annulée sans avoir associé"
						: "Rattrapage cron : remboursement total sans avoir associé",
			});

			if (result.kind === "voided") {
				processed++;
				logger.info(
					`Issued credit note ${result.creditNoteNumber} for order ${order.orderNumber}`,
					{
						cronJob: "reconcile-voided-invoices",
						orderId: order.id,
						orderNumber: order.orderNumber,
						invoiceNumber: order.invoiceNumber ?? undefined,
						creditNoteNumber: result.creditNoteNumber,
					},
				);
			} else if (result.kind === "noop") {
				// Idempotent : déjà VOIDED ou pas de facture active.
				skipped++;
			} else {
				// kind === "failed" : voidInvoice a échoué après MAX_RETRIES.
				logger.error("voidInvoice returned failed kind during reconcile", undefined, {
					cronJob: "reconcile-voided-invoices",
					orderId: order.id,
					invoiceNumber: order.invoiceNumber ?? undefined,
					error: result.error,
				});
				errored++;
			}
		} catch (error) {
			logger.error("Failed to reconcile voided invoice", error, {
				cronJob: "reconcile-voided-invoices",
				orderId: order.id,
				invoiceNumber: order.invoiceNumber ?? undefined,
			});
			errored++;
		}
	}

	logger.info("Reconciliation completed", {
		cronJob: "reconcile-voided-invoices",
		processed,
		errored,
		skipped,
	});

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
	};
}
