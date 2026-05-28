"use server";

import {
	HistorySource,
	OrderAction,
	PaymentStatus,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";

import { ORDERS_CACHE_TAGS, REFUNDS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";

import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { recordRefundEReporting } from "@/modules/invoices/services/record-ereporting.service";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { createStripeRefund } from "../lib/stripe-refund";
import { processRefundSchema } from "../schemas/refund.schemas";
import { captureRefundError } from "../utils/capture-refund-error";

// Type pour le résultat de la query raw
type RefundLockRow = {
	id: string;
	status: string;
	amount: number;
	reason: string;
	attempt_count: number;
	order_id: string;
	order_number: string;
	order_total: number;
	order_user_id: string | null;
	order_currency: string | null;
	stripe_payment_intent_id: string | null;
};

type RefundItemRow = {
	id: string;
	quantity: number;
	restock: boolean;
	sku_id: string;
};

type CompletedRefundRow = {
	amount: number;
};

/**
 * Traite un remboursement approuvé via Stripe
 * Réservé aux administrateurs
 *
 * Pattern SAGA pour garantir la cohérence :
 * 1. Verrouillage atomique du remboursement (FOR UPDATE)
 * 2. Appel Stripe avec clé d'idempotence
 * 3. Mise à jour finale avec restauration stock
 *
 * Règles métier :
 * - Le remboursement doit être en statut APPROVED
 * - Appelle l'API Stripe pour créer le remboursement
 * - Restaure le stock (inventory) pour les articles avec restock=true
 * - Met à jour le paymentStatus de la commande à REFUNDED si remboursement total
 */
export async function processRefund(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;
		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.PROCESS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");

		const validated = validateInput(processRefundSchema, { id: rawId });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// ========================================================================
		// ÉTAPE 1: Verrouillage atomique et validation (FOR UPDATE)
		// Empêche les traitements concurrents du même remboursement
		// ========================================================================
		const refundData = await prisma.$transaction(async (tx) => {
			// Verrouiller le remboursement avec FOR UPDATE
			const refundRows = await tx.$queryRaw<RefundLockRow[]>`
				SELECT
					r.id,
					r.status::text,
					r.amount,
					r.reason::text,
					r."attemptCount" as attempt_count,
					o.id as order_id,
					o."orderNumber" as order_number,
					o.total as order_total,
					o."userId" as order_user_id,
					o.currency as order_currency,
					o."stripePaymentIntentId" as stripe_payment_intent_id
				FROM "Refund" r
				INNER JOIN "Order" o ON r."orderId" = o.id
				WHERE r.id = ${id}
				AND r."deletedAt" IS NULL
				FOR UPDATE OF r, o
			`;

			if (refundRows.length === 0) {
				throw new Error("NOT_FOUND");
			}

			const refund = refundRows[0];

			if (!refund) {
				throw new Error("NOT_FOUND");
			}

			// Vérifier le statut atomiquement
			if (refund.status === "COMPLETED") {
				throw new Error("ALREADY_PROCESSED");
			}
			if (refund.status !== "APPROVED") {
				throw new Error("NOT_APPROVED");
			}

			// Vérifier qu'on a un ID de paiement Stripe
			if (!refund.stripe_payment_intent_id) {
				throw new Error("NO_CHARGE_ID");
			}

			// Récupérer les items du remboursement
			const items = await tx.$queryRaw<RefundItemRow[]>`
				SELECT
					ri.id,
					ri.quantity,
					ri.restock,
					oi."skuId" as sku_id
				FROM "RefundItem" ri
				INNER JOIN "OrderItem" oi ON ri."orderItemId" = oi.id
				WHERE ri."refundId" = ${id}
			`;

			// Récupérer le total déjà remboursé
			const completedRefunds = await tx.$queryRaw<CompletedRefundRow[]>`
				SELECT amount
				FROM "Refund"
				WHERE "orderId" = ${refund.order_id}
					AND status = 'COMPLETED'::"RefundStatus"
					AND id != ${id}
			`;

			return {
				refund,
				items,
				totalRefundedBefore: completedRefunds.reduce((sum, r) => sum + r.amount, 0),
			};
		});

		// ========================================================================
		// ÉTAPE 2: Appel Stripe (hors transaction, avec idempotencyKey)
		// La clé d'idempotence garantit qu'un retry ne crée pas de doublon
		// ========================================================================
		// P0.2: rotation de la clé d'idempotence par tentative.
		// Stripe garde les réponses 4xx en cache 24h ; sans rotation, un
		// `retryFailedRefund` re-déclenchant `processRefund` renverrait la
		// réponse cachée (échec) au lieu d'effectuer un vrai retry.
		const stripeResult = await createStripeRefund({
			paymentIntentId: refundData.refund.stripe_payment_intent_id ?? undefined,
			amount: refundData.refund.amount,
			reason: refundData.refund.reason,
			metadata: {
				refund_id: refundData.refund.id,
				order_number: refundData.refund.order_number,
				order_id: refundData.refund.order_id,
			},
			idempotencyKey: `refund_${id}_${refundData.refund.attempt_count}`,
			// ORD-REFUND-008: skip retrieve PaymentIntent (devise déjà connue en DB)
			expectedCurrency: refundData.refund.order_currency ?? undefined,
		});

		// P0.1: Gérer les différents états de retour Stripe
		if (!stripeResult.success && !stripeResult.pending) {
			// Marquer le remboursement comme échoué avec la raison.
			// Guard `status: APPROVED` empêche un cancelRefund concurrent (qui a
			// passé le refund en CANCELLED entre Step 1 commit et l'appel Stripe)
			// d'être écrasé par FAILED.
			const failureMessage = stripeResult.error ?? REFUND_ERROR_MESSAGES.STRIPE_ERROR;
			const failTxResult = await prisma.$transaction(async (tx) => {
				const updated = await tx.refund.updateMany({
					where: { id, status: RefundStatus.APPROVED },
					data: {
						status: RefundStatus.FAILED,
						failureReason: failureMessage,
					},
				});
				if (updated.count > 0) {
					// ORD-REFUND-001: audit trail conformité L123-22
					await createOrderAuditTx(tx, {
						orderId: refundData.refund.order_id,
						action: OrderAction.REFUND_FAILED,
						source: HistorySource.ADMIN,
						authorId: adminUser.id,
						authorName: adminUser.name ?? adminUser.email,
						note: `Échec Stripe: ${failureMessage}`,
						metadata: {
							refundId: id,
							amount: refundData.refund.amount,
							reason: refundData.refund.reason,
							failureReason: failureMessage,
							stripeRefundId: stripeResult.refundId ?? null,
						},
					});
				}
				return updated.count;
			});
			if (failTxResult === 0) {
				logger.warn(
					`Refund ${id} no longer APPROVED — concurrent state change detected; skipping FAILED transition`,
					{ refundId: id, stripeRefundId: stripeResult.refundId ?? null },
				);
			}

			// Invalidate cache so UI reflects FAILED status
			updateTag(ORDERS_CACHE_TAGS.LIST);
			updateTag(REFUNDS_CACHE_TAGS.LIST);
			updateTag(REFUNDS_CACHE_TAGS.DETAIL(id));
			updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
			updateTag(ORDERS_CACHE_TAGS.REFUNDS(refundData.refund.order_id));
			if (refundData.refund.order_user_id) {
				updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(refundData.refund.order_user_id));
			}

			return {
				status: ActionStatus.ERROR,
				message: failureMessage,
			};
		}

		// P0.1: Si pending, garder APPROVED et attendre webhook refund.updated
		if (stripeResult.pending) {
			// Mettre à jour avec l'ID Stripe mais garder APPROVED (guard TOCTOU)
			await prisma.refund.updateMany({
				where: { id, status: RefundStatus.APPROVED },
				data: {
					stripeRefundId: stripeResult.refundId,
				},
			});

			// Cache invalidation + audit log même sur pending (UI doit refléter
			// l'attempt ; conformité Art. L123-22 trace toutes les tentatives).
			updateTag(REFUNDS_CACHE_TAGS.LIST);
			updateTag(REFUNDS_CACHE_TAGS.DETAIL(id));
			updateTag(ORDERS_CACHE_TAGS.REFUNDS(refundData.refund.order_id));

			return {
				status: ActionStatus.SUCCESS,
				message: `Remboursement de ${(refundData.refund.amount / 100).toFixed(2)} € soumis à Stripe (statut : EN ATTENTE). Le virement client sera finalisé automatiquement à réception de la confirmation Stripe.`,
				data: { stripeRefundId: stripeResult.refundId, pending: true },
			};
		}

		// ========================================================================
		// ÉTAPE 2.5: Persister le stripeRefundId AVANT la finalisation
		// Si Step 3 échoue, le cron reconciler pourra retrouver ce refund via stripeRefundId.
		// Guard `status: APPROVED` protège contre un cancelRefund concurrent.
		// ========================================================================
		await prisma.refund.updateMany({
			where: { id, status: RefundStatus.APPROVED },
			data: { stripeRefundId: stripeResult.refundId },
		});

		// ========================================================================
		// ÉTAPE 3: Finalisation (transaction atomique)
		// Met à jour le statut, restaure le stock, et update la commande
		// ========================================================================
		// P1.9: coalesce restocks par sku_id pour Promise.all parallèle (évite
		// timeout transaction quand refund avec 100 items).
		const restockBySkuId = new Map<string, number>();
		for (const item of refundData.items) {
			if (item.restock) {
				restockBySkuId.set(item.sku_id, (restockBySkuId.get(item.sku_id) ?? 0) + item.quantity);
			}
		}
		// P2.1: compteur réel mis à jour quand l'update réussit
		let actualRestockedCount = 0;

		try {
			await prisma.$transaction(async (tx) => {
				// 1. Mettre à jour le remboursement (guard TOCTOU)
				const updated = await tx.refund.updateMany({
					where: { id, status: RefundStatus.APPROVED },
					data: {
						status: RefundStatus.COMPLETED,
						stripeRefundId: stripeResult.refundId,
						processedAt: new Date(),
					},
				});
				if (updated.count === 0) {
					// Concurrent cancellation / external webhook already finalized.
					// Abort transaction — let the reconcile-refunds cron / webhook
					// path observe the real state.
					throw new Error("CONCURRENT_STATE_CHANGE");
				}

				// 2. Restaurer le stock pour les articles avec restock=true (parallèle)
				const restockResults = await Promise.all(
					Array.from(restockBySkuId.entries()).map(([skuId, qty]) =>
						tx.productSku
							.update({
								where: { id: skuId },
								data: { inventory: { increment: qty } },
							})
							.then(() => true)
							.catch(() => {
								// SKU may have been deleted between refund creation and processing
								logger.warn(`SKU ${skuId} not found, skipping restock`);
								return false;
							}),
					),
				);
				actualRestockedCount = restockResults.filter(Boolean).length;

				// 3. Calculer si la commande est totalement ou partiellement remboursée
				const totalRefundedAfter = refundData.totalRefundedBefore + refundData.refund.amount;

				// Mettre à jour le paymentStatus selon le montant remboursé
				let newPaymentStatus: PaymentStatus | undefined;
				if (totalRefundedAfter >= refundData.refund.order_total) {
					newPaymentStatus = PaymentStatus.REFUNDED;
					await tx.order.update({
						where: { id: refundData.refund.order_id },
						data: { paymentStatus: PaymentStatus.REFUNDED },
					});
				} else if (totalRefundedAfter > 0) {
					newPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
					await tx.order.update({
						where: { id: refundData.refund.order_id },
						data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
					});
				}

				// ORD-REFUND-001: audit trail conformité L123-22
				await createOrderAuditTx(tx, {
					orderId: refundData.refund.order_id,
					action: OrderAction.REFUND_COMPLETED,
					source: HistorySource.ADMIN,
					authorId: adminUser.id,
					authorName: adminUser.name ?? adminUser.email,
					newPaymentStatus,
					note: `Remboursement Stripe traité avec succès`,
					metadata: {
						refundId: id,
						amount: refundData.refund.amount,
						reason: refundData.refund.reason,
						stripeRefundId: stripeResult.refundId,
						totalRefunded: totalRefundedAfter,
						orderTotal: refundData.refund.order_total,
						restockedSkuCount: restockBySkuId.size,
					},
				});
			});

			// Invalider le cache commandes et badges (paymentStatus a changé)
			updateTag(ORDERS_CACHE_TAGS.LIST);
			updateTag(REFUNDS_CACHE_TAGS.LIST);
			updateTag(REFUNDS_CACHE_TAGS.DETAIL(id));
			updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
			updateTag(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
			updateTag(ORDERS_CACHE_TAGS.REFUNDS(refundData.refund.order_id));

			// Invalider le cache user (commandes, stats)
			if (refundData.refund.order_user_id) {
				updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(refundData.refund.order_user_id));
				updateTag(ORDERS_CACHE_TAGS.LAST_ORDER(refundData.refund.order_user_id));
				updateTag(ORDERS_CACHE_TAGS.ACCOUNT_STATS(refundData.refund.order_user_id));
			}

			// Invalider le cache d'inventaire et vitrine si des articles ont été restockés.
			// On utilise actualRestockedCount (P2.1) pour distinguer "demandé" vs "réussi"
			// (SKU peuvent avoir été supprimés entre creation refund et processing).
			const restockedSkuIds = Array.from(restockBySkuId.keys());
			if (actualRestockedCount > 0 && restockedSkuIds.length > 0) {
				updateTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);

				// Invalidate storefront SKU stock and product caches
				for (const skuId of restockedSkuIds) {
					updateTag(PRODUCTS_CACHE_TAGS.SKU_STOCK(skuId));
				}

				// Fetch product info for restocked SKUs to invalidate product-level caches
				const restockedSkus = await prisma.productSku.findMany({
					where: { id: { in: restockedSkuIds } },
					select: { productId: true, product: { select: { slug: true } } },
				});
				const uniqueProductIds = [...new Set(restockedSkus.map((s) => s.productId))];
				const uniqueSlugs = [...new Set(restockedSkus.map((s) => s.product.slug))];
				for (const productId of uniqueProductIds) {
					updateTag(PRODUCTS_CACHE_TAGS.SKUS(productId));
				}
				for (const slug of uniqueSlugs) {
					updateTag(PRODUCTS_CACHE_TAGS.DETAIL(slug));
				}
			}
			// Audit log

			// E-reporting B2C (Phase 4, EINV-AUDIT-004) — feature-flagged,
			// idempotent + best-effort. Crée la transaction REFUND avec amount
			// négatif pour la transmission DGFiP périodique. Ne bloque jamais le
			// process-refund : un échec ici est rattrapable via le reconcile cron.
			await recordRefundEReporting(id);

			// Envoyer l'email de confirmation au client (non bloquant)
			// Le webhook charge.refunded sert de filet de sécurité — la
			// déduplication côté email/Resend repose sur le refund_id via tag.
			if (refundData.refund.order_user_id) {
				const customerInfo = await prisma.user.findUnique({
					where: { id: refundData.refund.order_user_id },
					select: { email: true, name: true },
				});

				if (customerInfo?.email) {
					const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(refundData.refund.order_id));

					sendRefundConfirmationEmail({
						to: customerInfo.email,
						orderNumber: refundData.refund.order_number,
						customerName: customerInfo.name ?? "Client",
						refundAmount: refundData.refund.amount,
						reason: refundData.refund.reason,
						orderDetailsUrl,
						// ORD-STRIPE-008 : dedup Resend 24h sur double-clic admin
						// ou retry. `attempt_count` rotation pour les vrais retries
						// après un échec Resend (besoin nouveau call).
						idempotencyKey: `refund-confirm-${refundData.refund.id}-${refundData.refund.attempt_count}`,
					}).catch((emailError) => {
						prisma.orderNote
							.create({
								data: {
									orderId: refundData.refund.order_id,
									content: `[EMAIL] Échec notification confirmation remboursement (commande ${refundData.refund.order_number}) : ${emailError instanceof Error ? emailError.message : String(emailError)}`,
									authorId: "system",
									authorName: "Système (process-refund)",
								},
							})
							.catch(() => {});
					});
				}
			}

			const restockMessage =
				actualRestockedCount > 0 ? ` Stock restauré pour ${actualRestockedCount} article(s).` : "";

			return {
				status: ActionStatus.SUCCESS,
				message: `Remboursement de ${(refundData.refund.amount / 100).toFixed(2)} € traité avec succès.${restockMessage}`,
				data: { stripeRefundId: stripeResult.refundId },
			};
		} catch (step3Error) {
			// SAGA compensation: Stripe refund succeeded but DB finalization failed.
			// The stripeRefundId was already persisted in Step 2.5, so the cron
			// reconciler will pick this up and finalize it.
			const isConcurrent =
				step3Error instanceof Error && step3Error.message === "CONCURRENT_STATE_CHANGE";

			// ORD-STRIPE-010 : si la race vient d'un webhook concurrent qui a
			// déjà finalisé le refund (status=COMPLETED + processedAt!=null),
			// le warning UI est trompeur — la finalisation est en réalité OK.
			// Avec [[ORD-STRIPE-002]] le webhook skip désormais quand le SAGA
			// est en cours, donc cette branche ne devrait être atteinte que
			// pour les races vraiment edge (admin cancelRefund concurrent).
			// On re-fetch pour distinguer les deux cas.
			if (isConcurrent) {
				const current = await prisma.refund.findUnique({
					where: { id },
					select: { status: true, processedAt: true },
				});
				if (current?.status === RefundStatus.COMPLETED && current.processedAt !== null) {
					logger.info("SAGA Step 3 race: refund already finalized by concurrent webhook", {
						refundId: id,
						stripeRefundId: stripeResult.refundId,
						orderId: refundData.refund.order_id,
					});
					return {
						status: ActionStatus.SUCCESS,
						message: `Remboursement de ${(refundData.refund.amount / 100).toFixed(2)} € traité avec succès.`,
						data: { stripeRefundId: stripeResult.refundId },
					};
				}
			}

			logger.error(
				isConcurrent
					? "SAGA Step 3 aborted: refund no longer APPROVED (concurrent state change)"
					: "SAGA Step 3 failed: Stripe refund succeeded but DB finalization failed",
				step3Error,
				{
					refundId: id,
					stripeRefundId: stripeResult.refundId,
					orderId: refundData.refund.order_id,
					amount: refundData.refund.amount,
				},
			);
			captureRefundError(step3Error, {
				action: "processRefund",
				step: isConcurrent ? "step3-concurrent-state-change" : "step3-finalize",
				refundId: id,
				stripeRefundId: stripeResult.refundId,
				orderId: refundData.refund.order_id,
				orderNumber: refundData.refund.order_number,
				amount: refundData.refund.amount,
			});
			return {
				status: ActionStatus.WARNING,
				message:
					"Remboursement Stripe confirmé, finalisation en base échouée. La réconciliation automatique synchronisera l'état dans les prochaines heures.",
				data: { stripeRefundId: stripeResult.refundId, pendingReconciliation: true },
			};
		}
	} catch (error) {
		// Handle business errors from the Step 1 transaction
		if (error instanceof Error) {
			switch (error.message) {
				case "NOT_FOUND":
					return {
						status: ActionStatus.NOT_FOUND,
						message: REFUND_ERROR_MESSAGES.NOT_FOUND,
					};
				case "ALREADY_PROCESSED":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.ALREADY_PROCESSED,
					};
				case "NOT_APPROVED":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.NOT_APPROVED,
					};
				case "NO_CHARGE_ID":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.NO_CHARGE_ID,
					};
			}
		}
		return handleActionError(error, REFUND_ERROR_MESSAGES.PROCESS_FAILED);
	}
}
