import * as Sentry from "@sentry/nextjs";
import {
	type HistorySource,
	InvoiceStatus,
	OrderAction,
	PaymentStatus,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { buildOrderTrackingUrl } from "@/modules/orders/utils/build-order-tracking-url";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { canTransition } from "./refund-state-machine.service";
import { issueCreditNoteForRefund } from "./issue-credit-note.service";
import { sendRefundConfirmationOnce } from "./send-refund-confirmation.service";
import { getRefundInvalidationTags } from "../constants/cache";
import { captureRefundError } from "../utils/capture-refund-error";

/**
 * Finalisation partagée d'un refund Stripe confirmé (`succeeded`) — service
 * transactionnel appelé depuis DEUX contextes non-Server-Action :
 *
 * - `reconcile-refunds` (tâche Maintenance) : refunds APPROVED dont la
 *   finalisation webhook a été manquée ;
 * - `handleRefundUpdated` (webhook `refund.updated`) : refunds partis en
 *   `pending` chez Stripe (virement SEPA…), finalisés à la confirmation.
 *
 * Historique (audit « Admin commandes » 2026-08-01, P1-C) : le webhook ne posait
 * que `status: COMPLETED` + `processedAt` — sans avoir Art. 272-I, sans email —
 * et `processedAt` non nul excluait le refund à jamais du cron (candidats
 * `processedAt: null`). Cette machinerie vivait déjà, complète, en privé dans
 * `reconcile-refunds.service.ts` ; elle est extraite ici pour que les deux
 * chemins soient le MÊME code. Le restock automatique (`RefundItem.restock`) est
 * parti au Lot 6 : plus aucun créateur ne le demandait depuis les remboursements
 * Stripe-first (Lot 2) — le restock post-refund est un ajustement manuel du stock
 * de la variante.
 *
 * ⚠️ L'appelant invalide les tags retournés avec l'API de SON contexte :
 * `revalidateTagsInBackground` (cron) ou tâche `INVALIDATE_CACHE` (webhook).
 * `updateTag` throw hors Server Action (E872) — ce service n'invalide rien
 * lui-même.
 */

export interface FinalizeRefundCompletionParams {
	refundId: string;
	source: HistorySource;
	authorName: string;
	auditNote: string;
	/** Champs additionnels fusionnés dans la metadata d'audit (ex: provenance). */
	auditMetadata?: Record<string, string | number | boolean | null>;
}

export interface FinalizeRefundCompletionResult {
	/** false si le refund n'était plus APPROVED (race webhook / admin / cron) ou introuvable. */
	finalized: boolean;
	/** true si cette finalisation rend la commande totalement remboursée. */
	isFullyRefunded: boolean;
	/** Tags de cache à invalider par l'appelant (refund + commande). */
	tags: string[];
}

const FINALIZE_NOOP: FinalizeRefundCompletionResult = {
	finalized: false,
	isFullyRefunded: false,
	tags: [],
};

export async function finalizeRefundCompletion(
	params: FinalizeRefundCompletionParams,
): Promise<FinalizeRefundCompletionResult> {
	const { refundId, source, authorName, auditNote, auditMetadata } = params;

	const refund = await prisma.refund.findUnique({
		where: { id: refundId },
		select: {
			id: true,
			amount: true,
			reason: true,
			stripeRefundId: true,
			order: {
				select: {
					id: true,
					orderNumber: true,
					total: true,
					customerEmail: true,
					customerName: true,
				},
			},
		},
	});
	if (!refund) return FINALIZE_NOOP;

	const orderId = refund.order.id;
	const orderNumber = refund.order.orderNumber;

	// ========================================================================
	// Transaction atomique : claim COMPLETED + paymentStatus + audit
	// ========================================================================
	const txResult = await prisma.$transaction(async (tx) => {
		const updated = await tx.refund.updateMany({
			where: { id: refundId, status: RefundStatus.APPROVED },
			data: { status: RefundStatus.COMPLETED, processedAt: new Date() },
		});
		if (updated.count === 0) {
			// Garde belt-and-suspenders : canTransition est déjà couvert par le
			// guard `status: APPROVED`, mais on logue le diagnostic.
			const current = await tx.refund.findUnique({
				where: { id: refundId },
				select: { status: true },
			});
			if (current && !canTransition(current.status, RefundStatus.COMPLETED)) {
				logger.warn("Refund cannot transition to COMPLETED — concurrent state change", {
					refundId,
					currentStatus: current.status,
				});
			}
			return null;
		}

		// Recalcule total COMPLETED après cette finalisation
		const completedAggregate = await tx.refund.aggregate({
			where: { orderId, status: RefundStatus.COMPLETED },
			_sum: { amount: true },
		});
		const totalRefunded = completedAggregate._sum.amount ?? refund.amount;
		const isFullyRefunded = totalRefunded >= refund.order.total;

		let newPaymentStatus: PaymentStatus | undefined;
		if (isFullyRefunded) {
			newPaymentStatus = PaymentStatus.REFUNDED;
		} else if (totalRefunded > 0) {
			newPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
		}

		if (newPaymentStatus) {
			await tx.order.update({
				where: { id: orderId },
				data: { paymentStatus: newPaymentStatus },
			});
		}

		// Audit trail L123-22 : sans cette ligne, un refund finalisé hors action
		// admin n'a aucune trace dans OrderHistory (drift invisible, impossible à
		// expliquer à un audit TVA).
		await createOrderAuditTx(tx, {
			orderId,
			action: OrderAction.REFUND_COMPLETED,
			source,
			authorName,
			newPaymentStatus,
			note: auditNote,
			metadata: {
				refundId,
				refundAmount: refund.amount,
				totalRefunded,
				orderTotal: refund.order.total,
				...(auditMetadata ?? {}),
			},
		});

		return { isFullyRefunded };
	});

	if (!txResult) return FINALIZE_NOOP;

	const { isFullyRefunded } = txResult;

	// Tags : refund + commande (paymentStatus a bougé — CACHE-AUDIT-010, les DEUX
	// helpers composés).
	const tags = new Set<string>([
		...getRefundInvalidationTags(refundId, orderId),
		...getOrderInvalidationTags(orderId),
	]);

	// EINV-CREDIT-001 : avoir partiel (Art. 272-I). Idempotent (noop si déjà émis,
	// noop full-refund — l'avoir canonique vient alors de voidInvoice ci-dessous).
	const creditNoteResult = await issueCreditNoteForRefund({
		refundId,
		source,
		authorName,
	});
	if (creditNoteResult.kind === "failed") {
		logger.warn(
			`finalizeRefundCompletion — credit note emission failed for refund ${refundId}: ${creditNoteResult.error} (cron rattrapera)`,
			{ refundId },
		);
	}

	// Refund TOTAL → voidInvoice fallback (idempotent). Sans lui, l'avoir
	// d'annulation (Order.creditNoteNumber) dépendrait du seul webhook
	// charge.refunded — perdu en cas de double panne → facture stale (Art. 272-I).
	if (isFullyRefunded) {
		const invoiceState = await prisma.order.findUnique({
			where: { id: orderId },
			select: { invoiceStatus: true, invoiceNumber: true },
		});
		if (invoiceState?.invoiceStatus === InvoiceStatus.GENERATED && invoiceState.invoiceNumber) {
			const voided = await voidInvoice({
				orderId,
				authorName,
				source,
				reason: "Avoir émis suite à remboursement total (finalisation refund)",
			});
			if (voided.kind === "failed") {
				Sentry.withScope((scope) => {
					scope.setLevel("error");
					scope.setTag("invoicing", "void-invoice-failed");
					scope.setTag("source", "finalize-refund-completion");
					scope.setFingerprint(["void-invoice", "max-retries", orderId]);
					scope.setContext("order", { orderId, orderNumber });
					Sentry.captureMessage(
						"voidInvoice failed during refund finalization (full refund) — facture stale",
						"error",
					);
				});
			}
		}
	}

	// ORD-STRIPE-005 : émetteur centralisé — pose `Refund.confirmationEmailSentAt`
	// atomiquement, skip silencieux si un autre chemin a déjà envoyé. Destinataire :
	// le snapshot `customerEmail` (achat invité — la relation User est vide).
	if (refund.order.customerEmail) {
		const orderDetailsUrl = buildOrderTrackingUrl({ id: orderId, orderNumber });
		try {
			// Re-fetch post-émission : l'avoir vient d'être écrit — l'email doit
			// porter les numéros de pièces.
			const refundFacts = await prisma.refund.findUnique({
				where: { id: refundId },
				select: {
					creditNoteNumber: true,
					order: { select: { invoiceNumber: true, creditNoteNumber: true } },
				},
			});
			await sendRefundConfirmationOnce({
				refundId,
				to: refund.order.customerEmail,
				orderNumber,
				customerName: refund.order.customerName || "Client",
				refundAmount: refund.amount,
				reason: refund.reason,
				orderDetailsUrl,
				invoiceNumber: refundFacts?.order.invoiceNumber ?? null,
				creditNoteNumber:
					refundFacts?.creditNoteNumber ?? refundFacts?.order.creditNoteNumber ?? null,
			});
		} catch (emailError) {
			logger.error("Failed to send refund confirmation email after finalization", emailError, {
				refundId,
				orderNumber,
			});
			// Non-bloquant : refund finalisé en DB ; alerte Sentry, le cron retentera.
			captureRefundError(emailError, {
				action: "finalize-refund-completion-email",
				refundId,
				stripeRefundId: refund.stripeRefundId ?? undefined,
				orderId,
				orderNumber,
			});
		}
	}

	return { finalized: true, isFullyRefunded, tags: [...tags] };
}
