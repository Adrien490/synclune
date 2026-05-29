"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	type Prisma,
	HistorySource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";

import * as Sentry from "@sentry/nextjs";
import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import { generateInvoiceAccessToken } from "../utils/invoice-token";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsPaidSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";

/**
 * Marque une commande comme payée manuellement
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être en statut PENDING
 * - Le paiement ne doit pas déjà être PAID
 * - Passe PaymentStatus à PAID
 * - Passe OrderStatus à PROCESSING
 * - Passe FulfillmentStatus à PROCESSING
 * - Enregistre la date de paiement
 */
export async function markAsPaid(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.MARK_AS_PAID);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");
		const note = safeFormGet(formData, "note");

		const validated = validateInput(markAsPaidSchema, { id: rawId, note });
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		// Transaction: fetch + validate + stock check + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					fulfillmentStatus: true,
					userId: true,
					customerEmail: true,
					customerName: true,
					subtotal: true,
					discountAmount: true,
					shippingCost: true,
					total: true,
					shippingFirstName: true,
					shippingLastName: true,
					shippingAddress1: true,
					shippingAddress2: true,
					shippingPostalCode: true,
					shippingCity: true,
					shippingCountry: true,
					stripePaymentIntentId: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
							productTitle: true,
							skuColor: true,
							skuColorHexes: true,
							skuMaterial: true,
							skuSize: true,
							price: true,
						},
					},
				},
			});

			if (!found) return null;

			if (found.paymentStatus === PaymentStatus.PAID) {
				return { ...found, _error: "already_paid" as const };
			}

			if (
				found.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
				found.paymentStatus === PaymentStatus.REFUNDED
			) {
				return { ...found, _error: "already_refunded" as const };
			}

			if (found.status === OrderStatus.CANCELLED) {
				return { ...found, _error: "cancelled" as const };
			}

			// EINV-CASH-001 : preuve Stripe obligatoire. Une commande marquée payée
			// DOIT être née d'un checkout Stripe (PaymentIntent — seul flow émis depuis
			// le retrait du Checkout Session hosted). Sans cette preuve PSP, mark-as-paid
			// fabriquerait un encaissement fictif → facture fiscale + e-reporting SALES
			// sans contrepartie réelle, ce qui expose Synclune à une qualification
			// "logiciel de caisse" non conforme (invariant CLAUDE.md #8 — « pas de
			// commande payée sans PaymentIntent »).
			if (!found.stripePaymentIntentId) {
				return { ...found, _error: "no_stripe_proof" as const };
			}

			// ORD-BIZ-004 : recovery FAILED/EXPIRED → PAID autorisée (paiement
			// bancaire manuel après échec). Safety guard : refuser s'il existe
			// déjà un Refund non-terminal (sinon on autorise mark-as-paid + le
			// Refund finalise plus tard = bug comptable).
			const isRecovery =
				found.paymentStatus === PaymentStatus.FAILED ||
				found.paymentStatus === PaymentStatus.EXPIRED;
			if (isRecovery) {
				const existingRefund = await tx.refund.findFirst({
					where: {
						orderId: id,
						status: { in: ["PENDING", "APPROVED", "COMPLETED"] },
						deletedAt: null,
					},
					select: { id: true },
				});
				if (existingRefund) {
					return { ...found, _error: "has_pending_refund" as const };
				}
			}

			// Stock decrement.
			// Flow Elements : le stock n'est JAMAIS décrémenté avant le passage à PAID
			// (order-creation vérifie FOR UPDATE mais ne décrémente pas ; le décrément
			// a lieu dans processOrderFromPaymentIntent au webhook `payment_intent.succeeded`).
			// Une commande PENDING/FAILED/EXPIRED — seuls états recoverables ici — a donc
			// toujours son stock à décrémenter au moment du mark-as-paid manuel.
			const stockAdjusted = found.items.length > 0;

			// Atomic stock decrement with conditional WHERE (prevents overselling)
			if (stockAdjusted) {
				for (const item of found.items) {
					const result = await tx.productSku.updateMany({
						where: {
							id: item.skuId,
							isActive: true,
							inventory: { gte: item.quantity },
						},
						data: {
							inventory: { decrement: item.quantity },
						},
					});

					if (result.count === 0) {
						throw new Error(`Stock insuffisant ou variante inactive pour ${item.productTitle}`);
					}
				}
			}

			// Mettre à jour la commande
			await tx.order.update({
				where: { id },
				data: {
					paymentStatus: PaymentStatus.PAID,
					status: OrderStatus.PROCESSING,
					fulfillmentStatus: FulfillmentStatus.PROCESSING,
					paidAt: new Date(),
				},
			});

			// Audit trail (Best Practice Stripe 2025). ORD-BIZ-004 :
			// metadata.recoveredFrom flag recovery FAILED/EXPIRED → PAID.
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "PAID",
				previousStatus: found.status,
				newStatus: OrderStatus.PROCESSING,
				previousPaymentStatus: found.paymentStatus,
				newPaymentStatus: PaymentStatus.PAID,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.PROCESSING,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					stockAdjusted,
					itemsCount: found.items.length,
					...(isRecovery && { recoveredFrom: found.paymentStatus }),
				},
			});

			return { ...found, _stockAdjusted: stockAdjusted };
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			const message =
				order._error === "already_paid"
					? ORDER_ERROR_MESSAGES.ALREADY_PAID
					: order._error === "already_refunded"
						? "Cette commande a déjà été remboursée (totalement ou partiellement)."
						: order._error === "has_pending_refund"
							? "Un remboursement est en cours pour cette commande. Annulez-le d'abord."
							: order._error === "no_stripe_proof"
								? "Cette commande n'a aucune preuve de paiement Stripe (PaymentIntent ou session Checkout). Le marquage manuel est interdit sans origine Stripe."
								: ORDER_ERROR_MESSAGES.CANNOT_PAY_CANCELLED;
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		// ORD-BIZ-007 : annule le PaymentIntent Stripe en parallèle (si encore actif)
		// pour éviter qu'un client paie en double via le lien checkout original
		// après que l'admin a marqué la commande payée hors Stripe.
		// Best-effort post-commit : ne PAS rollback si Stripe refuse (PaymentIntent
		// déjà succeeded/canceled — Stripe retourne payment_intent_unexpected_state
		// qu'on logge sans bloquer).
		if (order.stripePaymentIntentId) {
			try {
				const { stripe } = await import("@/shared/lib/stripe");
				await stripe.paymentIntents.cancel(order.stripePaymentIntentId, {
					cancellation_reason: "abandoned",
				});
				logger.info(
					`[mark-as-paid] PaymentIntent ${order.stripePaymentIntentId} annulé (manuel hors Stripe)`,
					{ action: "mark-as-paid", orderId: order.id },
				);
			} catch (cancelError) {
				const message = cancelError instanceof Error ? cancelError.message : String(cancelError);
				// payment_intent_unexpected_state = PI déjà succeeded/canceled : OK.
				// Tout autre erreur = Sentry warning (double-charge possible si PI encore ouvert).
				const isExpectedTerminalState = message.includes("payment_intent_unexpected_state");
				if (!isExpectedTerminalState) {
					Sentry.withScope((scope) => {
						scope.setLevel("warning");
						scope.setTag("payments", "mark-as-paid-cancel-pi-failed");
						scope.setContext("order", {
							orderId: order.id,
							orderNumber: order.orderNumber,
							stripePaymentIntentId: order.stripePaymentIntentId,
						});
						Sentry.captureException(cancelError);
					});
					logger.warn(
						`[mark-as-paid] PaymentIntent ${order.stripePaymentIntentId} cancel failed — double-charge possible`,
						{
							action: "mark-as-paid",
							orderId: order.id,
							error: message,
						},
					);
				}
			}
		}

		// Send order confirmation email for manual payment
		let emailSent = false;
		if (order.customerEmail) {
			const trackingUrl = buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber));
			try {
				await sendOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName || "Client",
					items: order.items.map((item) => ({
						productTitle: item.productTitle,
						skuColor: item.skuColor,
						skuColorHexes: item.skuColorHexes,
						skuMaterial: item.skuMaterial,
						skuSize: item.skuSize,
						quantity: item.quantity,
						price: item.price,
					})),
					subtotal: order.subtotal,
					discount: order.discountAmount,
					shipping: order.shippingCost,
					total: order.total,
					shippingAddress: {
						firstName: order.shippingFirstName || "",
						lastName: order.shippingLastName || "",
						address1: order.shippingAddress1 || "",
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode || "",
						city: order.shippingCity || "",
						country: order.shippingCountry || "France",
					},
					trackingUrl,
					invoiceUrl: buildUrl(
						`/api/orders/${encodeURIComponent(order.orderNumber)}/invoice?token=${generateInvoiceAccessToken(order.id, order.orderNumber)}`,
					),
					// EMAIL-AUDIT-003 : même convention que le webhook (`order-confirm:${id}`)
					// pour qu'un mark-as-paid manuel post-webhook ne ré-envoie pas.
					idempotencyKey: `order-confirm-${order.id}`,
				});
				emailSent = true;
			} catch (emailError) {
				logger.error("Échec envoi email", emailError, { action: "mark-as-paid" });
			}
		}

		const stockMessage =
			order._stockAdjusted && order.items.length > 0
				? ` Stock décrémenté pour ${order.items.length} article(s).`
				: "";

		const emailMessage = emailSent
			? " Email envoyé au client."
			: order.customerEmail
				? " (Échec envoi email)"
				: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme payée. Prête pour préparation.${stockMessage}${emailMessage}`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_PAID_FAILED);
	}
}
