import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import {
	syncStripeRefunds,
	updateOrderPaymentStatus,
	resolveRefundByStripeId,
	mapStripeRefundStatus,
	updateRefundStatus,
	markRefundAsFailed,
} from "../services/refund.service";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { getBaseUrl, ROUTES } from "@/shared/constants/urls";
import type { WebhookHandlerResult, PostWebhookTask } from "../types/webhook.types";
import { captureWebhookError } from "../utils/capture-webhook-error";
import { voidInvoice } from "@/modules/orders/services/void-invoice.service";
import { issueCreditNoteForRefund } from "@/modules/refunds/services/issue-credit-note.service";
import { SYSTEM_AUTHOR_ID } from "../constants/webhook.constants";
import { HistorySource, InvoiceStatus, RefundStatus } from "@/app/generated/prisma/client";

/**
 * ORD-REFUND-AUDIT-004 : fenêtre de grâce pour SAGA admin in-flight.
 * Si processRefund (admin) est entre Step 2.5 (stripeRefundId persisté) et
 * Step 3 (finalize transaction), le webhook refund.updated arrive parfois
 * AVANT la fin de Step 3. Sans guard, updateRefundStatus marque COMPLETED →
 * Step 3 abort → restock + audit ADMIN perdus.
 */
const SAGA_IN_FLIGHT_GRACE_MS = 30_000;

/**
 * Gère les remboursements (charge.refunded)
 * Synchronise les remboursements Stripe avec la base de données
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<WebhookHandlerResult> {
	logger.info(`💰 [WEBHOOK] Charge refunded: ${charge.id}`, { service: "webhook" });

	const paymentIntentId =
		typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

	try {
		if (!paymentIntentId) {
			logger.error("❌ [WEBHOOK] No payment intent found for refunded charge", undefined, {
				service: "webhook",
			});
			throw new Error("No payment intent found for refunded charge");
		}

		// 2. Trouver la commande via payment intent (exclude soft-deleted)
		const order = await prisma.order.findFirst({
			where: { stripePaymentIntentId: paymentIntentId, ...notDeleted },
			select: {
				id: true,
				orderNumber: true,
				total: true,
				paymentStatus: true,
				customerEmail: true,
				customerName: true,
				userId: true,
				refunds: {
					select: {
						id: true,
						amount: true,
						status: true,
						stripeRefundId: true,
						reason: true,
						// ORD-STRIPE-002 : utilisé par syncStripeRefunds pour détecter
						// un SAGA processRefund en cours et skip l'update concurrent.
						processedAt: true,
					},
					orderBy: { createdAt: "desc" },
				},
			},
		});

		if (!order) {
			logger.warn(`⚠️ [WEBHOOK] Order not found for payment intent ${paymentIntentId}`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: "Order not found" };
		}

		// 3. Synchroniser les remboursements Stripe avec la base
		// ORD-STRIPE-006 : récupère la liste des Dashboard refunds créés pour
		// émettre une alerte admin temps réel (les RefundItem au pro-rata
		// ne suffisent pas — admin doit valider/restocker manuellement).
		// Defensive : fallback {} si le retour est undefined (compat mocks legacy).
		const syncResult = await syncStripeRefunds(charge, order.refunds, order.id);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Mocks legacy peuvent retourner undefined
		const dashboardRefundsCreated = syncResult?.dashboardRefundsCreated ?? [];

		// 4. Mettre à jour le statut de paiement de la commande
		const totalRefundedOnStripe = charge.amount_refunded || 0;
		const { isFullyRefunded } = await updateOrderPaymentStatus(
			order.id,
			order.total,
			totalRefundedOnStripe,
		);

		logger.info(
			`📄 [WEBHOOK] Refund processed for order ${order.orderNumber} ` +
				`(${isFullyRefunded ? "total" : "partial"}: ${totalRefundedOnStripe / 100}€)`,
			{ service: "webhook" },
		);

		// 4b. Cycle VOIDED facture (Art. 272-I CGI) si remboursement total après émission.
		// Idempotent : noop si déjà VOIDED ou si pas de facture active.
		// EINV-CREDIT-008 : Sentry alerte sur `failed` (full refund → facture stale).
		if (isFullyRefunded) {
			const invoiceState = await prisma.order.findUnique({
				where: { id: order.id },
				select: { invoiceStatus: true, invoiceNumber: true },
			});
			if (invoiceState?.invoiceStatus === InvoiceStatus.GENERATED && invoiceState.invoiceNumber) {
				const voided = await voidInvoice({
					orderId: order.id,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: "Stripe",
					source: HistorySource.WEBHOOK,
					reason: "Avoir émis suite à remboursement total Stripe",
				});
				if (voided.kind === "failed") {
					Sentry.withScope((scope) => {
						scope.setLevel("error");
						scope.setTag("invoicing", "void-invoice-failed");
						scope.setTag("source", "webhook-charge-refunded");
						scope.setFingerprint(["void-invoice", "max-retries", order.id]);
						scope.setContext("order", {
							orderId: order.id,
							orderNumber: order.orderNumber,
							stripeChargeId: charge.id,
						});
						Sentry.captureMessage(
							"voidInvoice failed on charge.refunded (full refund) — facture stale",
							"error",
						);
					});
				}
			}
		}

		// 4c. EINV-CREDIT-001 : émission avoir pour chaque Refund COMPLETED sans
		// creditNoteNumber (refund partiel via Dashboard Stripe OU rattrapage
		// après SAGA admin abort). Best-effort, idempotent. Re-fetch les refunds
		// après syncStripeRefunds pour avoir le state actuel (status COMPLETED).
		//
		// EINV-SEQ-001 (audit séquences 2026-05-28, Option A) : sur un remboursement
		// TOTAL, `voidInvoice` (étape 4b) est l'émetteur unique de l'avoir
		// (`Order.creditNoteNumber`). On NE déclenche donc l'avoir par Refund que
		// pour un refund NON total — sinon deux numéros A-YYYY seraient consommés
		// pour un seul événement (avoir fictif, Art. 272-I/286 CGI).
		if (!isFullyRefunded) {
			const refundsPostSync = await prisma.refund.findMany({
				where: {
					orderId: order.id,
					status: RefundStatus.COMPLETED,
					creditNoteNumber: null,
				},
				select: { id: true },
			});
			for (const r of refundsPostSync) {
				const creditNoteResult = await issueCreditNoteForRefund({
					refundId: r.id,
					source: HistorySource.WEBHOOK,
					authorId: SYSTEM_AUTHOR_ID,
					authorName: "Stripe",
				});
				if (creditNoteResult.kind === "failed") {
					logger.warn(
						`charge.refunded — credit note emission failed for refund ${r.id}: ${creditNoteResult.error}`,
						{ service: "webhook", orderId: order.id, refundId: r.id },
					);
				}
			}
		}

		// 5. Build post-tasks (email + cache invalidation)
		const tasks: PostWebhookTask[] = [];

		// CACHE-AUDIT-003 : le remboursement modifie order.paymentStatus —
		// passer par le helper canonique pour invalider aussi DETAIL(orderId),
		// LAST_ORDER et ACCOUNT_STATS (la liste manuelle omettait DETAIL → page
		// détail commande stale jusqu'à expiration du profil `user`).
		const cacheTags = [
			...getOrderInvalidationTags(order.userId ?? undefined, order.id),
			ORDERS_CACHE_TAGS.REFUNDS(order.id),
		];
		tasks.push({ type: "INVALIDATE_CACHE", tags: cacheTags });

		// ORD-STRIPE-006 : alerte admin temps réel pour chaque Dashboard refund
		// nouvellement créé (admin doit vérifier le restock manuel + traçabilité).
		for (const dashRefund of dashboardRefundsCreated) {
			tasks.push({
				type: "ADMIN_DASHBOARD_REFUND_ALERT",
				data: {
					orderNumber: order.orderNumber,
					orderId: order.id,
					stripeRefundId: dashRefund.stripeRefundId,
					amount: dashRefund.amount,
					isFullRefund: dashRefund.isFullRefund,
				},
			});
		}

		// ORD-STRIPE-001: éviter le double email confirmation refund.
		// `processRefund` (admin path) envoie déjà l'email côté action ;
		// `reconcile-refunds` (cron DLQ) idem. Le webhook ne doit envoyer que
		// pour les refunds Dashboard Stripe nouvellement détectés (aucun local
		// match préexistant). Stratégie : on émet l'email uniquement si au
		// moins un refund Stripe n'avait PAS de local Refund avec ce
		// `stripeRefundId` avant le webhook (state pré-syncStripeRefunds).
		const dashboardRefundDetected = (charge.refunds?.data ?? []).some(
			(stripeRefund) =>
				typeof stripeRefund.id === "string" &&
				!order.refunds.some((r) => r.stripeRefundId === stripeRefund.id),
		);

		if (order.customerEmail && dashboardRefundDetected) {
			// Read reason from local DB Refund (matches internal RefundReason enum
			// keys used by REFUND_REASON_LABELS in refund-confirmed-email.tsx).
			// Stripe.Refund.reason values (`requested_by_customer`, `fraudulent`...)
			// would not match the enum and produce an empty label.
			const latestLocalRefund = order.refunds[0];
			const reason = latestLocalRefund?.reason ?? "OTHER";
			// ORD-REFUND-AUDIT-007 : récupérer le Refund local fraîchement créé
			// par syncStripeRefunds pour aligner l'idempotencyKey email avec
			// l'admin side (`refund-confirm-${refundId}`). Fallback sur charge.id
			// si plusieurs nouveaux refunds Stripe (ambigu).
			const newStripeRefundIds = (charge.refunds?.data ?? [])
				.map((r) => r.id)
				.filter(
					(rid): rid is string =>
						typeof rid === "string" && !order.refunds.some((r) => r.stripeRefundId === rid),
				);
			const localRefundForEmail =
				newStripeRefundIds.length === 1 && newStripeRefundIds[0]
					? await prisma.refund
							.findUnique({
								where: { stripeRefundId: newStripeRefundIds[0] },
								select: { id: true },
							})
							.catch(() => null)
					: null;
			const baseUrl = getBaseUrl();
			const orderDetailsUrl = `${baseUrl}${ROUTES.ACCOUNT.ORDER_DETAIL(order.orderNumber)}`;

			// EINV-CREDIT-001 / EINV-SEQ-001 : pour un refund PARTIEL, l'avoir est
			// sur `Refund.creditNoteNumber` (issueCreditNoteForRefund, étape 4c).
			// Pour un refund TOTAL, seul `voidInvoice` (étape 4b) émet l'avoir sur
			// `Order.creditNoteNumber` — `Refund.creditNoteNumber` reste null.
			// Stratégie : prendre le dernier Refund COMPLETED en priorité (avoir
			// partiel le plus récent), fallback Order.creditNoteNumber (full void).
			// Best-effort : email envoyé même si la lecture échoue (champs null).
			const latestRefund = await prisma.refund
				.findFirst({
					where: { orderId: order.id, status: RefundStatus.COMPLETED },
					orderBy: { processedAt: "desc" },
					select: {
						creditNoteNumber: true,
						order: { select: { invoiceNumber: true, creditNoteNumber: true } },
					},
				})
				.catch(() => null);
			const creditNoteNumber =
				latestRefund?.creditNoteNumber ?? latestRefund?.order.creditNoteNumber ?? null;
			const invoiceNumber = latestRefund?.order.invoiceNumber ?? null;

			// ORD-STRIPE-005 : on inclut refundId dans le payload pour que le
			// dispatcher PostWebhookTask route vers sendRefundConfirmationOnce.
			// Si localRefundForEmail est null (cas ambigu multi-refunds), on tombe
			// sur le legacy path basé sur idempotencyKey Resend seul.
			tasks.push({
				type: "REFUND_CONFIRMATION_EMAIL",
				data: {
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName || "Client",
					refundAmount: totalRefundedOnStripe,
					reason,
					orderDetailsUrl,
					creditNoteNumber,
					invoiceNumber,
					...(localRefundForEmail && { refundId: localRefundForEmail.id }),
					idempotencyKey: localRefundForEmail
						? `refund-confirm-${localRefundForEmail.id}`
						: `refund-confirm-charge-${charge.id}-${totalRefundedOnStripe}`,
				},
			});
		}

		return { success: true, tasks };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling charge refunded:`, error, { service: "webhook" });
		captureWebhookError(error, {
			handler: "handleChargeRefunded",
			eventType: "charge.refunded",
			stripeChargeId: charge.id,
			paymentIntentId,
		});
		throw error;
	}
}

/**
 * Gère les événements refund.created et refund.updated
 * Synchronise le statut du remboursement avec la base de données
 */
export async function handleRefundUpdated(
	stripeRefund: Stripe.Refund,
): Promise<WebhookHandlerResult> {
	logger.info(`💰 [WEBHOOK] Refund updated: ${stripeRefund.id}, status: ${stripeRefund.status}`, {
		service: "webhook",
	});

	try {
		// 1. Trouver le remboursement local
		const refund = await resolveRefundByStripeId(
			stripeRefund.id,
			stripeRefund.metadata?.refund_id ?? undefined,
		);

		if (!refund) {
			logger.info(
				`ℹ️ [WEBHOOK] Refund ${stripeRefund.id} not found in database (may be external)`,
				{ service: "webhook" },
			);
			return { success: true, skipped: true, reason: "Refund not found in database" };
		}

		// ORD-REFUND-AUDIT-004 : skip si SAGA admin in-flight (Step 2.5 a posé
		// stripeRefundId mais Step 3 n'a pas encore commit). Sans ce guard, la
		// transition APPROVED→COMPLETED par le webhook précède Step 3 → restock
		// + audit ADMIN perdus. Le SAGA Step 3 (ou le cron reconcile) finalisera.
		const sinceUpdate = Date.now() - refund.updatedAt.getTime();
		if (
			refund.status === RefundStatus.APPROVED &&
			refund.processedAt === null &&
			sinceUpdate < SAGA_IN_FLIGHT_GRACE_MS
		) {
			logger.info(
				`⏳ [WEBHOOK] SAGA admin in-flight — skipping refund.updated for ${stripeRefund.id}`,
				{ service: "webhook", refundId: refund.id, sinceUpdateMs: sinceUpdate },
			);
			return { success: true, skipped: true, reason: "SAGA admin in-flight" };
		}

		// 2. Mapper le statut Stripe vers notre statut
		const newStatus = mapStripeRefundStatus(stripeRefund.status ?? undefined);

		// 3. Mettre à jour si le statut a changé
		if (refund.status !== newStatus) {
			await updateRefundStatus(
				refund.id,
				newStatus,
				stripeRefund.status ?? "unknown",
				refund.status,
			);

			return {
				success: true,
				tasks: [
					{
						type: "INVALIDATE_CACHE",
						// CACHE-AUDIT-006 : le changement de statut refund + l'audit
						// OrderHistory s'affichent sur le détail commande → invalider
						// DETAIL et HISTORY en plus de la liste des refunds.
						tags: [
							ORDERS_CACHE_TAGS.REFUNDS(refund.orderId),
							ORDERS_CACHE_TAGS.DETAIL(refund.orderId),
							ORDERS_CACHE_TAGS.HISTORY(refund.orderId),
						],
					},
				],
			};
		}

		return { success: true };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling refund updated:`, error, { service: "webhook" });
		captureWebhookError(error, {
			handler: "handleRefundUpdated",
			eventType: "refund.updated",
			stripeRefundId: stripeRefund.id,
		});
		throw error;
	}
}

/**
 * Gère les échecs de remboursement
 * Marque le remboursement comme FAILED et alerte l'admin
 */
export async function handleRefundFailed(
	stripeRefund: Stripe.Refund,
): Promise<WebhookHandlerResult> {
	logger.info(`❌ [WEBHOOK] Refund failed: ${stripeRefund.id}`, { service: "webhook" });

	try {
		// 1. Trouver le remboursement local
		const refund = await resolveRefundByStripeId(
			stripeRefund.id,
			stripeRefund.metadata?.refund_id ?? undefined,
		);

		if (!refund) {
			logger.warn(`⚠️ [WEBHOOK] Failed refund ${stripeRefund.id} not found in database`, {
				service: "webhook",
			});
			return { success: true, skipped: true, reason: "Refund not found in database" };
		}

		// 2. Marquer comme FAILED
		const failureReason = stripeRefund.failure_reason ?? "unknown";
		await markRefundAsFailed(refund.id, failureReason);

		// 3. Build post-tasks (admin alert + cache invalidation)
		const tasks: PostWebhookTask[] = [];

		tasks.push({
			type: "INVALIDATE_CACHE",
			// CACHE-AUDIT-006 : idem handleRefundUpdated (statut refund + audit).
			tags: [
				ORDERS_CACHE_TAGS.REFUNDS(refund.orderId),
				ORDERS_CACHE_TAGS.DETAIL(refund.orderId),
				ORDERS_CACHE_TAGS.HISTORY(refund.orderId),
			],
		});

		const baseUrl = getBaseUrl();
		const dashboardUrl = `${baseUrl}${ROUTES.ADMIN.REFUNDS}`;
		tasks.push({
			type: "ADMIN_REFUND_FAILED_ALERT",
			data: {
				orderNumber: refund.order.orderNumber,
				customerEmail: refund.order.customerEmail ?? "Email non disponible",
				amount: refund.amount,
				reason: "other",
				refundReason: refund.reason,
				errorMessage: `Échec remboursement Stripe: ${failureReason}`,
				stripePaymentIntentId: refund.order.stripePaymentIntentId ?? "",
				dashboardUrl,
			},
		});

		return { success: true, tasks };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling refund failed:`, error, { service: "webhook" });
		captureWebhookError(error, {
			handler: "handleRefundFailed",
			eventType: "refund.failed",
			stripeRefundId: stripeRefund.id,
		});
		throw error;
	}
}
