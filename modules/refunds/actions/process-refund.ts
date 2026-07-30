"use server";

import * as Sentry from "@sentry/nextjs";
import {
	HistorySource,
	OrderAction,
	PaymentStatus,
	type RefundReason,
	RefundStatus,
	StockMovementSource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { recordStockMovementTx } from "@/modules/skus/services/stock-movement.service";
import { shouldReactivateAfterRestock } from "@/modules/skus/services/restock-reactivation.service";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { after } from "next/server";

import { ORDERS_CACHE_TAGS, REFUNDS_CACHE_TAGS } from "../constants/cache";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";

import { sendRefundConfirmationOnce } from "@/modules/refunds/services/send-refund-confirmation.service";
import { SYSTEM_AUTHOR_ID } from "@/modules/webhooks/constants/webhook.constants";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { REFUND_ERROR_MESSAGES } from "../constants/refund.constants";
import { createStripeRefund } from "../lib/stripe-refund";
import { processRefundSchema } from "../schemas/refund.schemas";
import { captureRefundError } from "../utils/capture-refund-error";
import { issueCreditNoteForRefund } from "../services/issue-credit-note.service";
import { hasOpenDisputeTx } from "@/modules/orders/services/has-open-dispute.service";

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

			// ORD-STRIPE-007 : bloque si un dispute Stripe est ouvert sur la
			// commande. Sans ce guard, le refund admin + le chargeback Stripe
			// peuvent cumuler → double dépense côté merchant.
			if (await hasOpenDisputeTx(tx, refund.order_id)) {
				throw new Error("OPEN_DISPUTE");
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

			// ================================================================
			// P1-REVALIDATE (audit refunds 2026-05-30) — dernière barrière
			// anti double-remboursement, sous le FOR UPDATE de l'Order.
			//
			// `create-refund` valide quantités/montant À LA CRÉATION mais EXCLUT
			// les refunds FAILED du décompte. Un refund FAILED ré-armé via
			// `retryFailedRefund` (FAILED→APPROVED, sans re-validation) alors qu'un
			// autre refund a entre-temps consommé le budget du même orderItem peut
			// donc rembourser 2× le même article → perte cash + double avoir
			// A-YYYY. Aucune contrainte DB ne l'empêche
			// (`RefundItem.orderItemId` non `@unique`).
			// On re-valide ici, juste avant l'appel Stripe (dernier point avant
			// le mouvement d'argent), en ne comptant que les refunds ACTIFS
			// (PENDING/APPROVED/COMPLETED, hors soft-deleted) — ce refund inclus.
			const selfItems = await tx.refundItem.findMany({
				where: { refundId: id },
				select: { orderItemId: true, quantity: true },
			});
			const selfOrderItemIds = [...new Set(selfItems.map((ri) => ri.orderItemId))];

			if (selfOrderItemIds.length > 0) {
				const [orderedItems, activeRefundItems] = await Promise.all([
					tx.orderItem.findMany({
						where: { id: { in: selfOrderItemIds } },
						select: { id: true, quantity: true },
					}),
					tx.refundItem.findMany({
						where: {
							orderItemId: { in: selfOrderItemIds },
							refund: {
								status: {
									in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
								},
								deletedAt: null,
							},
						},
						select: { orderItemId: true, quantity: true },
					}),
				]);

				const orderedQtyById = new Map(orderedItems.map((oi) => [oi.id, oi.quantity]));
				const activeQtyById = new Map<string, number>();
				for (const ri of activeRefundItems) {
					activeQtyById.set(ri.orderItemId, (activeQtyById.get(ri.orderItemId) ?? 0) + ri.quantity);
				}
				for (const orderItemId of selfOrderItemIds) {
					if ((activeQtyById.get(orderItemId) ?? 0) > (orderedQtyById.get(orderItemId) ?? 0)) {
						throw new Error("ITEM_QUANTITY_EXCEEDS");
					}
				}
			}

			// Garde montant global : la somme des refunds ACTIFS (ce refund inclus)
			// ne doit jamais dépasser le total de la commande.
			const activeRefundsAgg = await tx.refund.aggregate({
				where: {
					orderId: refund.order_id,
					status: {
						in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
					},
					deletedAt: null,
				},
				_sum: { amount: true },
			});
			if ((activeRefundsAgg._sum.amount ?? 0) > refund.order_total) {
				throw new Error("AMOUNT_EXCEEDS_ORDER");
			}

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
			// IDEM-REFUND-001 : sur un retry (clé tournée), adopter un refund Stripe
			// déjà créé par une tentative dont la réponse a été perdue — sinon
			// double remboursement partiel réel. Le 1ᵉʳ essai (attempt_count=0)
			// skip la vérification : zéro latence ajoutée sur le chemin nominal.
			recoverExistingByMetadata: refundData.refund.attempt_count > 0,
		});

		// P0.1: Gérer les différents états de retour Stripe
		if (!stripeResult.success && !stripeResult.pending) {
			// Marquer le remboursement comme échoué avec la raison.
			// Guard `status: APPROVED` empêche un cancelRefund concurrent (qui a
			// passé le refund en CANCELLED entre Step 1 commit et l'appel Stripe)
			// d'être écrasé par FAILED.
			// Erreur transiente (rate limit, réseau — classifyStripeError) : un
			// retry admin a de bonnes chances d'aboutir. Le préfixe [transient]
			// dans failureReason oriente le tri des FAILED côté admin ; l'adoption
			// IDEM-REFUND-001 rend le retry sûr même si Stripe avait en fait créé
			// le refund.
			const baseFailureMessage = stripeResult.error ?? REFUND_ERROR_MESSAGES.STRIPE_ERROR;
			const failureMessage = stripeResult.retryable
				? `[transient] ${baseFailureMessage}`
				: baseFailureMessage;
			const failTxResult = await prisma.$transaction(async (tx) => {
				const updated = await tx.refund.updateMany({
					where: { id, status: RefundStatus.APPROVED },
					data: {
						status: RefundStatus.FAILED,
						failureReason: failureMessage,
						// IDEM-REFUND-001 : persister l'anchor quand Stripe a renvoyé un
						// refund (status failed/canceled) — traçabilité reconcile + la
						// tentative suivante sait qu'un objet Stripe existe déjà.
						...(stripeResult.refundId ? { stripeRefundId: stripeResult.refundId } : {}),
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
					{ refundId: id, stripeRefundId: stripeResult.refundId ?? undefined },
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
				message: stripeResult.retryable
					? `Erreur temporaire Stripe (${baseFailureMessage}). Réessayez le remboursement dans quelques instants.`
					: failureMessage,
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

		// État du stock AVANT restock — P1-1, discriminant de
		// `shouldReactivateAfterRestock` : on ne réactive que ce que la VENTE a
		// désactivé (`inventory === 0`), jamais un retrait manuel de l'admin
		// (`inventory > 0` + `isActive: false`).
		//
		// ⚠️ Rempli DANS la transaction (cf. plus bas), pas avant : lu hors-tx, ce
		// snapshot pouvait être périmé si un writer passait entre-temps — on
		// réactivait alors à tort, ou pas du tout.
		const preRestockInventory = new Map<
			string,
			{ inventory: number; productId: string; isActive: boolean }
		>();
		// P2.1: compteur réel mis à jour quand l'update réussit
		let actualRestockedCount = 0;
		// ORD-REFUND-AUDIT-001 : tracer les SKU manqués (catalogue refactor /
		// soft-delete entre create et process) pour audit forensic + alerte Sentry.
		let skippedRestocks: Array<{ skuId: string; qty: number }> = [];

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
				// ORD-REFUND-AUDIT-001 : tracer les SKU manqués pour audit + alerte
				// Sentry. Un SKU supprimé entre création refund et processing →
				// inventory ghost silencieux sans cette traçabilité.
				// STOCK-LEDGER-001 : chaque restock écrit son `StockMovement` (source
				// `SYSTEM` — remboursement, pas de saisie humaine d'inventaire) dans la
				// même transaction. `previousInventory` est dérivé du retour de l'UPDATE,
				// pas du snapshot `preRestockInventory` calculé HORS transaction plus haut
				// (celui-ci ne sert qu'au gate 0→N de la notif back-in-stock et peut être
				// périmé si un writer est passé entre-temps).
				// État pré-restock, lu DANS la transaction (cf. déclaration plus haut) :
				// alimente le gate 0→N ET la décision de réactivation.
				if (restockBySkuId.size > 0) {
					const rows = await tx.productSku.findMany({
						where: { id: { in: [...restockBySkuId.keys()] } },
						select: { id: true, inventory: true, productId: true, isActive: true },
					});
					for (const r of rows) {
						preRestockInventory.set(r.id, {
							inventory: r.inventory,
							productId: r.productId,
							isActive: r.isActive,
						});
					}
				}

				const restockResults = await Promise.all(
					Array.from(restockBySkuId.entries()).map(async ([skuId, qty]) => {
						let row: { inventory: number; productId: string } | undefined;
						// P1-1 : sans ça, rembourser la dernière unité recréditait le stock en
						// laissant le SKU `isActive: false` — invisible en vitrine, et la notif
						// back-in-stock ci-dessous pointait alors sur une PDP en 404.
						const reactivate = shouldReactivateAfterRestock(preRestockInventory.get(skuId));

						try {
							const updated = await tx.$queryRaw<Array<{ inventory: number; productId: string }>>`
								UPDATE "ProductSku"
								SET "inventory" = "inventory" + ${qty},
								    "isActive" = CASE WHEN ${reactivate} THEN true ELSE "isActive" END,
								    "updatedAt" = NOW()
								WHERE "id" = ${skuId}
								RETURNING "inventory", "productId"
							`;
							// SKU supprimé entre la création du refund et son traitement :
							// zéro ligne. Compté comme skipped (ORD-REFUND-AUDIT-001) — un
							// `update` Prisma levait P2025 ici, le raw ne lève pas.
							row = updated[0];
						} catch {
							return { skuId, qty, ok: false } as const;
						}

						if (!row) return { skuId, qty, ok: false } as const;

						// ⚠️ HORS du try : une écriture d'inventaire vient d'être appliquée.
						// Si le journal échoue, il faut que la transaction ENTIÈRE échoue —
						// pas qu'on rapporte « restock ignoré » alors que le stock a bougé.
						// C'est ce qu'un catch englobant produisait : il avalait aussi les
						// erreurs de programmation (un `StockMovementSource` undefined via un
						// mock partiel du client Prisma, par exemple) et les déguisait en
						// « SKU supprimé », état métier parfaitement plausible — donc
						// indétectable en test comme en production.
						await recordStockMovementTx(tx, {
							skuId,
							productId: row.productId,
							previousInventory: row.inventory - qty,
							newInventory: row.inventory,
							source: StockMovementSource.SYSTEM,
							reason: `Remboursement ${id}`,
						});

						return { skuId, qty, ok: true } as const;
					}),
				);
				skippedRestocks = restockResults
					.filter((r) => !r.ok)
					.map((s) => ({ skuId: s.skuId, qty: s.qty }));
				actualRestockedCount = restockResults.length - skippedRestocks.length;
				if (skippedRestocks.length > 0) {
					logger.warn(
						`Refund ${id} — ${skippedRestocks.length} SKU restock skipped (deleted SKUs)`,
						{ refundId: id, skipped: skippedRestocks },
					);
				}

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
				// ORD-REFUND-AUDIT-001 : metadata enrichie avec skippedRestocks pour
				// audit forensic (catalogue refactor, SKU archivé entre create et process).
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
						restockedSkuCount: actualRestockedCount,
						requestedRestockSkuCount: restockBySkuId.size,
						...(skippedRestocks.length > 0 && {
							skippedRestocks: skippedRestocks.map((s) => ({ skuId: s.skuId, qty: s.qty })),
						}),
					},
				});
			});

			// ORD-REFUND-AUDIT-001 : alerte Sentry pour rattrapage manuel admin.
			// Stock perdu silencieux (catalogue refactor, SKU archivé) — fingerprint
			// stable par refund + tag pour grouper dans Sentry Issues.
			if (skippedRestocks.length > 0) {
				Sentry.withScope((scope) => {
					scope.setLevel("warning");
					scope.setTag("refund-restock", "sku-missing");
					scope.setFingerprint(["refund-restock-skipped", id]);
					scope.setContext("refund", {
						refundId: id,
						orderId: refundData.refund.order_id,
						orderNumber: refundData.refund.order_number,
						skippedRestocks,
						restockedCount: actualRestockedCount,
					});
					Sentry.captureMessage(
						`Refund ${id} — ${skippedRestocks.length} SKU restock skipped (deleted SKUs)`,
						"warning",
					);
				});
			}

			// Invalider le cache commandes (paymentStatus a changé).
			// CACHE-AUDIT-010 : passer par le helper canonique pour couvrir aussi
			// DETAIL/HISTORY/CONFIRMATION(orderId) + USER_ORDERS_COUNT — une liste
			// manuelle laissait la page détail commande + historique stale jusqu'à
			// l'expiration du profil `user` (~10 min).
			getOrderInvalidationTags(
				refundData.refund.order_user_id ?? undefined,
				refundData.refund.order_id,
			).forEach((tag) => updateTag(tag));
			updateTag(REFUNDS_CACHE_TAGS.LIST);
			updateTag(REFUNDS_CACHE_TAGS.DETAIL(id));
			updateTag(ORDERS_CACHE_TAGS.REFUNDS(refundData.refund.order_id));

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

			// EINV-CREDIT-001 : émission avoir séquentiel sur le Refund (Art. 272-I CGI).
			// Best-effort hors transaction (advisory lock incompatible avec tx longue).
			// Idempotent (noop si déjà émis). NB : pour un refund total, voidInvoice()
			// est appelé séparément depuis cancel-order / mark-as-fully-refunded /
			// webhook charge.refunded — issue-credit-note couvre ici le cas du
			// refund partiel ou direct (admin) où aucun voidInvoice n'est déclenché.
			const creditNoteResult = await issueCreditNoteForRefund({
				refundId: id,
				source: HistorySource.ADMIN,
				authorId: adminUser.id,
				authorName: adminUser.name ?? adminUser.email,
			});
			if (creditNoteResult.kind === "failed") {
				logger.warn(
					`processRefund — credit note emission failed for refund ${id}: ${creditNoteResult.error} (cron rattrapera)`,
					{ refundId: id },
				);
			}

			// Envoyer l'email de confirmation au client (non bloquant)
			// Le webhook charge.refunded sert de filet de sécurité — la
			// déduplication côté email/Resend repose sur le refund_id via tag.
			if (refundData.refund.order_user_id) {
				// EINV-CREDIT-001 : on lit `Refund.creditNoteNumber` en priorité car
				// `issueCreditNoteForRefund` (appelé juste avant) écrit sur Refund —
				// pas sur Order. Pour un refund partiel, `Order.creditNoteNumber`
				// reste null (voidInvoice non déclenché), mais `Refund.creditNoteNumber`
				// porte l'avoir A-YYYY-NNNNN réellement émis.
				// Fallback `Order.creditNoteNumber` : refund total où voidInvoice a
				// déjà tourné côté webhook charge.refunded mais issueCreditNote a
				// raté ce refund spécifique (cas exotique rattrapé par cron).
				const [customerInfo, refundFacts] = await Promise.all([
					prisma.user.findUnique({
						where: { id: refundData.refund.order_user_id },
						select: { email: true, name: true },
					}),
					prisma.refund.findUnique({
						where: { id: refundData.refund.id },
						select: {
							creditNoteNumber: true,
							order: { select: { invoiceNumber: true, creditNoteNumber: true } },
						},
					}),
				]);

				if (customerInfo?.email) {
					const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(refundData.refund.order_id));
					const creditNoteNumber =
						refundFacts?.creditNoteNumber ?? refundFacts?.order.creditNoteNumber ?? null;
					const invoiceNumber = refundFacts?.order.invoiceNumber ?? null;

					// ORD-STRIPE-005 : émetteur centralisé qui pose
					// `Refund.confirmationEmailSentAt` atomiquement avant envoi.
					// Webhook + cron skip si déjà envoyé → plus de triple-email.
					// Awaité : un fire-and-forget serait tué au freeze serverless
					// post-réponse, potentiellement entre le claim et l'envoi.
					try {
						const emailResult = await sendRefundConfirmationOnce({
							refundId: refundData.refund.id,
							to: customerInfo.email,
							orderNumber: refundData.refund.order_number,
							customerName: customerInfo.name ?? "Client",
							refundAmount: refundData.refund.amount,
							// reason vient d'un raw query `r.reason::text` → cast en RefundReason
							// (les valeurs de la BDD sont garanties dans l'enum côté Prisma).
							reason: refundData.refund.reason as RefundReason,
							orderDetailsUrl,
							creditNoteNumber,
							invoiceNumber,
						});
						if (emailResult.reason === "send_failed") {
							await prisma.orderNote
								.create({
									data: {
										orderId: refundData.refund.order_id,
										content: `[EMAIL] Échec notification confirmation remboursement (commande ${refundData.refund.order_number}) — nouvel envoi tenté par le webhook ou le cron de réconciliation.`,
										authorId: SYSTEM_AUTHOR_ID,
										authorName: "Système (process-refund)",
									},
								})
								.catch(() => {});
						}
					} catch {
						// Échec inattendu (ex: claim DB) — non-bloquant, le refund est
						// finalisé ; le webhook/cron retentera l'envoi.
					}
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
				case "OPEN_DISPUTE":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.OPEN_DISPUTE,
					};
				// P1-REVALIDATE : la commande a déjà été (sur-)remboursée entre la
				// création et le traitement (refund FAILED ré-armé + budget consommé).
				case "ITEM_QUANTITY_EXCEEDS":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.QUANTITY_EXCEEDS_AVAILABLE,
					};
				case "AMOUNT_EXCEEDS_ORDER":
					return {
						status: ActionStatus.ERROR,
						message: REFUND_ERROR_MESSAGES.AMOUNT_EXCEEDS_ORDER,
					};
			}
		}
		return handleActionError(error, REFUND_ERROR_MESSAGES.PROCESS_FAILED);
	}
}
