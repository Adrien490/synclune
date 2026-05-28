"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	HistorySource,
	InvoiceStatus,
	RefundReason,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
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
import { getOrderInvalidationTags } from "../constants/cache";
import { cancelOrderSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { canCancelOrder } from "../services/order-status-validation.service";
import { voidInvoice } from "../services/void-invoice.service";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
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

		// Transaction: fetch + validate + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx) => {
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

			// Déterminer le nouveau paymentStatus.
			// - PAID/PARTIALLY_REFUNDED → REFUNDED (le remboursement sera traité)
			// - PENDING → FAILED (le paiement n'a jamais abouti, on coupe le polling cron)
			// - FAILED/EXPIRED/REFUNDED → inchangé
			const newPaymentStatus =
				found.paymentStatus === PaymentStatus.PAID ||
				found.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
					? PaymentStatus.REFUNDED
					: found.paymentStatus === PaymentStatus.PENDING
						? PaymentStatus.FAILED
						: found.paymentStatus;

			// Restock basé sur le fulfillment : tant qu'on n'a pas préparé/expédié,
			// les articles sont encore physiquement en stock. paymentStatus n'est pas
			// le bon proxy (une commande PROCESSING PAID = articles non sortis du stock).
			const shouldRestoreStock =
				found.fulfillmentStatus === FulfillmentStatus.UNFULFILLED ||
				found.fulfillmentStatus === FulfillmentStatus.PROCESSING;

			// La facture émise n'est pas effacée (séquentialité Art. 286 CGI) — elle
			// passe en VOIDED + 2e audit trail (un avoir doit être émis séparément).
			const shouldVoidInvoice = found.invoiceStatus === InvoiceStatus.GENERATED;

			// 1. Mettre à jour la commande
			// Note : si shouldVoidInvoice, le passage VOIDED + émission de l'avoir
			// (creditNoteNumber séquentiel A-YYYY-NNNNN, advisory lock dédié) sont
			// gérés par voidInvoice() après commit (Art. 272-I CGI). Ce service
			// ne peut pas être imbriqué dans la tx parent (advisory lock Postgres).
			await tx.order.update({
				where: { id },
				data: {
					status: OrderStatus.CANCELLED,
					paymentStatus: newPaymentStatus,
				},
			});

			// 2. Restaurer le stock
			if (shouldRestoreStock) {
				for (const item of found.items) {
					await tx.productSku.update({
						where: { id: item.skuId },
						data: {
							inventory: {
								increment: item.quantity,
							},
						},
					});
				}
			}

			// 3. Libérer les codes promo utilisés sur cette commande
			const discountUsages = await tx.discountUsage.findMany({
				where: { orderId: id },
				select: { id: true, discountId: true },
			});

			const releasedDiscountIds: string[] = [];
			for (const usage of discountUsages) {
				await tx.discount.update({
					where: { id: usage.discountId },
					data: { usageCount: { decrement: 1 } },
				});
				releasedDiscountIds.push(usage.discountId);
			}

			if (discountUsages.length > 0) {
				await tx.discountUsage.deleteMany({ where: { orderId: id } });
			}

			// 4. Auto-refund: créer un Refund (status APPROVED) à traiter manuellement
			// par l'admin via processRefund (appel Stripe synchrone hors transaction).
			// Pour PARTIALLY_REFUNDED, calcule le solde restant à rembourser
			// (sinon on créerait un Refund du montant total qui dépasse le payé restant).
			let createdRefundId: string | null = null;
			let autoRefundAmount = 0;
			const wasPayable =
				found.paymentStatus === PaymentStatus.PAID ||
				found.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;
			if (autoRefund && wasPayable) {
				const alreadyRefunded = await tx.refund.aggregate({
					where: {
						orderId: id,
						status: {
							in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
						},
						deletedAt: null,
					},
					_sum: { amount: true },
				});
				const remainingToRefund = found.total - (alreadyRefunded._sum.amount ?? 0);
				if (remainingToRefund > 0) {
					const refund = await tx.refund.create({
						data: {
							orderId: id,
							amount: remainingToRefund,
							reason: RefundReason.CUSTOMER_REQUEST,
							status: RefundStatus.APPROVED,
							note: sanitizedReason ?? "Remboursement automatique sur annulation",
							createdBy: adminUser.id,
							items: {
								create: found.items.map((item) => ({
									orderItemId: item.id,
									quantity: item.quantity,
									amount: item.price * item.quantity,
									restock: shouldRestoreStock,
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
				_autoRefundId: createdRefundId,
				_autoRefundAmount: autoRefundAmount,
				_invoiceVoided: shouldVoidInvoice,
			};
		});

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
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		// Si auto-refund, invalider également le cache des remboursements de la commande
		if (order._autoRefundId) {
			updateTag(`order-refunds-${order.id}`);
		}

		if (order.customerEmail) {
			const customerFirstName = extractCustomerFirstName(
				order.customerName,
				order.shippingFirstName,
			);
			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));
			const emailPayload = {
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				orderTotal: order.total,
				reason: sanitizedReason ?? undefined,
				wasRefunded: order._newPaymentStatus === PaymentStatus.REFUNDED,
				orderDetailsUrl,
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
