"use server";

import { updateTag } from "next/cache";

import { HistorySource, OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { releaseOrderDiscountUsageTx } from "@/modules/discounts/services/release-order-discount-usage.service";
import { sendCancelOrderConfirmationEmail } from "@/modules/emails/services/status-emails";
import {
	error,
	handleActionError,
	parseFormIds,
	safeFormGet,
	success,
	validateInput,
} from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import { ROUTES, buildUrl } from "@/shared/constants/urls";
import type { ActionState } from "@/shared/types/server-action";

import { getOrderInvalidationTags } from "../constants/cache";
import { bulkCancelOrdersSchema } from "../schemas/order.schemas";
import { extractCustomerFirstName } from "../utils/customer-name";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Annulation en lot de commandes — UNIQUEMENT PENDING/UNPAID.
 *
 * Pour la sécurité Stripe, les commandes payées sont exclues : elles doivent
 * être annulées individuellement avec gestion explicite du remboursement.
 *
 * Pour chaque commande éligible :
 * - status → CANCELLED
 * - Stock restauré (paymentStatus PENDING)
 * - DiscountUsage libérées
 * - Audit log atomique (createOrderAuditTx)
 * - Email best-effort post-transaction
 *
 * formData :
 * - `orderIds` : JSON array cuid2 (1..50)
 * - `reason`   : string optionnel
 */
export async function bulkCancelOrders(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const idsResult = parseFormIds(formData, "orderIds");
		if ("error" in idsResult) return idsResult.error;

		const rawReason = safeFormGet(formData, "reason");
		const reason = rawReason ? sanitizeText(rawReason) : null;

		const validation = validateInput(bulkCancelOrdersSchema, {
			orderIds: idsResult.ids,
			reason: reason ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { orderIds } = validation.data;

		// Ventile la sélection : éligibles vs ignorées (par statut) pour donner
		// un feedback admin précis. Le filtre éligibilité reste strict :
		// status=PENDING ET paymentStatus=PENDING.
		const allSelected = await prisma.order.findMany({
			where: { id: { in: orderIds }, ...notDeleted },
			select: { id: true, status: true, paymentStatus: true },
		});

		const orderIdsEligible = allSelected
			.filter((o) => o.status === OrderStatus.PENDING && o.paymentStatus === PaymentStatus.PENDING)
			.map((o) => o.id);

		const skippedBreakdown = {
			alreadyCancelled: allSelected.filter((o) => o.status === OrderStatus.CANCELLED).length,
			alreadyShipped: allSelected.filter((o) => o.status === OrderStatus.SHIPPED).length,
			alreadyDelivered: allSelected.filter((o) => o.status === OrderStatus.DELIVERED).length,
			alreadyPaid: allSelected.filter(
				(o) =>
					o.status !== OrderStatus.CANCELLED &&
					o.status !== OrderStatus.SHIPPED &&
					o.status !== OrderStatus.DELIVERED &&
					o.paymentStatus !== PaymentStatus.PENDING,
			).length,
			notFound: orderIds.length - allSelected.length,
		};

		const orders = await prisma.order.findMany({
			where: {
				id: { in: orderIdsEligible },
				...notDeleted,
			},
			select: {
				id: true,
				orderNumber: true,
				status: true,
				paymentStatus: true,
				total: true,
				userId: true,
				customerEmail: true,
				customerName: true,
				shippingFirstName: true,
				items: {
					select: { id: true, skuId: true, quantity: true, price: true },
				},
			},
		});

		if (orders.length === 0) {
			return error(
				"Aucune commande éligible. Seules les commandes PENDING non payées peuvent être annulées en lot.",
			);
		}

		const cancelledOrders: Array<{
			id: string;
			orderNumber: string;
			userId: string | null;
			customerEmail: string | null;
			customerName: string | null;
			shippingFirstName: string | null;
			total: number;
		}> = [];

		const releasedDiscountIds = new Set<string>();

		await prisma.$transaction(
			async (tx) => {
				for (const order of orders) {
					// IDEM-CANCEL-001 : précondition ré-évaluée au lock de ligne — le
					// filtre d'éligibilité (PENDING+PENDING) est lu HORS transaction ;
					// un concurrent (2ᵉ bulk, cancel unitaire, webhook) peut avoir muté
					// la commande entre-temps. count===0 ⇒ skip (pas de double release
					// discount ni double audit CANCELLED).
					const claimed = await tx.order.updateMany({
						where: {
							id: order.id,
							status: OrderStatus.PENDING,
							paymentStatus: PaymentStatus.PENDING,
						},
						data: { status: OrderStatus.CANCELLED },
					});
					if (claimed.count === 0) continue;

					// STOCK-01 : NE PAS restocker. Les commandes éligibles au bulk sont
					// filtrées sur status=PENDING ET paymentStatus=PENDING (ligne 82). En
					// réservation optimiste, le stock n'est décrémenté qu'au passage PAID —
					// une PENDING n'a JAMAIS décrémenté son stock. Restocker ici (souvent en
					// purge de paniers abandonnés, donc à l'échelle) gonflerait l'inventaire
					// au-dessus du réel (phantom stock → survente future). Rien à restaurer.

					// [[DISC-USAGE-002]] Libération par commande via le service canonique :
					// son décrément est gardé par `usageCount > 0`. L'ancienne agrégation
					// `decrement: count` par discountId n'avait aucune borne basse — un
					// compteur négatif rendrait le code redeemable au-delà de
					// `maxUsageCount` (ex. après un `resetDiscountCounter` admin).
					for (const discountId of await releaseOrderDiscountUsageTx(tx, order.id)) {
						releasedDiscountIds.add(discountId);
					}

					await createOrderAuditTx(tx, {
						orderId: order.id,
						action: "CANCELLED",
						previousStatus: order.status,
						newStatus: OrderStatus.CANCELLED,
						previousPaymentStatus: order.paymentStatus,
						newPaymentStatus: order.paymentStatus,
						note: reason ?? "Annulation en lot",
						authorId: adminUser.id,
						authorName: adminUser.name ?? "Admin",
						source: HistorySource.ADMIN,
						metadata: {
							// PENDING-only : stock jamais décrémenté → rien restauré (STOCK-01).
							stockRestored: false,
							itemsCount: order.items.length,
							bulkOperation: true,
						},
					});

					cancelledOrders.push({
						id: order.id,
						orderNumber: order.orderNumber,
						userId: order.userId,
						customerEmail: order.customerEmail,
						customerName: order.customerName,
						shippingFirstName: order.shippingFirstName,
						total: order.total,
					});
				}
			},
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		const tags = new Set<string>();
		for (const o of cancelledOrders) {
			getOrderInvalidationTags(o.userId ?? undefined, o.id).forEach((tag) => tags.add(tag));
		}
		// Compteurs d'usage promo libérés : sans ça, la garde `maxUsagePerUser` du
		// checkout reste sur des counts périmés jusqu'à l'expiration du profil.
		for (const discountId of releasedDiscountIds) {
			tags.add(DISCOUNT_CACHE_TAGS.USAGE(discountId));
		}
		tags.forEach((tag) => updateTag(tag));

		// Best-effort email per customer (fire-and-forget, errors logged)
		for (const o of cancelledOrders) {
			if (!o.customerEmail) continue;
			const customerFirstName = extractCustomerFirstName(o.customerName, o.shippingFirstName);
			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(o.orderNumber));
			void sendCancelOrderConfirmationEmail({
				to: o.customerEmail,
				orderNumber: o.orderNumber,
				customerName: customerFirstName,
				orderTotal: o.total,
				reason: reason ?? undefined,
				wasRefunded: false,
				orderDetailsUrl,
				// EMAIL-AUDIT-004 : dedup Resend 24h contre rejouage bulk-cancel.
				idempotencyKey: `order-cancel:${o.id}`,
			}).catch((emailError) => {
				logger.error("Échec envoi email annulation lot", emailError, {
					action: "bulk-cancel-orders",
					orderId: o.id,
				});
			});
		}

		const skipped = orderIds.length - cancelledOrders.length;
		const reasons: string[] = [];
		if (skippedBreakdown.alreadyShipped > 0) {
			reasons.push(`${skippedBreakdown.alreadyShipped} expédiée(s)`);
		}
		if (skippedBreakdown.alreadyDelivered > 0) {
			reasons.push(`${skippedBreakdown.alreadyDelivered} livrée(s)`);
		}
		if (skippedBreakdown.alreadyCancelled > 0) {
			reasons.push(`${skippedBreakdown.alreadyCancelled} déjà annulée(s)`);
		}
		if (skippedBreakdown.alreadyPaid > 0) {
			reasons.push(`${skippedBreakdown.alreadyPaid} déjà payée(s)`);
		}
		if (skippedBreakdown.notFound > 0) {
			reasons.push(`${skippedBreakdown.notFound} introuvable(s)`);
		}
		const skippedHint = skipped > 0 ? ` (ignorées : ${reasons.join(", ")})` : "";
		const plural = cancelledOrders.length > 1 ? "s" : "";
		return success(`${cancelledOrders.length} commande${plural} annulée${plural}${skippedHint}`, {
			count: cancelledOrders.length,
			skipped,
			skippedBreakdown,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'annulation en lot");
	}
}
