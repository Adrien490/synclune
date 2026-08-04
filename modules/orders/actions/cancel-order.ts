"use server";

/**
 * Server Action : annulation de commande **admin** (requireAdminWithUser).
 *
 * Seul chemin d'annulation restant : l'espace client (et son
 * `cancel-order-customer.ts`) a été supprimé le 2026-07-31 — le parcours
 * d'achat est 100 % invité, sans annulation self-service.
 */
import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	HistorySource,
	InvoiceStatus,
	RefundReason,
	RefundStatus,
	StockMovementSource,
} from "@/app/generated/prisma/client";
import { recordStockMovementTx } from "@/modules/skus/services/stock-movement.service";
import { shouldReactivateAfterRestock } from "@/modules/skus/services/restock-reactivation.service";
import {
	collectStockInvalidationTags,
	type StockChangedSku,
} from "@/modules/products/utils/cache.utils";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { releaseOrderDiscountUsageTx } from "@/modules/discounts/services/release-order-discount-usage.service";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { sendCancelOrderConfirmationEmail } from "@/modules/emails/services/status-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "../constants/cache";
import { cancelOrderSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { acquireOrderPaidLockTx } from "../utils/order-paid-lock";
import { canCancelOrder } from "../services/order-status-validation.service";
import { voidInvoice } from "../services/void-invoice.service";
import { hasOpenDisputeTx } from "../services/has-open-dispute.service";
import { buildOrderTrackingUrl } from "../utils/build-order-tracking-url";
import { sanitizeText } from "@/shared/lib/sanitize";
import { extractCustomerFirstName } from "../utils/customer-name";

/**
 * Annule une commande
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - Passe le statut de la commande à CANCELLED
 * - paymentStatus : PAID/PARTIALLY_REFUNDED → REFUNDED, PENDING → FAILED, autres inchangés
 * - Restocke les SKUs si fulfillmentStatus ∈ {UNFULFILLED, PROCESSING} (articles non sortis)
 * - Si une facture a été générée (invoiceStatus=GENERATED) : passe à VOIDED + audit
 *   INVOICE_VOIDED (invoiceNumber conservé pour séquentialité Art. 286 CGI)
 * - autoRefund : crée un Refund APPROVED du SOLDE restant à rembourser (gère
 *   PARTIALLY_REFUNDED via aggregate des refunds existants)
 * - Préserve l'intégrité comptable (la commande reste en base avec son invoiceNumber)
 * - Une commande déjà annulée ne peut pas être annulée à nouveau
 */
export async function cancelOrder(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");
		const rawReason = safeFormGet(formData, "reason");
		const sanitizedReason = rawReason ? sanitizeText(rawReason) : null;
		const autoRefund = safeFormGet(formData, "autoRefund") === "true";

		const validated = validateInput(cancelOrderSchema, {
			id: rawId,
			reason: sanitizedReason,
			autoRefund,
		});
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// Transaction: fetch + validate + update + audit atomically.
		// IDEM-CANCEL-001 : advisory lock AVANT le findUnique — sans lui, deux
		// invocations concurrentes (double-clic, 2 onglets) lisent toutes deux le
		// statut pré-annulation en read-committed, passent la garde canCancelOrder,
		// et la 2ᵉ ré-applique restock + création Refund (doublon financier +
		// phantom stock). Le lock partagé avec processOrderAtomically/markAsPaid
		// sérialise aussi contre la transition PAID du webhook.
		const order = await prisma.$transaction(
			async (tx) => {
				await acquireOrderPaidLockTx(tx, id);

				const found = await tx.order.findUnique({
					where: { id, ...notDeleted },
					select: {
						id: true,
						orderNumber: true,
						status: true,
						paymentStatus: true,
						fulfillmentStatus: true,
						total: true,
						stripePaymentIntentId: true,
						userId: true,
						customerEmail: true,
						customerName: true,
						shippingFirstName: true,
						invoiceNumber: true,
						invoiceStatus: true,
						items: {
							select: {
								id: true,
								skuId: true,
								quantity: true,
								price: true,
							},
						},
					},
				});

				if (!found) return null;

				// Validate via state machine service (blocks SHIPPED, DELIVERED, CANCELLED)
				if (!canCancelOrder(found)) {
					const _error =
						found.status === OrderStatus.CANCELLED
							? ("already_cancelled" as const)
							: ("cannot_cancel" as const);
					return { ...found, _error };
				}

				// ORD-STRIPE-007 : bloque si un dispute Stripe est ouvert sur la
				// commande. Annuler + perdre le chargeback = double-débit côté merchant
				// + voidInvoice émis pour rien si Stripe gagne ensuite.
				if (await hasOpenDisputeTx(tx, id)) {
					return { ...found, _error: "open_dispute" as const };
				}

				// Agrégat des Refunds non-terminaux déjà créés (utilisé pour le solde
				// auto-refund + le guard ORD-BIZ-009 ci-dessous).
				const alreadyRefundedAggregate = await tx.refund.aggregate({
					where: {
						orderId: id,
						status: {
							in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
						},
					},
					_sum: { amount: true },
				});
				const alreadyRefundedTotal = alreadyRefundedAggregate._sum.amount ?? 0;
				const wasPayable =
					found.paymentStatus === PaymentStatus.PAID ||
					found.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;

				// ORD-BIZ-009 : refus si autoRefund=false sur commande payée sans
				// Refund couvrant le total. Sinon paymentStatus=REFUNDED serait posé
				// sans aucun Refund DB / Stripe, créant un faux-positif comptable
				// (commande "Remboursée" sans trace de remboursement).
				if (wasPayable && !autoRefund && alreadyRefundedTotal < found.total) {
					return { ...found, _error: "requires_refund" as const };
				}

				// Déterminer le nouveau paymentStatus.
				// - PAID/PARTIALLY_REFUNDED → REFUNDED (le remboursement sera traité)
				// - PENDING → FAILED (le paiement n'a jamais abouti, on coupe le polling cron)
				// - FAILED/REFUNDED → inchangé
				const newPaymentStatus =
					found.paymentStatus === PaymentStatus.PAID ||
					found.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
						? PaymentStatus.REFUNDED
						: found.paymentStatus === PaymentStatus.PENDING
							? PaymentStatus.FAILED
							: found.paymentStatus;

				// STOCK-01 : restocker UNIQUEMENT si le stock a réellement été décrémenté.
				// Réservation optimiste : le décrément n'a lieu qu'au passage PAID (webhook
				// payment_intent.succeeded ou mark-as-paid) — une commande restée PENDING n'a
				// JAMAIS décrémenté son stock. Restocker une PENDING gonflerait l'inventaire
				// au-dessus du réel (phantom stock → survente future), et le CHECK inventory>=0
				// ne protège que le plancher, pas le sur-comptage. On combine donc deux
				// conditions, alignées sur l'invariant de restoreStockForOrder
				// (payment-intent.service.ts) :
				//  1. le stock a été retiré : paymentStatus PAID / PARTIALLY_REFUNDED ;
				//  2. les articles ne sont pas encore sortis physiquement : fulfillment
				//     UNFULFILLED / PROCESSING (une PAID PROCESSING = articles encore en stock).
				const stockWasDecremented =
					found.paymentStatus === PaymentStatus.PAID ||
					found.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;
				const notYetShipped =
					found.fulfillmentStatus === FulfillmentStatus.UNFULFILLED ||
					found.fulfillmentStatus === FulfillmentStatus.PROCESSING;
				const shouldRestoreStock = stockWasDecremented && notYetShipped;

				// La facture émise n'est pas effacée (séquentialité Art. 286 CGI) — elle
				// passe en VOIDED + 2e audit trail (un avoir doit être émis séparément).
				const shouldVoidInvoice = found.invoiceStatus === InvoiceStatus.GENERATED;

				// 1. Mettre à jour la commande
				// Note : si shouldVoidInvoice, le passage VOIDED + émission de l'avoir
				// (creditNoteNumber séquentiel A-YYYY-NNNNN, advisory lock dédié) sont
				// gérés par voidInvoice() après commit (Art. 272-I CGI). Ce service
				// ne peut pas être imbriqué dans la tx parent (advisory lock Postgres).
				// IDEM-CANCEL-001 (ceinture-bretelles) : précondition de statut ré-évaluée
				// au lock de ligne — protège aussi contre un writer qui ne prendrait pas
				// l'advisory lock. count===0 ⇒ la commande a changé sous nos pieds :
				// on abandonne AVANT restock / Refund / audit.
				const claimed = await tx.order.updateMany({
					where: { id, status: found.status, paymentStatus: found.paymentStatus },
					data: {
						status: OrderStatus.CANCELLED,
						paymentStatus: newPaymentStatus,
					},
				});
				if (claimed.count === 0) {
					return { ...found, _error: "concurrent_change" as const };
				}

				// 2. Restaurer le stock
				// STOCK-LEDGER-001 : `UPDATE … RETURNING` pour journaliser le mouvement
				// sans requête de plus. C'est LE crédit qui, dupliqué par
				// STOCK-DOUBLE-CREDIT-001, gonflait l'inventaire sans laisser de trace :
				// il mérite sa ligne au journal plus que tout autre.
				const restockedSkus: StockChangedSku[] = [];
				if (shouldRestoreStock) {
					// P1-1 : état AVANT crédit. `isActive` + `inventory` sont le discriminant de
					// `shouldReactivateAfterRestock` — on ne réactive que ce que la VENTE a
					// désactivé, jamais un retrait manuel de l'admin. Sans ça, annuler la
					// commande de la dernière unité recréditait le stock en laissant le SKU
					// `isActive: false`, donc invisible en vitrine (et la PDP d'un produit
					// mono-SKU en `notFound()`).
					//
					// `productId` + `product.slug` sont sélectionnés ici, pas dans une requête
					// dédiée : ils alimentent `collectStockInvalidationTags` après commit, et
					// cette lecture a lieu de toute façon.
					const skusBefore = await tx.productSku.findMany({
						where: { id: { in: Array.from(new Set(found.items.map((i) => i.skuId))) } },
						select: {
							id: true,
							isActive: true,
							inventory: true,
							productId: true,
							product: { select: { slug: true } },
						},
					});
					const beforeById = new Map(skusBefore.map((s) => [s.id, s]));

					for (const item of found.items) {
						const reactivate = shouldReactivateAfterRestock(beforeById.get(item.skuId));

						const updated = await tx.$queryRaw<Array<{ inventory: number; productId: string }>>`
							UPDATE "ProductSku"
							SET "inventory" = "inventory" + ${item.quantity},
							    "isActive" = CASE WHEN ${reactivate} THEN true ELSE "isActive" END,
							    "updatedAt" = NOW()
							WHERE "id" = ${item.skuId}
							RETURNING "inventory", "productId"
						`;

						// SKU hard-deleted entre-temps : rien à restaurer, rien à journaliser.
						// On ne throw pas — l'annulation doit aboutir (le claim est déjà gagné).
						const row = updated[0];
						if (!row) continue;

						// Après le `continue` : un SKU disparu n'a rien à invalider.
						restockedSkus.push({
							skuId: item.skuId,
							productId: row.productId,
							productSlug: beforeById.get(item.skuId)?.product.slug ?? null,
						});

						await recordStockMovementTx(tx, {
							skuId: item.skuId,
							productId: row.productId,
							previousInventory: row.inventory - item.quantity,
							newInventory: row.inventory,
							source: StockMovementSource.ORDER,
							reason: `Annulation — commande ${found.orderNumber}`,
							createdById: adminUser.id,
							createdByName: adminUser.name ?? null,
						});
					}
				}

				// 3. Libérer les codes promo utilisés sur cette commande.
				// [[DISC-USAGE-002]] Toujours via le service canonique : son décrément est
				// gardé par `usageCount > 0`, ce qu'un `update` direct ne fait pas (un
				// compteur négatif rendrait le code redeemable au-delà de `maxUsageCount`).
				const releasedDiscountIds = await releaseOrderDiscountUsageTx(tx, id);

				// 4. Auto-refund: créer un Refund (status APPROVED) — le remboursement
				// Stripe se fait depuis le dashboard (Lot 2), le webhook refund.updated
				// finalisera (avoir + email). Pour PARTIALLY_REFUNDED, calcule le solde
				// restant à rembourser (sinon on créerait un Refund du montant total
				// qui dépasse le payé restant).
				//
				// STOCK-DOUBLE-CREDIT-001 (mémoire) : l'étape 2 ci-dessus
				// (`shouldRestoreStock`) a DÉJÀ restauré le stock dans cette
				// transaction. Le vecteur de double crédit — un drapeau de restock sur
				// RefundItem ré-incrémenté à la finalisation — est structurellement
				// mort depuis le Lot 6 (colonne droppée, la finalisation ne touche
				// plus au stock) ; tout restock post-refund est un ajustement manuel
				// de stock SKU.
				let createdRefundId: string | null = null;
				let autoRefundAmount = 0;
				if (autoRefund && wasPayable) {
					const remainingToRefund = found.total - alreadyRefundedTotal;
					if (remainingToRefund > 0) {
						const refund = await tx.refund.create({
							data: {
								orderId: id,
								amount: remainingToRefund,
								reason: RefundReason.CUSTOMER_REQUEST,
								status: RefundStatus.APPROVED,
								note: sanitizedReason ?? "Remboursement automatique sur annulation",
								items: {
									create: found.items.map((item) => ({
										orderItemId: item.id,
										quantity: item.quantity,
										amount: item.price * item.quantity,
									})),
								},
							},
							select: { id: true },
						});
						createdRefundId = refund.id;
						autoRefundAmount = remainingToRefund;
					}
				}

				// 5. Audit trail (Best Practice Stripe 2025)
				await createOrderAuditTx(tx, {
					orderId: id,
					action: "CANCELLED",
					previousStatus: found.status,
					newStatus: OrderStatus.CANCELLED,
					previousPaymentStatus: found.paymentStatus,
					newPaymentStatus: newPaymentStatus,
					note: sanitizedReason ?? undefined,
					authorId: adminUser.id,
					authorName: adminUser.name ?? "Admin",
					source: HistorySource.ADMIN,
					metadata: {
						stockRestored: shouldRestoreStock,
						itemsCount: found.items.length,
						releasedDiscountIds,
						autoRefundId: createdRefundId,
						autoRefundAmount,
						invoiceVoided: shouldVoidInvoice,
					},
				});

				// L'audit INVOICE_VOIDED + emission avoir sont gérés par voidInvoice()
				// après commit (advisory lock Postgres incompatible avec tx imbriquée).

				return {
					...found,
					_newPaymentStatus: newPaymentStatus,
					_shouldRestoreStock: shouldRestoreStock,
					_restockedSkus: restockedSkus,
					_autoRefundId: createdRefundId,
					_autoRefundAmount: autoRefundAmount,
					_invoiceVoided: shouldVoidInvoice,
				};
			},
			// Advisory lock : l'attente derrière un webhook PAID concurrent compte
			// dans le timeout de la tx → overrides explicites (cf. CLAUDE.md).
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			const message =
				order._error === "already_cancelled"
					? ORDER_ERROR_MESSAGES.ALREADY_CANCELLED
					: order._error === "concurrent_change"
						? "La commande a été modifiée par une autre opération pendant l'annulation. Rechargez la page et réessayez."
						: order._error === "requires_refund"
							? "Cette commande est payée et aucun remboursement n'a été créé. Cochez « Auto-refund » pour générer le remboursement Stripe, ou créez d'abord un remboursement manuel."
							: order._error === "open_dispute"
								? "Un litige Stripe est en cours sur cette commande. L'annulation est bloquée jusqu'à la résolution du litige (gérée automatiquement par le webhook charge.dispute.closed)."
								: "Impossible d'annuler une commande expediee ou livree.";
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Audit log

		// Cycle VOIDED facture + émission avoir séquentiel (Art. 272-I CGI).
		// Best-effort hors transaction principale (advisory lock Postgres).
		// EINV-CREDIT-008 : Sentry alerte sur `failed` quand paymentStatus passe à
		// REFUNDED — la facture stale post-cancel est rattrapée par le cron
		// reconcile-voided-invoices (EINV-CREDIT-003) mais l'alerte doit fire au
		// plus tôt pour visibilité oncall.
		let creditNoteNumber: string | null = null;
		if (order._invoiceVoided) {
			const voided = await voidInvoice({
				orderId: order.id,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				reason: sanitizedReason ?? "Facture invalidée suite à annulation",
			});
			if (voided.kind === "voided") {
				creditNoteNumber = voided.creditNoteNumber;
			} else if (voided.kind === "noop" && voided.reason === "already-voided") {
				creditNoteNumber = voided.creditNoteNumber ?? null;
			} else if (voided.kind === "failed" && order._newPaymentStatus === PaymentStatus.REFUNDED) {
				Sentry.withScope((scope) => {
					scope.setLevel("error");
					scope.setTag("invoicing", "void-invoice-failed");
					scope.setFingerprint(["void-invoice", "max-retries", order.id]);
					scope.setContext("order", {
						orderId: order.id,
						orderNumber: order.orderNumber,
						paymentStatus: order._newPaymentStatus,
					});
					Sentry.captureMessage(
						"voidInvoice failed on cancel-order with paymentStatus=REFUNDED — facture stale",
						"error",
					);
				});
			}
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		// Si auto-refund, invalider également le cache des remboursements de la commande
		if (order._autoRefundId) {
			updateTag(ORDERS_CACHE_TAGS.REFUNDS(order.id));
		}

		// STOCK-CANCEL-INVALIDATION-001 : le restock ci-dessus recrédite `inventory` ET
		// réactive `isActive` — deux écritures CATALOGUE dont aucune n'était invalidée
		// ici (seuls les tags commande l'étaient). Trois conséquences, toutes
		// user-visibles jusqu'à expiration du profil `catalog` (5 min revalidate,
		// 15 min stale, 6 h expire) :
		//  1. la PDP continuait d'annoncer « rupture de stock » ;
		//  2. le produit mono-SKU réactivé restait en 404 EN CACHE — le correctif P1-1
		//     de `shouldReactivateAfterRestock` était annulé par le cache ;
		//  3. le formulaire d'édition SKU gardait un `originalInventory` périmé, soit
		//     la divergence de baseline exacte de STOCK-STALE-BASELINE-001.
		// Passer par la SSOT et non par une liste écrite à la main : c'est en
		// hand-rollant leur set que `process-refund` et `reconcile-refunds` ont
		// chacun omis `SKU_DETAIL_BY_ID` et `SKUS_LIST`.
		if (order._restockedSkus.length > 0) {
			updateTagsAfterMutation(collectStockInvalidationTags(order._restockedSkus));
		}

		if (order.customerEmail) {
			const customerFirstName = extractCustomerFirstName(
				order.customerName,
				order.shippingFirstName,
			);
			const orderDetailsUrl = buildOrderTrackingUrl(order);
			const emailPayload = {
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				orderTotal: order.total,
				reason: sanitizedReason ?? undefined,
				wasRefunded: order._newPaymentStatus === PaymentStatus.REFUNDED,
				orderDetailsUrl,
				// EMAIL-AUDIT-004 : dedup Resend 24h contre double-clic admin / bulk-cancel.
				idempotencyKey: `order-cancel:${order.id}`,
			};

			after(async () => {
				await sendCancelOrderConfirmationEmail(emailPayload).catch((emailError) => {
					logger.error("Échec envoi email", emailError, { action: "cancel-order" });
				});
			});
		}

		const refundMessage = order._autoRefundId
			? ` Remboursement Stripe en attente (${(order._autoRefundAmount / 100).toFixed(2)} €), à traiter via la fiche remboursement.`
			: order._newPaymentStatus === PaymentStatus.REFUNDED
				? " Statut passé à REFUNDED. Un remboursement Stripe doit être effectué séparément si nécessaire."
				: "";

		const stockMessage =
			order._shouldRestoreStock && order.items.length > 0
				? ` Stock restauré pour ${order.items.length} article(s).`
				: order.items.length > 0 && !order._shouldRestoreStock
					? " Stock non restauré (commande déjà expédiée)."
					: "";

		const invoiceMessage = order._invoiceVoided
			? creditNoteNumber
				? ` Facture ${order.invoiceNumber} invalidée, avoir ${creditNoteNumber} émis.`
				: ` Facture ${order.invoiceNumber} invalidée — avoir à émettre manuellement.`
			: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} annulée.${refundMessage}${stockMessage}${invoiceMessage}`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.CANCEL_FAILED);
	}
}
