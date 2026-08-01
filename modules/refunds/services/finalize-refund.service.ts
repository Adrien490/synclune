import * as Sentry from "@sentry/nextjs";
import {
	type HistorySource,
	InvoiceStatus,
	OrderAction,
	PaymentStatus,
	RefundStatus,
	StockMovementSource,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { recordStockMovementTx } from "@/modules/skus/services/stock-movement.service";
import { shouldReactivateAfterRestock } from "@/modules/skus/services/restock-reactivation.service";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { buildOrderTrackingUrl } from "@/modules/orders/utils/build-order-tracking-url";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { collectStockInvalidationTags } from "@/modules/products/utils/cache.utils";
import { canTransition } from "./refund-state-machine.service";
import { issueCreditNoteForRefund } from "./issue-credit-note.service";
import { sendRefundConfirmationOnce } from "./send-refund-confirmation.service";
import { getRefundInvalidationTags } from "../constants/cache";
import { captureRefundError } from "../utils/capture-refund-error";

/**
 * Finalisation partagée d'un refund Stripe confirmé (`succeeded`) — service
 * transactionnel appelé depuis DEUX contextes non-Server-Action :
 *
 * - `reconcile-refunds` (cron DLQ) : refunds dont le SAGA `processRefund` Step 3
 *   a échoué après le succès Stripe ;
 * - `handleRefundUpdated` (webhook `refund.updated`) : refunds partis en
 *   `pending` chez Stripe (virement SEPA…), que `processRefund` laisse APPROVED
 *   en déléguant la finalisation à ce webhook.
 *
 * Historique (audit « Admin commandes » 2026-08-01, P1-C) : le webhook ne posait
 * que `status: COMPLETED` + `processedAt` — sans restock, sans avoir Art. 272-I,
 * sans email — et `processedAt` non nul excluait le refund à jamais du cron
 * (candidats `processedAt: null`). Cette machinerie vivait déjà, complète, en
 * privé dans `reconcile-refunds.service.ts` ; elle est extraite ici pour que les
 * deux chemins soient le MÊME code.
 *
 * ⚠️ L'appelant invalide les tags retournés avec l'API de SON contexte :
 * `revalidateTagsInBackground` (cron) ou tâche `INVALIDATE_CACHE` (webhook).
 * `updateTag` throw hors Server Action (E872) — ce service n'invalide rien
 * lui-même.
 */

export interface FinalizeRefundCompletionParams {
	refundId: string;
	source: HistorySource;
	authorId?: string | null;
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
	/** SKU dont l'inventory a réellement été incrémenté (restock=true + SKU vivant). */
	restockedSkuIds: string[];
	/** Tags de cache à invalider par l'appelant (refund + commande + stock). */
	tags: string[];
}

const FINALIZE_NOOP: FinalizeRefundCompletionResult = {
	finalized: false,
	isFullyRefunded: false,
	restockedSkuIds: [],
	tags: [],
};

export async function finalizeRefundCompletion(
	params: FinalizeRefundCompletionParams,
): Promise<FinalizeRefundCompletionResult> {
	const { refundId, source, authorId, authorName, auditNote, auditMetadata } = params;

	const refund = await prisma.refund.findUnique({
		where: { id: refundId, ...notDeleted },
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
	// Transaction atomique : claim COMPLETED + restock + paymentStatus + audit
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

		// Restock inventory pour les articles `restock=true`. Idempotent : seul le
		// chemin qui gagne le guard `status: APPROVED` ci-dessus exécute ce bloc
		// (process-refund Step 3, le cron DLQ et le webhook sont mutuellement
		// exclusifs). Coalesce par skuId (parité process-refund). Un SKU supprimé
		// entre la création du refund et la finalisation est skippé silencieusement.
		const refundItems = await tx.refundItem.findMany({
			where: { refundId, restock: true },
			select: { quantity: true, orderItem: { select: { skuId: true } } },
		});
		const restockBySkuId = new Map<string, number>();
		for (const ri of refundItems) {
			const skuId = ri.orderItem.skuId;
			if (skuId) {
				restockBySkuId.set(skuId, (restockBySkuId.get(skuId) ?? 0) + ri.quantity);
			}
		}
		const restockedSkuIds: string[] = [];
		if (restockBySkuId.size > 0) {
			// STOCK-LEDGER-001 : `UPDATE … RETURNING` remplace le couple
			// findMany-puis-update. Le journal `StockMovement` obtient un
			// `previousInventory` lu AU MOMENT de l'écriture, et le gate 0→N se
			// calcule sur la même vérité.
			// P1-1 : état AVANT crédit — discriminant de `shouldReactivateAfterRestock`.
			// On ne réactive que ce que la VENTE a désactivé (`inventory === 0`),
			// jamais un retrait manuel de l'admin.
			const skusBefore = await tx.productSku.findMany({
				where: { id: { in: [...restockBySkuId.keys()] } },
				select: { id: true, isActive: true, inventory: true },
			});
			const beforeById = new Map(skusBefore.map((s) => [s.id, s]));

			for (const [skuId, qty] of restockBySkuId) {
				const reactivate = shouldReactivateAfterRestock(beforeById.get(skuId));

				const updatedRows = await tx.$queryRaw<Array<{ inventory: number; productId: string }>>`
					UPDATE "ProductSku"
					SET "inventory" = "inventory" + ${qty},
					    "isActive" = CASE WHEN ${reactivate} THEN true ELSE "isActive" END,
					    "updatedAt" = NOW()
					WHERE "id" = ${skuId}
					RETURNING "inventory", "productId"
				`;

				const row = updatedRows[0];
				if (!row) continue; // SKU supprimé entre create et finalisation

				restockedSkuIds.push(skuId);
				await recordStockMovementTx(tx, {
					skuId,
					productId: row.productId,
					previousInventory: row.inventory - qty,
					newInventory: row.inventory,
					source: StockMovementSource.SYSTEM,
					reason: `Remboursement ${refundId}`,
				});
			}
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
			authorId: authorId ?? undefined,
			authorName,
			newPaymentStatus,
			note: auditNote,
			metadata: {
				refundId,
				refundAmount: refund.amount,
				totalRefunded,
				orderTotal: refund.order.total,
				restockedSkuCount: restockedSkuIds.length,
				...(auditMetadata ?? {}),
			},
		});

		return { isFullyRefunded, restockedSkuIds };
	});

	if (!txResult) return FINALIZE_NOOP;

	const { isFullyRefunded, restockedSkuIds } = txResult;

	// Tags : refund + commande (paymentStatus a bougé — CACHE-AUDIT-010, les DEUX
	// helpers composés) + stock plus bas.
	const tags = new Set<string>([
		...getRefundInvalidationTags(refundId, orderId),
		...getOrderInvalidationTags(orderId),
	]);

	// Tags inventaire/vitrine via la SSOT (STOCK-STALE-BASELINE-001). Itération
	// sur les ids demandés : un SKU hard-deleted garde son `SKU_STOCK` invalidé
	// (repli prévu par le helper).
	if (restockedSkuIds.length > 0) {
		const restockedSkus = await prisma.productSku.findMany({
			where: { id: { in: restockedSkuIds } },
			select: { id: true, productId: true, product: { select: { slug: true } } },
		});
		const productBySkuId = new Map(restockedSkus.map((sku) => [sku.id, sku]));
		for (const tag of collectStockInvalidationTags(
			restockedSkuIds.map((skuId) => ({
				skuId,
				productId: productBySkuId.get(skuId)?.productId ?? null,
				productSlug: productBySkuId.get(skuId)?.product.slug ?? null,
			})),
		)) {
			tags.add(tag);
		}
	}

	// EINV-CREDIT-001 : avoir partiel (Art. 272-I). Idempotent (noop si déjà émis,
	// noop full-refund — l'avoir canonique vient alors de voidInvoice ci-dessous).
	const creditNoteResult = await issueCreditNoteForRefund({
		refundId,
		source,
		authorId: authorId ?? undefined,
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
				authorId: authorId ?? null,
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

	return { finalized: true, isFullyRefunded, restockedSkuIds, tags: [...tags] };
}
