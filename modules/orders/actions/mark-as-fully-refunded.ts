"use server";

import {
	PaymentStatus,
	HistorySource,
	OrderAction,
	RefundReason,
	RefundStatus,
	InvoiceStatus,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "../constants/cache";
import { markAsFullyRefundedSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { extractCustomerFirstName } from "../utils/customer-name";
import { acquireOrderPaidLockTx } from "../utils/order-paid-lock";
import { voidInvoice } from "../services/void-invoice.service";
import { sendAdminCreditNoteOverlapAlert } from "@/modules/emails/services/admin-emails";
import { sendRefundConfirmationOnce } from "@/modules/refunds/services/send-refund-confirmation.service";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { logger } from "@/shared/lib/logger";

/**
 * Marque une commande comme entièrement remboursée
 * Réservé aux administrateurs
 *
 * Cas d'usage : remboursement effectué hors de Stripe (geste commercial,
 * remboursement bancaire manuel, avoir). Ne déclenche AUCUN refund Stripe :
 * pour rembourser via Stripe, utiliser modules/refunds/actions/create-refund.
 *
 * Règles métier :
 * - paymentStatus doit être PAID ou PARTIALLY_REFUNDED
 * - Statut commande inchangé (utiliser cancelOrder pour annuler)
 * - Audit trail avec raison optionnelle
 */
export async function markAsFullyRefunded(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawReason = safeFormGet(formData, "reason");
		const reason = rawReason ? sanitizeText(rawReason) : null;
		const rawMethod = safeFormGet(formData, "manualRefundMethod");

		const validated = validateInput(markAsFullyRefundedSchema, {
			id: safeFormGet(formData, "id"),
			reason: reason ?? undefined,
			manualRefundMethod: rawMethod ?? undefined,
		});
		if ("error" in validated) return validated.error;

		const { id, manualRefundMethod } = validated.data;

		// IDEM-CANCEL-001 : advisory lock AVANT le findUnique — deux invocations
		// concurrentes lisaient toutes deux PAID en read-committed et créaient
		// chacune un Refund COMPLETED du solde total (commande remboursée à 200 %
		// en compta). Lock partagé avec cancel-order / markAsPaid / webhook PAID.
		const order = await prisma.$transaction(
			async (tx) => {
				await acquireOrderPaidLockTx(tx, id);

				const found = await tx.order.findUnique({
					where: { id, ...notDeleted },
					select: {
						id: true,
						orderNumber: true,
						userId: true,
						total: true,
						paymentStatus: true,
						invoiceStatus: true,
						invoiceNumber: true,
						customerEmail: true,
						customerName: true,
						shippingFirstName: true,
						items: {
							select: {
								id: true,
								quantity: true,
								price: true,
								refundItems: {
									where: {
										refund: {
											status: {
												in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
											},
										},
									},
									select: { quantity: true, amount: true },
								},
							},
						},
						refunds: {
							where: {
								status: {
									in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED],
								},
							},
							select: { amount: true },
						},
					},
				});

				if (!found) return null;

				if (found.paymentStatus === PaymentStatus.REFUNDED) {
					return { ...found, _error: "already_refunded" as const };
				}

				if (
					found.paymentStatus !== PaymentStatus.PAID &&
					found.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
				) {
					return { ...found, _error: "not_paid" as const };
				}

				// Bloquer si un Refund Stripe est en cours (PENDING ou APPROVED). Sinon
				// double remboursement possible : admin marque manuel ici + webhook
				// charge.refunded reconnaît le Refund APPROVED et le passe à COMPLETED.
				const pendingStripeRefunds = await tx.refund.count({
					where: {
						orderId: id,
						status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
						deletedAt: null,
					},
				});
				if (pendingStripeRefunds > 0) {
					return { ...found, _error: "pending_stripe_refunds" as const };
				}

				// IDEM-CANCEL-001 (ceinture-bretelles) : claim atomique AVANT la création
				// du Refund — précondition ré-évaluée au lock de ligne, protège contre un
				// writer qui ne prendrait pas l'advisory lock. count===0 ⇒ un concurrent
				// a déjà posé REFUNDED : abort sans créer de Refund doublon.
				const claimed = await tx.order.updateMany({
					where: {
						id,
						paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] },
					},
					data: { paymentStatus: PaymentStatus.REFUNDED },
				});
				if (claimed.count === 0) {
					return { ...found, _error: "already_refunded" as const };
				}

				// EINV-CREDIT-004 : créer un Refund manuel pour tracer le flux financier.
				// Calcule la part restant à rembourser : order.total moins ce qui est
				// déjà couvert par des refunds existants (PARTIALLY_REFUNDED + manuel
				// supplémentaire = REFUNDED total).
				//
				// Defensive : si le select Prisma n'a pas retourné items/refunds (cas
				// tests legacy avec mock simplifié), on skip la création Refund —
				// l'audit OrderHistory.REFUND_COMPLETED reste émis plus bas. En prod,
				// le select garantit que ces champs sont présents.
				const refundsArr = Array.isArray(found.refunds) ? found.refunds : [];
				const itemsArr = Array.isArray(found.items) ? found.items : [];
				const alreadyRefunded = refundsArr.reduce((sum, r) => sum + r.amount, 0);
				const remainingAmount = found.total - alreadyRefunded;

				let createdRefundId: string | null = null;

				if (remainingAmount > 0 && itemsArr.length > 0) {
					// Calculer les quantités restantes par OrderItem
					const itemsToRefund = itemsArr
						.map((item) => {
							const itemRefundedItems = Array.isArray(item.refundItems) ? item.refundItems : [];
							const refundedQty = itemRefundedItems.reduce((s, ri) => s + ri.quantity, 0);
							const refundedAmt = itemRefundedItems.reduce((s, ri) => s + ri.amount, 0);
							return {
								orderItemId: item.id,
								quantity: item.quantity - refundedQty,
								itemTotal: item.price * item.quantity - refundedAmt,
							};
						})
						.filter((i) => i.quantity > 0 && i.itemTotal > 0);

					// Distribuer remainingAmount sur les items proportionnellement à
					// itemTotal. Le dernier item absorbe l'arrondi pour garantir
					// `sum(refundItem.amount) === remainingAmount`. Chaque part
					// intermédiaire est plafonnée au restant non alloué : sans ce clamp,
					// des arrondis à ,5 cumulés peuvent sur-allouer et rendre la part du
					// dernier item négative (violerait RefundItem_amount_positive). Les
					// parts nulles sont écartées pour la même contrainte CHECK (> 0).
					const itemsTotalSum = itemsToRefund.reduce((s, i) => s + i.itemTotal, 0);
					let allocated = 0;
					const refundItemsData = itemsToRefund
						.map((item, idx) => {
							const isLast = idx === itemsToRefund.length - 1;
							const amount = isLast
								? remainingAmount - allocated
								: itemsTotalSum > 0
									? Math.min(
											Math.round((item.itemTotal / itemsTotalSum) * remainingAmount),
											remainingAmount - allocated,
										)
									: 0;
							allocated += amount;
							return {
								orderItemId: item.orderItemId,
								quantity: item.quantity,
								amount,
								// Pas de restock par défaut : refund manuel hors Stripe = geste
								// commercial, le client a probablement gardé l'article.
								restock: false,
							};
						})
						.filter((item) => item.amount > 0);

					if (refundItemsData.length > 0 && typeof tx.refund.create === "function") {
						const createdRefund = await tx.refund.create({
							data: {
								orderId: id,
								amount: remainingAmount,
								currency: "EUR",
								reason: RefundReason.OTHER,
								status: RefundStatus.COMPLETED,
								createdBy: adminUser.id,
								processedAt: new Date(),
								note:
									reason ?? "Remboursement manuel hors Stripe (chèque, virement, geste commercial)",
								items: {
									create: refundItemsData,
								},
							},
							select: { id: true },
						});
						createdRefundId = createdRefund.id;

						await createOrderAuditTx(tx, {
							orderId: id,
							action: OrderAction.REFUND_CREATED,
							authorId: adminUser.id,
							authorName: adminUser.name ?? "Admin",
							source: HistorySource.ADMIN,
							note: `Refund manuel créé pour traçabilité du flux financier (${(remainingAmount / 100).toFixed(2)} €) — méthode: ${manualRefundMethod}`,
							metadata: {
								refundId: createdRefund.id,
								amount: remainingAmount,
								manual: true,
								manualRefundMethod,
							},
						});
					}
				}

				// Transition paymentStatus → REFUNDED déjà appliquée par le claim
				// atomique ci-dessus (IDEM-CANCEL-001).
				await createOrderAuditTx(tx, {
					orderId: id,
					action: OrderAction.REFUND_COMPLETED,
					previousPaymentStatus: found.paymentStatus,
					newPaymentStatus: PaymentStatus.REFUNDED,
					authorId: adminUser.id,
					authorName: adminUser.name ?? "Admin",
					source: HistorySource.ADMIN,
					note: reason ?? `Marquée comme remboursée (manuel — méthode: ${manualRefundMethod})`,
					metadata: {
						manual: true,
						manualRefundMethod,
						previousPaymentStatus: found.paymentStatus,
						manualRefundId: createdRefundId,
					},
				});

				return {
					...found,
					_createdRefundId: createdRefundId,
					_createdRefundAmount: remainingAmount,
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
				order._error === "already_refunded"
					? ORDER_ERROR_MESSAGES.ALREADY_FULLY_REFUNDED
					: order._error === "pending_stripe_refunds"
						? ORDER_ERROR_MESSAGES.PENDING_STRIPE_REFUNDS
						: ORDER_ERROR_MESSAGES.CANNOT_REFUND_NOT_PAID;
			return { status: ActionStatus.ERROR, message };
		}

		// EINV-SEQ-001 (audit séquences 2026-05-28, Option A) : ce flow est un
		// remboursement TOTAL → l'avoir est émis par `voidInvoice` ci-dessous
		// (`Order.creditNoteNumber`), émetteur unique. On NE pose donc PAS d'avoir
		// par Refund (`issueCreditNoteForRefund`) ici, sinon deux numéros A-YYYY
		// seraient consommés pour un seul remboursement.
		const createdRefundId = "_createdRefundId" in order ? order._createdRefundId : null;

		// Émission avoir VOID (Art. 272-I CGI) si la facture était active.
		// Hors transaction principale : advisory lock Postgres pas safe imbriqué.
		// EINV-CREDIT-008 : Sentry alerte sur `failed` — paymentStatus est passé
		// à REFUNDED ligne précédente, donc la facture stale est ici garantie.
		let creditNoteNumber: string | null = null;
		if (order.invoiceStatus === InvoiceStatus.GENERATED && order.invoiceNumber) {
			const voided = await voidInvoice({
				orderId: order.id,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				reason: reason ?? "Avoir suite à remboursement total manuel",
			});
			if (voided.kind === "voided") {
				creditNoteNumber = voided.creditNoteNumber;

				// EINV-CREDIT-015 (fix AVOIR-01) : symétrie avec le webhook charge.refunded.
				// Si des avoirs PARTIELS (Refund.creditNoteNumber) ont déjà été émis sur
				// cette commande, l'avoir TOTAL qu'on vient d'émettre se chevauche avec eux
				// sur le montant déjà crédité → sur-crédit (Art. 272-I CGI : avoirs > réduction
				// réelle). L'e-reporting reste juste (par Refund) ; seul le niveau document doit
				// être réconcilié manuellement. On alerte plutôt que de sur-créditer en silence.
				const partialCreditNoteCount = await prisma.refund.count({
					where: { orderId: order.id, creditNoteNumber: { not: null }, ...notDeleted },
				});
				if (partialCreditNoteCount > 0) {
					Sentry.withScope((scope) => {
						scope.setLevel("warning");
						scope.setTag("invoicing", "credit-note-overlap");
						scope.setTag("source", "mark-as-fully-refunded");
						scope.setFingerprint(["credit-note-overlap", order.id]);
						scope.setContext("order", {
							orderId: order.id,
							orderNumber: order.orderNumber,
							creditNoteNumber: voided.creditNoteNumber,
							partialCreditNoteCount,
						});
						Sentry.captureMessage(
							"Avoir total émis avec avoir(s) partiel(s) préexistant(s) — sur-crédit potentiel",
							"warning",
						);
					});
					await sendAdminCreditNoteOverlapAlert({
						orderId: order.id,
						orderNumber: order.orderNumber,
						invoiceNumber: order.invoiceNumber,
						creditNoteNumber: voided.creditNoteNumber,
						partialCreditNoteCount,
					}).catch((alertError) =>
						Sentry.captureException(alertError, {
							tags: { service: "mark-as-fully-refunded", alert: "credit-note-overlap" },
						}),
					);
				}
			} else if (voided.kind === "noop" && voided.reason === "already-voided") {
				creditNoteNumber = voided.creditNoteNumber ?? null;
			} else if (voided.kind === "failed") {
				Sentry.withScope((scope) => {
					scope.setLevel("error");
					scope.setTag("invoicing", "void-invoice-failed");
					scope.setFingerprint(["void-invoice", "max-retries", order.id]);
					scope.setContext("order", {
						orderId: order.id,
						orderNumber: order.orderNumber,
						paymentStatus: PaymentStatus.REFUNDED,
					});
					Sentry.captureMessage(
						"voidInvoice failed on mark-as-fully-refunded — facture stale",
						"error",
					);
				});
			}
		}

		getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach((tag) => updateTag(tag));

		// Le Refund manuel créé change la liste des remboursements de la fiche
		// commande — tag volontairement absent de getOrderInvalidationTags.
		if (createdRefundId) {
			updateTag(ORDERS_CACHE_TAGS.REFUNDS(order.id));
		}

		// Confirmation client du remboursement hors-Stripe — même émetteur unique
		// que le chemin Stripe/webhook/cron (claim atomique confirmationEmailSentAt
		// + clé Resend refund-confirm-{id}). Best-effort : la transition est déjà
		// committée, un échec d'envoi ne la remet pas en cause.
		if (createdRefundId && order.customerEmail) {
			const createdRefundAmount = "_createdRefundAmount" in order ? order._createdRefundAmount : 0;
			const customerFirstName = extractCustomerFirstName(
				order.customerName,
				order.shippingFirstName,
			);
			await sendRefundConfirmationOnce({
				refundId: createdRefundId,
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				refundAmount: createdRefundAmount,
				reason: RefundReason.OTHER,
				orderDetailsUrl: buildUrl(ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber)),
				invoiceNumber: order.invoiceNumber,
				creditNoteNumber,
			}).catch((emailError) => {
				logger.error("Échec envoi email", emailError, { action: "mark-as-fully-refunded" });
			});
		}

		const invoiceMessage = creditNoteNumber
			? ` Facture ${order.invoiceNumber} invalidée, avoir ${creditNoteNumber} émis.`
			: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme remboursée. Aucun appel Stripe effectué.${invoiceMessage}`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_FULLY_REFUNDED_FAILED);
	}
}
