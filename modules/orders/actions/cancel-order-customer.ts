"use server";

/**
 * Server Action : annulation de commande **cote client** (requireAuth).
 *
 * Variante restreinte de `cancel-order.ts` :
 * - IDOR : seul l'owner peut annuler.
 * - Statuts autorises : PENDING uniquement (jamais PROCESSING/SHIPPED).
 * - Pas d'opt-in autoRefund (geste commercial admin uniquement).
 *
 * A appeler depuis l'espace client (`app/(account)/commandes/...`).
 * Ne pas importer `cancelOrder` (admin) depuis le client.
 * Cf. ORD-MAP-007 (audit cartographie 2026-05-28).
 */
import { OrderStatus, PaymentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { releaseOrderDiscountUsageTx } from "@/modules/discounts/services/release-order-discount-usage.service";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ORDER_CANCEL_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { sendCancelOrderConfirmationEmail } from "@/modules/emails/services/status-emails";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { createOrderAuditTx } from "../utils/order-audit";
import { extractCustomerFirstName } from "../utils/customer-name";
import { buildUrl, ROUTES } from "@/shared/constants/urls";

const cancelOrderCustomerSchema = z.object({
	id: z.cuid2(),
});

/**
 * Customer-facing order cancellation
 *
 * Rules:
 * - Only the order owner can cancel (IDOR protection)
 * - Only PENDING orders can be cancelled (not PROCESSING, SHIPPED, etc.)
 * - Stock is restored (no physical fulfillment has started)
 * - PaymentStatus is set to REFUNDED if it was PAID
 * - Audit trail with CUSTOMER source
 * - Cancellation email sent to customer
 */
export async function cancelOrderCustomer(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;
		const { user } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ORDER_CANCEL_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput(cancelOrderCustomerSchema, {
			id: formData.get("id"),
		});
		if ("error" in validation) return validation.error;
		const { id } = validation.data;

		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
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
						select: {
							skuId: true,
							quantity: true,
						},
					},
				},
			});

			if (!found) return null;

			// IDOR protection: only the order owner can cancel
			if (found.userId !== user.id) return null;

			// Customer can only cancel PENDING orders
			if (found.status !== OrderStatus.PENDING) {
				const errorType =
					found.status === OrderStatus.CANCELLED
						? ("already_cancelled" as const)
						: ("not_pending" as const);
				return { ...found, _error: errorType };
			}

			// AUDIT-BIZ-001 : cette action portait un `paymentStatus === PAID ?
			// REFUNDED : …` qui aurait marqué la commande remboursée SANS créer de
			// refund Stripe ni de ligne `Refund` — et sans restocker, la justification
			// STOCK-01 ci-dessous (« une PENDING n'a jamais décrémenté ») étant fausse
			// pour une PENDING+PAID. Le cas est aujourd'hui inatteignable (toute
			// transition PAID pose aussi `status = PROCESSING` : webhook
			// `processOrderAtomically` + action admin `markAsPaid`), donc plutôt que de
			// « gérer » silencieusement un état incohérent avec un flip d'enum
			// mensonger, on refuse et on alerte : un remboursement doit passer par le
			// module `refunds`, jamais par une mutation de statut.
			if (found.paymentStatus === PaymentStatus.PAID) {
				return { ...found, _error: "pending_but_paid" as const };
			}
			const newPaymentStatus = found.paymentStatus;

			// Update order status.
			// IDEM-CANCEL-001 : précondition status=PENDING ré-évaluée au lock de
			// ligne — deux soumissions concurrentes (double-clic) passaient toutes
			// deux la gate lue en read-committed et ré-appliquaient l'annulation
			// (double décrément usageCount discount). count===0 ⇒ un concurrent a
			// déjà muté la commande : abort avant libération des codes promo.
			const claimed = await tx.order.updateMany({
				where: { id, status: OrderStatus.PENDING },
				data: {
					status: OrderStatus.CANCELLED,
					paymentStatus: newPaymentStatus,
				},
			});
			if (claimed.count === 0) {
				return { ...found, _error: "not_pending" as const };
			}

			// STOCK-01 : NE PAS restocker. Cette action n'accepte QUE des commandes
			// PENDING (gate ligne 94). En réservation optimiste, le stock n'est décrémenté
			// qu'au passage PAID (webhook / mark-as-paid) — une commande PENDING n'a donc
			// JAMAIS décrémenté son stock. Restocker ici gonflerait l'inventaire au-dessus
			// du réel (phantom stock → survente future). Rien à restaurer.

			// Release discount usages (free up promo codes).
			// [[DISC-USAGE-002]] Toujours via le service canonique : son décrément est
			// gardé par `usageCount > 0`, ce qu'un `updateMany` direct ne fait pas (un
			// compteur négatif rendrait le code redeemable au-delà de `maxUsageCount`).
			const releasedDiscountIds = await releaseOrderDiscountUsageTx(tx, id);

			// Audit trail
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "CANCELLED",
				previousStatus: found.status,
				newStatus: OrderStatus.CANCELLED,
				previousPaymentStatus: found.paymentStatus,
				newPaymentStatus: newPaymentStatus,
				authorId: user.id,
				// RGPD-AUDIT P1-2 : jamais de nom/email client dans OrderHistory
				// (immuable 10 ans, non scrubé à l'anonymisation). authorId suffit.
				authorName: "Client",
				source: HistorySource.CUSTOMER,
				metadata: {
					// PENDING-only : stock jamais décrémenté → rien restauré (STOCK-01).
					stockRestored: false,
					itemsCount: found.items.length,
					releasedDiscountIds,
				},
			});

			return { ...found, _newPaymentStatus: newPaymentStatus };
		});

		if (!order) {
			return error(ORDER_ERROR_MESSAGES.NOT_FOUND);
		}

		if ("_error" in order) {
			if (order._error === "pending_but_paid") {
				// État incohérent (PENDING + PAID) : jamais produit par les chemins
				// nominaux. On alerte pour investigation au lieu de le « réparer » par un
				// flip de statut qui laisserait un client débité et non remboursé.
				logger.error("cancelOrderCustomer refused: order is PENDING but already PAID", undefined, {
					action: "cancel-order-customer",
					orderId: order.id,
				});
				Sentry.withScope((scope) => {
					scope.setLevel("error");
					scope.setTag("orders", "pending-but-paid");
					scope.setFingerprint(["cancel-order-customer", "pending-but-paid"]);
					scope.setContext("order", { orderId: order.id, orderNumber: order.orderNumber });
					Sentry.captureMessage(
						`Order ${order.orderNumber} is PENDING with paymentStatus PAID — customer cancel refused`,
						"error",
					);
				});
				return error(
					"Cette commande a déjà été payée et ne peut pas être annulée ici. Écris-moi et je m'en occupe.",
				);
			}
			const message =
				order._error === "already_cancelled"
					? ORDER_ERROR_MESSAGES.ALREADY_CANCELLED
					: "Seules les commandes en attente peuvent être annulées.";
			return error(message);
		}

		// Invalidate caches
		getOrderInvalidationTags(user.id, order.id).forEach((tag) => updateTag(tag));

		// Send cancellation email
		if (order.customerEmail) {
			const customerFirstName = extractCustomerFirstName(
				order.customerName,
				order.shippingFirstName,
			);

			const orderDetailsUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));

			try {
				await sendCancelOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: customerFirstName,
					orderTotal: order.total,
					wasRefunded: order._newPaymentStatus === PaymentStatus.REFUNDED,
					orderDetailsUrl,
					// EMAIL-AUDIT-004 : dedup Resend 24h contre double-soumission du formulaire client.
					idempotencyKey: `order-cancel:${order.id}`,
				});
			} catch (emailError) {
				logger.error("Email send failed", emailError, { action: "cancel-order-customer" });
			}
		}

		return success("Votre commande a été annulée.");
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.CANCEL_FAILED);
	}
}
