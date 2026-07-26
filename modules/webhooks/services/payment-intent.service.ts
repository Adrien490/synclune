import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import {
	// IDEM-AUTOREFUND-001 : import VALEUR (et non `type`) — `Prisma.PrismaClientKnownRequestError`
	// est utilisé en `instanceof` pour discriminer le P2002 du lien stripeRefundId.
	Prisma,
	HistorySource,
	OrderAction,
	RefundReason,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import type { StockChangedSku } from "@/modules/products/utils/cache.utils";
import { sendAdminRefundFailedAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { releaseOrderDiscountUsageTx } from "@/modules/discounts/services/release-order-discount-usage.service";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";
import type { PaymentFailureDetails } from "../types/webhook.types";

/**
 * Préfixe de note posé sur tout Refund auto (oversell / amount mismatch /
 * payment_canceled / orphan). Exporté pour que le cron `reconcile-refunds` puisse
 * repêcher les auto-refunds dont la *création* Stripe a échoué (AM-1) :
 * ils restent en APPROVED + `stripeRefundId IS NULL` et ne sont sinon
 * jamais retentés (le filet existant exige `stripeRefundId NOT NULL`).
 * ⚠️ Valeur historique à NE PAS changer (les lookups d'idempotence `startsWith`
 * matchent les Refund existants en base) — le libellé mentionne payment_failed
 * mais ce handler n'initie plus de refund depuis l'audit 2026-07-02.
 */
export const AUTO_REFUND_NOTE_PREFIX = "Auto-refund payment_failed webhook";

// Re-export types for backwards compatibility
export type { PaymentFailureDetails };

/**
 * Extrait les détails d'échec d'un PaymentIntent
 */
export function extractPaymentFailureDetails(
	paymentIntent: Stripe.PaymentIntent,
): PaymentFailureDetails {
	const lastError = paymentIntent.last_payment_error;
	return {
		code: lastError?.code ?? null,
		declineCode: lastError?.decline_code ?? null,
		message: lastError?.message ?? null,
	};
}

/**
 * Restaure le stock pour une commande dont le paiement a échoué.
 *
 * ⚠️ IDEM-STOCK-002 (audit idempotence 2026-07-26) — CETTE FONCTION N'EST PAS
 * AUTO-IDEMPOTENTE. Elle lit `status`/`paymentStatus` puis incrémente `inventory`
 * sans advisory lock, sans claim conditionnel, et **sans muter l'état qu'elle vient
 * de lire** : rien ne rend un 2ᵉ passage no-op. Deux exécutions rejouées ou
 * concurrentes restockent donc deux fois.
 *
 * L'idempotence est portée par l'APPELANT, qui doit avoir gagné une transition
 * d'état AVANT d'appeler. Unique appelant : `sync-async-payments.service.ts`, gardé
 * par `markOrderAsFailed().transitioned` (claim `updateMany` conditionnel).
 * Le chemin webhook `payment_intent.canceled` n'utilise plus cette fonction : son
 * restock est inliné dans la transaction du claim CANCELLED (IDEM-CANCEL-002).
 *
 * → Tout nouvel appel doit être précédé d'un claim gagnant. À défaut, inliner le
 *   restock dans la transaction du claim comme le fait `markOrderAsCancelled`.
 */
export async function restoreStockForOrder(orderId: string): Promise<{
	shouldRestore: boolean;
	itemCount: number;
	// CACHE-CATALOG-002 : produit inclus pour invalider la page vitrine
	// (collectStockInvalidationTags), pas seulement SKU_STOCK.
	restoredSkus: StockChangedSku[];
	// CACHE-AUDIT-002 : exposé pour que le handler invalide les tags user-scopés
	// (USER_ORDERS, LAST_ORDER…) via getOrderInvalidationTags sans re-fetch.
	userId: string | null;
}> {
	// NB : tout est dans une transaction pour l'ATOMICITÉ du batch de restock (tout ou
	// rien). Cela ne confère AUCUNE protection contre un double restock — en READ
	// COMMITTED deux transactions concurrentes lisent le même état initial et
	// incrémentent chacune. Cf. le contrat d'appel documenté sur la signature.
	return prisma.$transaction(
		async (tx) => {
			const order = await tx.order.findFirst({
				where: { id: orderId, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					userId: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
							sku: { select: { product: { select: { id: true, slug: true } } } },
						},
					},
				},
			});

			if (!order) {
				logger.error(`[WEBHOOK] Order ${orderId} not found for stock restoration`, undefined, {
					service: "webhook",
				});
				return { shouldRestore: false, itemCount: 0, restoredSkus: [], userId: null };
			}

			// Only restore if stock was decremented (PROCESSING status = payment had succeeded)
			const shouldRestore = order.status === "PROCESSING" || order.paymentStatus === "PAID";

			if (!shouldRestore || order.items.length === 0) {
				return { shouldRestore: false, itemCount: 0, restoredSkus: [], userId: order.userId };
			}

			// Group quantities by skuId in case multiple items share the same SKU
			const stockUpdates = new Map<string, number>();
			for (const item of order.items) {
				const current = stockUpdates.get(item.skuId) ?? 0;
				stockUpdates.set(item.skuId, current + item.quantity);
			}

			// Fetch current SKU states to determine if reactivation is appropriate
			const skuIds = Array.from(stockUpdates.keys());
			const skus = await tx.productSku.findMany({
				where: { id: { in: skuIds } },
				select: { id: true, inventory: true, isActive: true },
			});
			const skuMap = new Map(skus.map((s) => [s.id, s]));

			await Promise.all(
				Array.from(stockUpdates.entries()).map(([skuId, quantity]) => {
					const sku = skuMap.get(skuId);
					// Only reactivate if the SKU was auto-deactivated (inventory === 0 and inactive)
					// Don't reactivate SKUs that were manually deactivated by admin (inventory > 0 but inactive)
					const shouldReactivate = sku && !sku.isActive && sku.inventory === 0;

					return tx.productSku.update({
						where: { id: skuId },
						data: {
							inventory: { increment: quantity },
							...(shouldReactivate && { isActive: true }),
						},
					});
				}),
			);

			logger.info(
				`[WEBHOOK] Stock restored for ${order.items.length} items on order ${order.orderNumber}`,
				{ service: "webhook" },
			);
			const productBySkuId = new Map(order.items.map((item) => [item.skuId, item.sku.product]));
			return {
				shouldRestore: true,
				itemCount: order.items.length,
				restoredSkus: skuIds.map((skuId) => ({
					skuId,
					productId: productBySkuId.get(skuId)?.id,
					productSlug: productBySkuId.get(skuId)?.slug,
				})),
				userId: order.userId,
			};
		},
		// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}

/**
 * Met à jour une commande comme échouée avec les détails d'erreur
 * Idempotent: if the order is already FAILED, the operation is skipped.
 *
 * Garde anti-rétrogradation (audit webhooks 2026-07-02, F1) : la transition n'est
 * autorisée QUE depuis PENDING/EXPIRED, via un `updateMany` conditionnel dont le
 * prédicat est ré-évalué au lock de ligne — un `findFirst` + `update` inconditionnel
 * laissait une fenêtre read-committed où un `payment_intent.succeeded` concurrent
 * commitait PAID entre la lecture et l'écriture, rétrogradant une commande payée
 * (restock fantôme + discount libéré + client débité sans commande). Une tentative
 * PAID→FAILED bloquée remonte en Sentry warning : ce chemin ne doit jamais se
 * produire (bug appelant ou race à investiguer).
 *
 * Libère également le code promo attaché (cf [[CHECKOUT-AUDIT-001]]) : décrémente
 * `Discount.usageCount` et supprime les `DiscountUsage` orphelines, sinon le
 * compteur dérive à chaque paiement échoué.
 *
 * @returns `transitioned: false` si la commande était déjà FAILED (idempotence),
 *   introuvable, ou dans un état protégé (PAID/REFUNDED/PARTIALLY_REFUNDED).
 */
export async function markOrderAsFailed(
	orderId: string,
	paymentIntentId: string,
	failureDetails: PaymentFailureDetails,
): Promise<{ transitioned: boolean }> {
	const txResult = await prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			const order = await tx.order.findFirst({
				where: { id: orderId, ...notDeleted },
				select: { status: true, paymentStatus: true },
			});

			if (!order) {
				logger.error(`❌ [WEBHOOK] Order ${orderId} not found in markOrderAsFailed`, undefined, {
					service: "webhook",
				});
				return { transitioned: false, blockedStatus: null, releasedDiscountIds: [] as string[] };
			}

			if (order.paymentStatus === "FAILED") {
				logger.info(`⏭️ [WEBHOOK] Order ${orderId} already marked as FAILED, skipping`, {
					service: "webhook",
				});
				return { transitioned: false, blockedStatus: null, releasedDiscountIds: [] as string[] };
			}

			const updated = await tx.order.updateMany({
				where: {
					id: orderId,
					paymentStatus: { in: ["PENDING", "EXPIRED"] },
					...notDeleted,
				},
				data: {
					paymentStatus: "FAILED",
					status: "CANCELLED",
					stripePaymentIntentId: paymentIntentId,
					paymentFailureCode: failureDetails.code,
					paymentDeclineCode: failureDetails.declineCode,
					paymentFailureMessage: failureDetails.message,
				},
			});

			if (updated.count === 0) {
				// Le snapshot n'était ni FAILED ni introuvable, mais le prédicat a refusé
				// l'écriture : état protégé (PAID/REFUNDED/…) — snapshot ou concurrent.
				const fresh = await tx.order.findFirst({
					where: { id: orderId, ...notDeleted },
					select: { paymentStatus: true },
				});
				return {
					transitioned: false,
					blockedStatus: fresh?.paymentStatus ?? order.paymentStatus,
					releasedDiscountIds: [] as string[],
				};
			}

			const discountIds = await releaseOrderDiscountUsageTx(tx, orderId);

			await createOrderAuditTx(tx, {
				orderId,
				action: OrderAction.CANCELLED,
				previousStatus: order.status,
				newStatus: "CANCELLED",
				previousPaymentStatus: order.paymentStatus,
				newPaymentStatus: "FAILED",
				authorName: "Stripe",
				source: HistorySource.WEBHOOK,
				metadata: {
					paymentIntentId,
					failureCode: failureDetails.code,
					declineCode: failureDetails.declineCode,
					failureMessage: failureDetails.message,
					releasedDiscountsCount: discountIds.length,
				},
			});

			logger.info(`❌ [WEBHOOK] Order ${orderId} marked as FAILED`, { service: "webhook" });
			return { transitioned: true, blockedStatus: null, releasedDiscountIds: discountIds };
		},
		// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	if (txResult.blockedStatus) {
		logger.warn(
			`⚠️ [WEBHOOK] Blocked ${txResult.blockedStatus}→FAILED transition on order ${orderId} — protected state, skipping`,
			{ service: "webhook", orderId, paymentIntentId },
		);
		Sentry.withScope((scope) => {
			scope.setTag("webhookHandler", "markOrderAsFailed");
			scope.setTag("orderId", orderId);
			scope.setTag("paymentIntentId", paymentIntentId);
			scope.setLevel("warning");
			scope.setFingerprint(["webhook", "markOrderAsFailed", "blocked-transition"]);
			Sentry.captureMessage(
				`Attempted ${txResult.blockedStatus}→FAILED transition blocked (order ${orderId})`,
			);
		});
	}

	for (const discountId of txResult.releasedDiscountIds) {
		updateTag(DISCOUNT_CACHE_TAGS.USAGE(discountId));
	}

	return { transitioned: txResult.transitioned };
}

/**
 * Marque une commande comme annulée et restaure le stock dans la MÊME transaction.
 * Idempotent: if the order is already CANCELLED with FAILED payment, the operation is skipped.
 *
 * IDEM-CANCEL-002 (audit idempotence 2026-07-02) : le restock était auparavant
 * une transaction SÉPARÉE (`restoreStockForOrder`) committée AVANT celle-ci —
 * un crash entre les deux laissait l'event webhook en PROCESSING, repassé
 * FAILED par le cron retry-webhooks, dont le re-dispatch relisait un order
 * toujours PROCESSING → inventaire ré-incrémenté une 2ᵉ fois. Le restock est
 * désormais conditionné au GAIN du claim CANCELLED (updateMany conditionnel)
 * et atomique avec lui : un rejeu perd le claim → aucun double restock.
 * Conséquence assumée : une commande au paiement protégé (PAID/REFUNDED/…)
 * bloque le claim ET le restock (l'ancien code restockait sans annuler —
 * état incohérent ; Stripe ne peut de toute façon pas émettre
 * `payment_intent.canceled` sur un PI succeeded).
 *
 * Libère également le code promo attaché (cf [[CHECKOUT-AUDIT-001]]).
 */
export async function markOrderAsCancelled(
	orderId: string,
	paymentIntentId: string,
): Promise<{ restoredSkus: StockChangedSku[]; userId: string | null }> {
	const txResult = await prisma.$transaction(
		async (tx: Prisma.TransactionClient) => {
			const order = await tx.order.findFirst({
				where: { id: orderId, ...notDeleted },
				select: {
					status: true,
					paymentStatus: true,
					userId: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
							sku: { select: { product: { select: { id: true, slug: true } } } },
						},
					},
				},
			});

			if (!order) {
				logger.error(`❌ [WEBHOOK] Order ${orderId} not found in markOrderAsCancelled`, undefined, {
					service: "webhook",
				});
				return { releasedDiscountIds: [], restoredSkus: [], userId: null };
			}

			if (order.status === "CANCELLED" && order.paymentStatus === "FAILED") {
				logger.info(
					`⏭️ [WEBHOOK] Order ${orderId} already CANCELLED with FAILED payment, skipping`,
					{ service: "webhook" },
				);
				return { releasedDiscountIds: [], restoredSkus: [], userId: order.userId };
			}

			// Garde anti-rétrogradation (audit webhooks 2026-07-02, symétrique de
			// markOrderAsFailed) : Stripe ne peut pas émettre `payment_intent.canceled`
			// sur un PI succeeded, mais le prédicat conditionnel ferme la même fenêtre
			// read-committed pour zéro coût.
			const updated = await tx.order.updateMany({
				where: {
					id: orderId,
					paymentStatus: { notIn: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] },
					// IDEM-CANCEL-003 (audit idempotence 2026-07-26) : rend le claim
					// SINGLE-WINNER. Sans cette clause, l'état posé par le gagnant
					// (CANCELLED/FAILED) satisfaisait encore le prédicat → un second passage
					// concurrent regagnait le claim et restockait une 2ᵉ fois, puisque
					// `shouldRestore` dérive du snapshot PRÉ-claim (lu avant le commit du
					// gagnant). Combinaison d'états aujourd'hui improbable en pratique, mais
					// le commentaire du contrat promettait déjà cette garantie.
					status: { not: "CANCELLED" },
					...notDeleted,
				},
				data: {
					status: "CANCELLED",
					paymentStatus: "FAILED",
					stripePaymentIntentId: paymentIntentId,
				},
			});

			if (updated.count === 0) {
				logger.warn(
					`⚠️ [WEBHOOK] Blocked CANCELLED transition on order ${orderId} — protected payment state, skipping`,
					{ service: "webhook", orderId, paymentIntentId },
				);
				return { releasedDiscountIds: [], restoredSkus: [], userId: order.userId };
			}

			// IDEM-CANCEL-002 : restock atomique avec le claim CANCELLED (état
			// PRÉ-claim : PROCESSING = le paiement avait abouti, stock décrémenté).
			// Groupé par skuId (plusieurs items peuvent partager un SKU) ; on ne
			// réactive un SKU inactif que s'il avait été auto-désactivé (inventory=0),
			// jamais un SKU désactivé manuellement par l'admin (inventory>0).
			const shouldRestore =
				(order.status === "PROCESSING" || order.paymentStatus === "PAID") && order.items.length > 0;
			let restoredSkus: StockChangedSku[] = [];
			if (shouldRestore) {
				const stockUpdates = new Map<string, number>();
				for (const item of order.items) {
					stockUpdates.set(item.skuId, (stockUpdates.get(item.skuId) ?? 0) + item.quantity);
				}
				const skuIds = Array.from(stockUpdates.keys());
				const skus = await tx.productSku.findMany({
					where: { id: { in: skuIds } },
					select: { id: true, inventory: true, isActive: true },
				});
				const skuMap = new Map(skus.map((s) => [s.id, s]));
				await Promise.all(
					Array.from(stockUpdates.entries()).map(([skuId, quantity]) => {
						const sku = skuMap.get(skuId);
						const shouldReactivate = sku && !sku.isActive && sku.inventory === 0;
						return tx.productSku.update({
							where: { id: skuId },
							data: {
								inventory: { increment: quantity },
								...(shouldReactivate && { isActive: true }),
							},
						});
					}),
				);
				const productBySkuId = new Map(order.items.map((item) => [item.skuId, item.sku.product]));
				restoredSkus = skuIds.map((skuId) => ({
					skuId,
					productId: productBySkuId.get(skuId)?.id,
					productSlug: productBySkuId.get(skuId)?.slug,
				}));
				logger.info(
					`[WEBHOOK] Stock restored for ${order.items.length} items on cancelled order ${orderId}`,
					{ service: "webhook" },
				);
			}

			const discountIds = await releaseOrderDiscountUsageTx(tx, orderId);

			await createOrderAuditTx(tx, {
				orderId,
				action: OrderAction.CANCELLED,
				previousStatus: order.status,
				newStatus: "CANCELLED",
				previousPaymentStatus: order.paymentStatus,
				newPaymentStatus: "FAILED",
				authorName: "Stripe",
				source: HistorySource.WEBHOOK,
				metadata: {
					paymentIntentId,
					reason: "payment_intent.canceled",
					releasedDiscountsCount: discountIds.length,
					restoredSkuCount: restoredSkus.length,
				},
			});

			logger.info(`❌ [WEBHOOK] Order ${orderId} marked as CANCELLED`, { service: "webhook" });
			return { releasedDiscountIds: discountIds, restoredSkus, userId: order.userId };
		},
		// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);

	for (const discountId of txResult.releasedDiscountIds) {
		updateTag(DISCOUNT_CACHE_TAGS.USAGE(discountId));
	}

	return { restoredSkus: txResult.restoredSkus, userId: txResult.userId };
}

/**
 * Initie un remboursement automatique via Stripe.
 *
 * ORD-BIZ-002 : crée un `Refund` local APPROVED (avec `RefundItems` couvrant
 * tous les OrderItem, `restock=false` car le stock n'a jamais été décrémenté
 * sur ces chemins — oversell/mismatch throw avant décrément — ou est restauré
 * séparément par `restoreStockForOrder` sur `payment_intent.canceled`) AVANT
 * l'appel Stripe.
 * `metadata.refund_id = localRefund.id` permet au webhook `charge.refunded`
 * de matcher via la branche `linkRefund` (et non `upsertDashboard`), donc
 * d'éviter la perte de traçabilité items côté DB.
 *
 * Idempotent : si un Refund auto a déjà été créé pour cet ordre + paymentIntent,
 * on le re-utilise (la clé d'idempotence Stripe garantit le même `re_*` Stripe).
 *
 * Audit F2 (2026-07-02) : `amountReceivedCents` = `pi.amount_received`. L'appel
 * Stripe ci-dessous n'envoie pas de `amount` → Stripe rembourse le montant
 * réellement capturé. Le Refund local doit refléter ce même montant, sinon en
 * sous-facturation (`AmountMismatchError`, amount_received < order.total) la
 * compta interne — et le flux e-reporting REFUND câblé sur les Refund —
 * sur-évaluerait le remboursement. Fallback `order.total` pour les callers
 * legacy sans PI sous la main (reconcile-refunds).
 */
export async function initiateAutomaticRefund(
	paymentIntentId: string,
	orderId: string,
	reason: string,
	amountReceivedCents?: number,
): Promise<{ success: boolean; refundId?: string; error?: Error }> {
	try {
		const localRefund = await prisma.$transaction(
			async (tx) => {
				// IDEM-AUTOREFUND-001 (audit idempotence 2026-07-26) : la garde de doublon
				// est un `findFirst` sur préfixe de note, sans contrainte d'unicité adossée.
				// En READ COMMITTED elle ne voit pas la ligne non-commitée d'une exécution
				// concurrente → deux appels parallèles créaient 2 `Refund` locaux pour UN
				// seul `re_*` Stripe (la clé d'idempotence, elle, est stable). Séquelles :
				// P2002 sur le lien, orphelin APPROVED qui gonfle `alreadyRefunded` et
				// boucle dans la DLQ `reconcile-refunds` jusqu'à une fausse alerte
				// « remboursement manuel requis ». On sérialise sur la ligne Order pour
				// rendre la garde autoritative (même technique que IDEM-DISPUTE-001).
				await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

				const existing = await tx.refund.findFirst({
					where: {
						orderId,
						note: { startsWith: AUTO_REFUND_NOTE_PREFIX },
						status: { notIn: [RefundStatus.CANCELLED, RefundStatus.REJECTED] },
						...notDeleted,
					},
					select: { id: true, status: true, stripeRefundId: true },
					// Déterminisme : sans `orderBy`, un reliquat de doublon historique
					// faisait résoudre tantôt la ligne liée, tantôt l'orpheline — la DLQ
					// concluait alors « succès » en laissant l'orphelin non lié.
					orderBy: { createdAt: "asc" },
				});
				if (existing) return existing;

				const order = await tx.order.findUniqueOrThrow({
					where: { id: orderId },
					select: {
						total: true,
						items: { select: { id: true, price: true, quantity: true } },
					},
				});

				const refundAmount = amountReceivedCents ?? order.total;

				const created = await tx.refund.create({
					data: {
						orderId,
						amount: refundAmount,
						currency: "EUR",
						reason: RefundReason.OTHER,
						status: RefundStatus.APPROVED,
						note: `${AUTO_REFUND_NOTE_PREFIX} (${reason})`,
						items: {
							create: order.items.map((oi) => ({
								orderItemId: oi.id,
								quantity: oi.quantity,
								amount: oi.price * oi.quantity,
								restock: false,
							})),
						},
					},
					select: { id: true, status: true, stripeRefundId: true },
				});

				await createOrderAuditTx(tx, {
					orderId,
					action: OrderAction.REFUND_CREATED,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: "Système (auto-refund)",
					note: `Auto-refund initié suite à ${reason}`,
					metadata: {
						refundId: created.id,
						paymentIntentId,
						amount: refundAmount,
						itemsCount: order.items.length,
						automatic: true,
					},
				});

				return created;
			},
			// ORD-STRIPE-004 : maxWait override pour contention multi-webhooks.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		const { stripe } = await import("@/shared/lib/stripe");

		const refund = await stripe.refunds.create(
			{
				payment_intent: paymentIntentId,
				reason: "requested_by_customer",
				metadata: {
					orderId,
					reason,
					refund_id: localRefund.id,
				},
			},
			{
				idempotencyKey: `auto-refund-${paymentIntentId}`,
			},
		);

		// Persiste stripeRefundId si pas déjà posé. Le webhook charge.refunded
		// tombera ensuite sur la branche `linkRefund` (refund_id présent dans
		// metadata) et finalisera le status à COMPLETED dans le même flux.
		if (!localRefund.stripeRefundId) {
			try {
				// IDEM-AUTOREFUND-001 : claim conditionnel (`stripeRefundId: null`) — n'écrase
				// jamais un lien déjà posé par un concurrent ou par le webhook charge.refunded.
				await prisma.refund.updateMany({
					where: { id: localRefund.id, stripeRefundId: null },
					data: { stripeRefundId: refund.id },
				});
			} catch (error) {
				// P2002 sur `Refund.stripeRefundId @unique` : une ligne SŒUR porte déjà ce
				// `re_*` — signature d'un doublon local historique (le `FOR UPDATE` ci-dessus
				// empêche d'en créer de nouveaux). L'argent n'est sorti qu'UNE fois (clé
				// d'idempotence Stripe stable), donc on ne propage pas l'erreur : la
				// remonter transformerait un simple résidu DB en « auto-refund échoué »,
				// ce qui relancerait la DLQ et pourrait faire rembourser un opérateur une
				// 2ᵉ fois à la main. On alerte pour nettoyage manuel de l'orphelin.
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
					logger.warn(
						`⚠️ [WEBHOOK] Auto-refund ${refund.id} déjà lié à un autre Refund local (doublon résiduel) — ordre ${orderId}`,
						{ service: "webhook", orderId, refundId: localRefund.id },
					);
					Sentry.withScope((scope) => {
						scope.setLevel("warning");
						scope.setTag("anomaly", "auto-refund-duplicate-row");
						scope.setFingerprint(["auto-refund-duplicate-row", orderId]);
						scope.setContext("auto-refund", {
							orderId,
							paymentIntentId,
							localRefundId: localRefund.id,
							stripeRefundId: refund.id,
						});
						Sentry.captureMessage(
							"Doublon de Refund local auto-refund (stripeRefundId déjà pris) — nettoyer l'orphelin",
							"warning",
						);
					});
				} else {
					throw error;
				}
			}
		}

		logger.info(
			`✅ [WEBHOOK] Auto-refund Stripe ${refund.id} créé + lié au Refund local ${localRefund.id} pour ordre ${orderId}`,
			{ service: "webhook" },
		);
		return { success: true, refundId: refund.id };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Failed to create auto-refund for order ${orderId}:`, error, {
			service: "webhook",
		});
		return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
	}
}

/**
 * Envoie une alerte admin pour un échec de remboursement
 */
export async function sendRefundFailureAlert(
	orderId: string,
	paymentIntentId: string,
	reason: "payment_failed" | "payment_canceled" | "other",
	errorMessage: string,
): Promise<void> {
	try {
		const order = await prisma.order.findFirst({
			where: { id: orderId, ...notDeleted },
			select: {
				orderNumber: true,
				total: true,
				user: { select: { email: true } },
			},
		});

		if (!order) {
			logger.error(`❌ [WEBHOOK] Order not found for refund alert: ${orderId}`, undefined, {
				service: "webhook",
			});
			return;
		}

		const baseUrl = getBaseUrl();
		const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(orderId)}`;

		await sendAdminRefundFailedAlert({
			orderNumber: order.orderNumber,
			customerEmail: order.user?.email ?? "Email non disponible",
			amount: order.total,
			reason,
			errorMessage,
			stripePaymentIntentId: paymentIntentId,
			dashboardUrl,
		});

		logger.info(`🚨 [WEBHOOK] Admin alert sent for failed refund on order ${orderId}`, {
			service: "webhook",
		});
	} catch (alertError) {
		logger.error(
			`❌ [WEBHOOK] Failed to send refund failure alert for order ${orderId}:`,
			alertError,
			{ service: "webhook" },
		);
	}
}
