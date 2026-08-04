import type Stripe from "stripe";
import { logger } from "@/shared/lib/logger";
import {
	extractPaymentFailureDetails,
	markOrderAsFailed,
	markOrderAsCancelled,
	initiateAutomaticRefund,
	sendRefundFailureAlert,
} from "../services/payment-intent.service";
import {
	sendAdminOrderProcessingFailedAlert,
	sendWebhookFailedAlertEmail,
} from "@/modules/emails/services/admin-emails";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { collectStockInvalidationTags } from "@/modules/products/utils/cache.utils";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import type { WebhookHandlerResult } from "../types/webhook.types";
import {
	processOrderFromPaymentIntent,
	buildPostCheckoutTasksFromPI,
} from "../services/checkout.service";
import {
	OversellError,
	CancelledOrderRaceError,
	AmountMismatchError,
} from "../services/checkout-order-processing.service";
import { captureWebhookError } from "../utils/capture-webhook-error";
import { ensureInvoiceNumberPersisted } from "@/modules/orders/services/ensure-invoice-number.service";
import { extractPaymentMethodFromPaymentIntent } from "@/modules/payments/services/map-stripe-payment-method";
import { parsePaymentIntentMetadata } from "@/modules/payments/schemas/stripe-metadata.schema";

/**
 * Resolves orderId from PI metadata.
 * Supports both new flow (camelCase `orderId`) and old flow (snake_case `order_id`).
 * Zod boundary (fail-open par champ) : un orderId malformé est droppé →
 * fallback `stripePaymentIntentId` (handlePaymentSuccess) ou skip gracieux.
 */
function resolveOrderId(metadata: Stripe.Metadata): string | undefined {
	const parsed = parsePaymentIntentMetadata(metadata);
	return parsed.orderId ?? parsed.order_id;
}

/**
 * Handles successful payment via Payment Intent.
 *
 * ORD-STRIPE-002 (2026-05-28) — unifié : on emprunte toujours
 * `processOrderFromPaymentIntent` (qui décrémente le stock + clear cart + désactive
 * SKU épuisés). L'ancien chemin "old CS flow" appelait `markOrderAsPaid` seul,
 * qui omettait le décrément stock — bug latent si `payment_intent.succeeded`
 * arrivait avant `checkout.session.completed` (l'ordre des webhooks Stripe
 * n'est pas garanti). `processOrderFromPaymentIntent` est idempotent via le
 * guard `paymentStatus === "PAID"` (checkout-order-processing.service.ts:114).
 */
export async function handlePaymentSuccess(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	let orderId = resolveOrderId(paymentIntent.metadata);

	// ORD-STRIPE-005 : si Stripe émet `payment_intent.succeeded` avant que
	// `confirmCheckout` step 9 ait pu poser `metadata.orderId` (paiement
	// instantané sans 3DS), on retrouve l'order via la clé unique
	// `stripePaymentIntentId` posée en step 8 (order-creation transaction).
	// Sans ce fallback, l'order reste PENDING et n'est rattrapée que ~1h
	// plus tard par le cron `sync-async-payments`.
	if (!orderId) {
		const fallbackOrder = await prisma.order.findFirst({
			where: { stripePaymentIntentId: paymentIntent.id, ...notDeleted },
			select: { id: true },
		});
		if (fallbackOrder) {
			orderId = fallbackOrder.id;
			logger.info(
				`⚠️ [WEBHOOK] payment_intent.succeeded missing metadata.orderId — resolved via stripePaymentIntentId fallback`,
				{ service: "webhook", orderId, paymentIntentId: paymentIntent.id },
			);
		} else {
			// Audit P2.1 / ORD-STRIPE-010 — encaissement ORPHELIN. Un
			// `payment_intent.succeeded` qui ne se résout NI via `metadata.orderId`
			// NI via la clé unique `stripePaymentIntentId` signifie qu'aucune commande
			// n'existe pour ce paiement (ex: PI confirmé hors-bande avec le
			// `client_secret` exposé au create, AVANT `confirmCheckout`, ou stock chuté
			// avant le lock de `createOrderInTransaction`). Le client a été débité mais
			// ne recevra rien et la somme n'est rattachée à aucune commande.
			//
			// Remédiation AUTOMATIQUE : on tente un remboursement idempotent. On émet
			// quand même Sentry + alerte admin (le refund peut échouer, et un
			// encaissement orphelin reste un incident à investiguer). On renvoie 200
			// (skipped) : un retry Stripe ne ferait pas apparaître la commande.
			logger.error(
				`⚠️ [WEBHOOK] ORPHAN payment_intent.succeeded — no order resolvable (PI: ${paymentIntent.id})`,
				undefined,
				{ service: "webhook" },
			);

			let orphanRefundOutcome: string;
			if (paymentIntent.amount_received > 0) {
				try {
					const { stripe } = await import("@/shared/lib/stripe");
					const refund = await stripe.refunds.create(
						{
							payment_intent: paymentIntent.id,
							reason: "requested_by_customer",
							metadata: { reason: "orphan_charge_no_order" },
						},
						{ idempotencyKey: `orphan-refund-${paymentIntent.id}` },
					);
					orphanRefundOutcome = `Remboursement automatique initié (${refund.id}). À vérifier dans Stripe.`;
					logger.info(
						`💰 [WEBHOOK] Orphan charge auto-refunded (refund ${refund.id}, PI ${paymentIntent.id})`,
						{ service: "webhook" },
					);
				} catch (refundError) {
					orphanRefundOutcome = `ÉCHEC du remboursement automatique — rembourser MANUELLEMENT ce PaymentIntent dans Stripe.`;
					logger.error("Failed to auto-refund orphan charge", refundError, {
						service: "webhook",
						paymentIntentId: paymentIntent.id,
					});
				}
			} else {
				orphanRefundOutcome = `Aucun montant encaissé (amount_received = 0) — rien à rembourser.`;
			}

			captureWebhookError(
				new Error(
					`Orphan payment captured: payment_intent.succeeded with no resolvable order (PI ${paymentIntent.id}). ${orphanRefundOutcome}`,
				),
				{
					handler: "handlePaymentSuccess",
					eventType: "payment_intent.succeeded",
					paymentIntentId: paymentIntent.id,
				},
			);
			try {
				await sendWebhookFailedAlertEmail({
					eventId: paymentIntent.id,
					eventType: "payment_intent.succeeded (orphan charge)",
					attempts: 1,
					error: `Encaissement de ${(paymentIntent.amount_received / 100).toFixed(2)}€ sans commande rattachée (ni metadata.orderId ni stripePaymentIntentId). ${orphanRefundOutcome}`,
				});
			} catch (alertError) {
				// Audit F5 : l'alerte email est le seul déclencheur du refund manuel si
				// l'auto-refund a échoué — son échec doit remonter dans Sentry, pas
				// seulement dans les logs.
				logger.error("Failed to send orphan-charge admin alert", alertError, {
					service: "webhook",
				});
				captureWebhookError(alertError, {
					handler: "handlePaymentSuccess.orphanAlert",
					eventType: "payment_intent.succeeded",
					paymentIntentId: paymentIntent.id,
				});
			}
			return { success: true, skipped: true, reason: "no_order_id" };
		}
	}

	// Extraction du type de paiement effectif depuis Stripe (EINV-EREPORT-001).
	// Best-effort (null si Stripe API échoue) — ne bloque pas le flow paiement.
	const paymentMethod = (await extractPaymentMethodFromPaymentIntent(paymentIntent)) ?? undefined;

	try {
		const order = await processOrderFromPaymentIntent(orderId, paymentIntent, paymentMethod);

		// Audit F2 (2026-05-29) : sur-facturation détectée APRÈS traitement réussi.
		// `processOrderAtomically` honore la commande (le client a payé) mais ne
		// rembourse PAS le delta automatiquement — un refund auto créerait une
		// transaction REFUND e-reporting fantôme (Invariant 9 CLAUDE.md) divergente
		// de la DGFiP. On émet donc une alerte admin ACTIONNABLE (PI + delta) pour
		// refund manuel + ajustement e-reporting. Best-effort, ne bloque pas le flow.
		if (paymentIntent.amount_received > order.total) {
			const delta = paymentIntent.amount_received - order.total;
			// AM-2 : persiste le trop-perçu (boucle de réconciliation fermée), pour que
			// l'incident ne dépende plus d'un email volatil. Le guard
			// `overbilledAmountCents: null` rend l'écriture idempotente sur les retries
			// webhook. La surface de suivi est le dashboard (get-action-items, en PULL) ;
			// l'auto-résolution (poser `overbillingResolvedAt` sur refund COMPLETED du
			// montant EXACT du delta, ou restitution totale — OVERBILL-RESOLVE-02) est
			// faite par la passe `reconcileOverbilledOrders` du cron `reconcile-refunds`
			// (OVERBILL-RESOLVE-01 — ex-cron alert-overbilled-orders, retiré au
			// right-sizing). PAS d'avoir/refund automatique ici (Invariant 9).
			try {
				await prisma.order.updateMany({
					where: { id: order.id, overbilledAmountCents: null },
					data: { overbilledAmountCents: delta },
				});
			} catch (persistError) {
				// Audit F5 : sans `overbilledAmountCents` persisté, la passe
				// `reconcileOverbilledOrders` ne verra jamais le trop-perçu — Sentry requis.
				logger.error("Failed to persist overbilling delta", persistError, {
					service: "webhook",
				});
				captureWebhookError(persistError, {
					handler: "handlePaymentSuccess.overbillingPersist",
					eventType: "payment_intent.succeeded",
					orderId: order.id,
					orderNumber: order.orderNumber,
					paymentIntentId: paymentIntent.id,
				});
			}
			logger.error(
				`⚠️ [WEBHOOK] Overbilling on order ${order.orderNumber}: captured ${paymentIntent.amount_received} > total ${order.total} (delta ${delta})`,
				undefined,
				{ service: "webhook" },
			);
			try {
				await sendAdminOrderProcessingFailedAlert({
					orderNumber: order.orderNumber,
					customerEmail: order.customerEmail ?? "Email non disponible",
					total: order.total,
					errorMessage: `Sur-facturation : Stripe a encaissé ${(paymentIntent.amount_received / 100).toFixed(2)}€ pour une commande à ${(order.total / 100).toFixed(2)}€ (delta ${(delta / 100).toFixed(2)}€). Action requise : remboursement manuel du delta + ajustement e-reporting (PAS d'avoir automatique).`,
					paymentIntentId: paymentIntent.id,
				});
			} catch (alertError) {
				logger.error("Failed to send overbilling admin alert", alertError, {
					service: "webhook",
				});
				captureWebhookError(alertError, {
					handler: "handlePaymentSuccess.overbillingAlert",
					eventType: "payment_intent.succeeded",
					orderId: order.id,
					orderNumber: order.orderNumber,
					paymentIntentId: paymentIntent.id,
				});
			}
		}

		// Génération facture eager (Art. 289-I CGI, ORD-COMPLY-002).
		await ensureInvoiceNumberPersisted(orderId);
		const tasks = buildPostCheckoutTasksFromPI(order, paymentIntent);
		return { success: true, tasks };
	} catch (error) {
		// ORD-STRIPE-009 : oversell (perdant d'une race sur le dernier exemplaire).
		// Le paiement est encaissé mais le stock est indisponible — un retry Stripe
		// ne résoudra rien (le stock ne reviendra pas). On rembourse automatiquement,
		// on marque la commande FAILED (ce qui libère aussi le code promo attaché,
		// cf. drift usageCount) et on renvoie 200 pour stopper les retries.
		if (error instanceof OversellError) {
			return handleOversell(orderId, paymentIntent);
		}
		// P2-1 (audit 2026-05-30) : sous-facturation détectée au webhook (Stripe a
		// encaissé moins que `order.total`). Comme l'oversell, un retry ne corrigera
		// rien — on rembourse le montant encaissé, marque FAILED, alerte, et renvoie
		// 200. Sans ce traitement, le throw générique provoquait un retry-Stripe
		// infini laissant un client débité sans commande PAID ni refund automatique.
		if (error instanceof AmountMismatchError) {
			return handleAmountMismatch(orderId, paymentIntent);
		}
		// ORD-STRIPE-009 : paiement tardif sur commande déjà annulée (admin/cron).
		// `detectCancelledOrderRace` a déjà initié l'auto-refund idempotent avant de
		// throw — renvoyer SKIPPED (200) au lieu de rethrow évite un 500-retry-loop
		// Stripe (le refund ne sera jamais "réussi" du point de vue du traitement order).
		if (error instanceof CancelledOrderRaceError) {
			logger.warn(
				`⚠️ [WEBHOOK] PI succeeded on cancelled order ${orderId} — refund already initiated`,
				{
					service: "webhook",
					paymentIntentId: paymentIntent.id,
				},
			);
			return { success: true, skipped: true, reason: "cancelled_order_race" };
		}
		logger.error(`❌ [WEBHOOK] Error processing PI flow for order ${orderId}:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handlePaymentSuccess",
			eventType: "payment_intent.succeeded",
			orderId,
			paymentIntentId: paymentIntent.id,
		});
		// Send immediate admin alert — payment was received but order processing failed
		try {
			const order = await prisma.order.findFirst({
				where: { id: orderId },
				select: { orderNumber: true, customerEmail: true, total: true },
			});
			if (order) {
				await sendAdminOrderProcessingFailedAlert({
					orderNumber: order.orderNumber,
					customerEmail: order.customerEmail,
					total: order.total,
					errorMessage: error instanceof Error ? error.message : String(error),
					paymentIntentId: paymentIntent.id,
				});
			}
		} catch (alertError) {
			logger.error("Failed to send order processing failed alert", alertError, {
				service: "webhook",
			});
		}
		throw error;
	}
}

/**
 * ORD-STRIPE-009 — oversell remediation.
 *
 * Le perdant d'une race sur le dernier exemplaire : le paiement Stripe est
 * encaissé mais la re-validation FOR UPDATE au webhook a trouvé le stock
 * indisponible (`OversellError`), AVANT tout décrément → rien à restaurer côté
 * loser. On :
 *   1. marque la commande FAILED (idempotent) — ce qui libère aussi le code promo
 *      attaché (`releaseOrderDiscountUsageTx`), sinon `usageCount` dérive sur une
 *      commande fantôme jamais servie ;
 *   2. déclenche un remboursement automatique Stripe (idempotent via clé
 *      `auto-refund-${paymentIntentId}`) ;
 *   3. alerte l'admin + invalide les caches order ;
 *   4. renvoie 200 (success) pour stopper les retries Stripe — le stock ne
 *      reviendra pas, retry inutile.
 */
async function handleOversell(
	orderId: string,
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	logger.warn(`⚠️ [WEBHOOK] Oversell detected for order ${orderId} — auto-refunding`, {
		service: "webhook",
		paymentIntentId: paymentIntent.id,
	});

	const order = await prisma.order.findFirst({
		where: { id: orderId, ...notDeleted },
		select: { orderNumber: true, customerEmail: true, total: true, userId: true },
	});

	// 1. Marquer FAILED (libère le discount). Idempotent.
	await markOrderAsFailed(orderId, paymentIntent.id, {
		code: "oversell",
		declineCode: null,
		message: "Stock indisponible au moment de l'encaissement — remboursement automatique",
	});

	// 2. Remboursement automatique (idempotent).
	const refundResult = await initiateAutomaticRefund(
		paymentIntent.id,
		orderId,
		"Oversell — stock indisponible au webhook",
		paymentIntent.amount_received,
	);
	if (!refundResult.success && refundResult.error) {
		await sendRefundFailureAlert(orderId, paymentIntent.id, "other", refundResult.error.message);
	}

	// 3. Alerte admin (visibilité même si le refund a réussi : incident métier).
	if (order) {
		await sendAdminOrderProcessingFailedAlert({
			orderNumber: order.orderNumber,
			customerEmail: order.customerEmail,
			total: order.total,
			errorMessage: `Oversell : stock indisponible à l'encaissement. Remboursement automatique ${
				refundResult.success ? "initié" : "ÉCHOUÉ — intervention manuelle requise"
			}.`,
			paymentIntentId: paymentIntent.id,
		});
	}

	// 4. Invalidation cache (la commande passe CANCELLED côté espace client).
	const cacheTags = [...getOrderInvalidationTags(orderId)];
	return { success: true, tasks: [{ type: "INVALIDATE_CACHE", tags: cacheTags }] };
}

/**
 * P2-1 (audit 2026-05-30) — sous-facturation détectée au webhook.
 *
 * `processOrderAtomically` a trouvé `amount_received < order.total` (AVANT tout
 * décrément stock / passage PAID). Le client a été débité d'un montant inférieur
 * au total commande. Comme l'oversell, un retry Stripe ne corrigera rien. On :
 *   1. marque la commande FAILED (idempotent) — libère aussi le code promo attaché ;
 *   2. rembourse automatiquement le montant encaissé (idempotent via clé
 *      `auto-refund-${paymentIntentId}`) ;
 *   3. alerte l'admin (incident métier — divergence PI/order à investiguer) ;
 *   4. renvoie 200 pour stopper les retries Stripe.
 */
async function handleAmountMismatch(
	orderId: string,
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	logger.error(
		`⚠️ [WEBHOOK] Underbilling detected for order ${orderId} — auto-refunding (captured ${paymentIntent.amount_received})`,
		undefined,
		{ service: "webhook", paymentIntentId: paymentIntent.id },
	);

	const order = await prisma.order.findFirst({
		where: { id: orderId, ...notDeleted },
		select: { orderNumber: true, customerEmail: true, total: true, userId: true },
	});

	// 1. Marquer FAILED (libère le discount). Idempotent.
	await markOrderAsFailed(orderId, paymentIntent.id, {
		code: "amount_mismatch",
		declineCode: null,
		message: "Montant encaissé inférieur au total commande — remboursement automatique",
	});

	// 2. Remboursement automatique (idempotent).
	// Audit F2 : le Refund local doit porter le montant réellement capturé
	// (amount_received < order.total dans ce chemin), pas `order.total`.
	const refundResult = await initiateAutomaticRefund(
		paymentIntent.id,
		orderId,
		"Sous-facturation — montant encaissé inférieur au total commande",
		paymentIntent.amount_received,
	);
	if (!refundResult.success && refundResult.error) {
		await sendRefundFailureAlert(orderId, paymentIntent.id, "other", refundResult.error.message);
	}

	// 3. Alerte admin (visibilité même si le refund a réussi : incident métier).
	if (order) {
		await sendAdminOrderProcessingFailedAlert({
			orderNumber: order.orderNumber,
			customerEmail: order.customerEmail,
			total: order.total,
			errorMessage: `Sous-facturation : Stripe a encaissé ${(paymentIntent.amount_received / 100).toFixed(2)}€ pour une commande à ${(order.total / 100).toFixed(2)}€. Commande marquée FAILED. Remboursement automatique ${
				refundResult.success ? "initié" : "ÉCHOUÉ — intervention manuelle requise"
			}.`,
			paymentIntentId: paymentIntent.id,
		});
	}

	// 4. Invalidation cache (la commande passe FAILED côté espace client).
	const cacheTags = [...getOrderInvalidationTags(orderId)];
	return { success: true, tasks: [{ type: "INVALIDATE_CACHE", tags: cacheTags }] };
}

/**
 * Handles `payment_intent.processing` — le paiement est accepté mais le
 * règlement bancaire est en cours (rare en card-only capture automatique ;
 * certaines cartes/3DS transitent par cet état).
 *
 * F3 (2026-05-29) : on souscrit explicitement l'événement pour la traçabilité
 * (avant, il tombait dans le `SKIPPED` générique « unsupported event »). On NE
 * mute PAS `paymentStatus` : la commande reste PENDING jusqu'à l'événement
 * terminal `payment_intent.succeeded` (→ PAID) ou `payment_intent.payment_failed`
 * (→ FAILED) qui pilotent la transition. `sync-async-payments` laisse également
 * les PI `processing` en PENDING (repris au run suivant). Retour `skipped` avec
 * raison explicite — aucune tâche post-webhook.
 */
export async function handlePaymentProcessing(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	const orderId = resolveOrderId(paymentIntent.metadata);
	logger.info(`⏳ [WEBHOOK] Payment processing (bank settlement in progress)`, {
		service: "webhook",
		orderId,
		paymentIntentId: paymentIntent.id,
	});
	return { success: true, skipped: true, reason: "payment_processing" };
}

/**
 * Handles `payment_intent.payment_failed` — NON-terminal (audit webhooks 2026-07-02, F1/F2).
 *
 * `payment_failed` n'est PAS un état terminal chez Stripe : le PI repasse
 * `requires_payment_method` et reste re-confirmable — le client qui essuie un
 * refus carte corrige sa saisie et re-soumet le MÊME PI depuis la page checkout
 * (use-checkout-submit, confirmCheckout idempotent par stripePaymentIntentId).
 * L'ancien comportement (restore stock + markOrderAsFailed + email) cassait ce
 * flux courant :
 *  - F2 : refus tentative 1 → le webhook annulait la commande PENDING en
 *    secondes → le retry réussi tombait sur CANCELLED → detectCancelledOrderRace
 *    → client débité puis auto-remboursé, commande perdue, discount libéré à tort ;
 *  - F1 : un payment_failed d'une tentative antérieure livré APRÈS succeeded
 *    (ordre Stripe non garanti) restockait une commande PAYÉE (restock fantôme)
 *    et la rétrogradait PAID→FAILED sans refund (amount_received=0 dans le
 *    snapshot stale) — client débité, commande annulée.
 *
 * Nouveau contrat : observabilité seulement, et rien d'autre — AUCUNE écriture
 * en base. Les détails d'échec partent au log (et au dashboard Stripe, qui reste
 * la source autoritaire du motif de refus) : les colonnes `Order.paymentFailure*`
 * qui les recevaient ont été retirées, n'ayant jamais eu de lecteur. Le chemin
 * TERMINAL (`markOrderAsFailed`) les consigne, lui, dans `OrderHistory.metadata`.
 * AUCUNE transition d'état,
 * aucun restock (réservation optimiste : une PENDING n'a jamais de stock
 * décrémenté), aucun refund (payment_failed ⇒ amount_received=0 en card-only ;
 * les anomalies d'encaissement sont couvertes par handleAmountMismatch /
 * reconcile-refunds). Les chemins de fail restants :
 *  - cron `sync-async-payments` (PENDING + PI > 1h : cancel PI + markOrderAsFailed) ;
 *  - `payment_intent.canceled` → handlePaymentCanceled.
 * L'email client (ex-BIZ-BUG-004) part désormais du cron UNIQUEMENT, au moment
 * où l'échec est réellement acté (client parti depuis > 1h) — même clé Resend
 * `payment-failed-${orderId}`, donc zéro doublon avec l'historique.
 */
export async function handlePaymentFailure(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	const orderId = resolveOrderId(paymentIntent.metadata);

	if (!orderId) {
		// PI failed before confirmCheckout added orderId to metadata (e.g. user abandoned).
		// No order was created, so nothing to record — skip gracefully.
		logger.warn(
			`⚠️ [WEBHOOK] payment_intent.payment_failed without orderId in metadata (PI: ${paymentIntent.id})`,
			{ service: "webhook" },
		);
		return { success: true, skipped: true, reason: "no_order_id" };
	}

	try {
		const failureDetails = extractPaymentFailureDetails(paymentIntent);

		logger.info(`[AUDIT] Payment failure detected`, {
			service: "webhook",
			orderId,
			failureCode: failureDetails.code,
		});

		const order = await prisma.order.findFirst({
			where: { id: orderId, ...notDeleted },
			select: { orderNumber: true, paymentStatus: true, userId: true },
		});

		if (!order) {
			logger.warn(`⚠️ [WEBHOOK] Order ${orderId} not found for payment_failed — skipping`, {
				service: "webhook",
				paymentIntentId: paymentIntent.id,
			});
			return { success: true, skipped: true, reason: "order_not_found" };
		}

		// F1 : événement stale d'une tentative antérieure, livré après succeeded
		// (ou après refund). Comportement Stripe documenté — warn, pas Sentry
		// (la garde markOrderAsFailed porte l'alerte si un appelant tente la
		// rétrogradation malgré tout).
		if (
			order.paymentStatus === "PAID" ||
			order.paymentStatus === "REFUNDED" ||
			order.paymentStatus === "PARTIALLY_REFUNDED"
		) {
			logger.warn(
				`⚠️ [WEBHOOK] Stale payment_failed on order ${order.orderNumber} (${order.paymentStatus}) — ignored`,
				{ service: "webhook", orderId, paymentIntentId: paymentIntent.id },
			);
			return { success: true, skipped: true, reason: "stale_payment_failed" };
		}

		// Le cron sync-async-payments (ou payment_intent.canceled) a déjà acté
		// l'échec — redélivrance, skip idempotent.
		if (order.paymentStatus === "FAILED") {
			return { success: true, skipped: true, reason: "already_failed" };
		}

		// Cas nominal (PENDING) : on trace, on n'écrit pas. `declineCode` est la
		// valeur qui sert vraiment en support (`insufficient_funds` vs
		// `do_not_honor`) — elle est ici, pas dans une colonne que personne ne lit.
		// Aucune invalidation de cache non plus : rien n'a changé en base, et cette
		// branche se déclenche à chaque nouvelle tentative de carte.
		logger.info(
			`❌ [WEBHOOK] Payment attempt failed on order ${order.orderNumber} — kept PENDING (PI retryable)`,
			{
				service: "webhook",
				orderId,
				failureCode: failureDetails.code,
				declineCode: failureDetails.declineCode,
				failureMessage: failureDetails.message,
			},
		);

		return { success: true };
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling payment failure for order ${orderId}:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handlePaymentFailure",
			eventType: "payment_intent.payment_failed",
			orderId,
			paymentIntentId: paymentIntent.id,
		});
		throw error;
	}
}

/**
 * Handles payment cancellation.
 * Cancels the order and initiates automatic refund if necessary.
 */
export async function handlePaymentCanceled(
	paymentIntent: Stripe.PaymentIntent,
): Promise<WebhookHandlerResult> {
	const orderId = resolveOrderId(paymentIntent.metadata);

	if (!orderId) {
		// PI canceled before confirmCheckout added orderId to metadata (e.g. user abandoned).
		// No order was created, so nothing to restore or refund — skip gracefully.
		logger.warn(
			`⚠️ [WEBHOOK] payment_intent.canceled without orderId in metadata (PI: ${paymentIntent.id})`,
			{ service: "webhook" },
		);
		return { success: true, skipped: true, reason: "no_order_id" };
	}

	try {
		// 1+2. Cancel + restore stock — UNE SEULE transaction (IDEM-CANCEL-002).
		// Le restock est conditionné au gain du claim CANCELLED : un rejeu de
		// l'event (crash → retry cron) perd le claim → aucun double restock.
		const { restoredSkus } = await markOrderAsCancelled(orderId, paymentIntent.id);

		// 3. Automatic refund if payment was captured
		if (paymentIntent.status === "canceled" && paymentIntent.amount_received > 0) {
			logger.info(`💰 [WEBHOOK] Initiating automatic refund for canceled order ${orderId}`, {
				service: "webhook",
			});

			const refundResult = await initiateAutomaticRefund(
				paymentIntent.id,
				orderId,
				"Payment canceled, automatic refund",
				paymentIntent.amount_received,
			);

			if (!refundResult.success && refundResult.error) {
				await sendRefundFailureAlert(
					orderId,
					paymentIntent.id,
					"payment_canceled",
					refundResult.error.message,
				);
			}
		}

		logger.info(`⚠️ [WEBHOOK] Order ${orderId} payment canceled`, { service: "webhook" });

		// 4. Build cache invalidation tasks
		// CACHE-AUDIT-002 : helper canonique (cf. handlePaymentFailure).
		// CACHE-CATALOG-002 : le restock invalide aussi la page produit + inventaire
		// admin (pas seulement SKU_STOCK, jamais posé sur la vitrine).
		const cacheTags: string[] = [
			...getOrderInvalidationTags(orderId),
			...collectStockInvalidationTags(restoredSkus),
		];

		return {
			success: true,
			tasks: [
				{
					type: "INVALIDATE_CACHE",
					tags: cacheTags,
				},
			],
		};
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling payment cancelation for order ${orderId}:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handlePaymentCanceled",
			eventType: "payment_intent.canceled",
			orderId,
			paymentIntentId: paymentIntent.id,
		});
		throw error;
	}
}

/**
 * Handles invoice payment failure
 *
 * When invoice_creation.enabled is true in checkout, Stripe creates invoices.
 * If a payment retry on those invoices fails, this handler sends an admin alert.
 */
export async function handleInvoicePaymentFailed(
	invoice: Stripe.Invoice,
): Promise<WebhookHandlerResult> {
	const orderId = invoice.metadata?.orderId;

	try {
		// Try to find the related order via invoice metadata or customer email
		const order = orderId
			? await prisma.order.findFirst({
					where: { id: orderId, ...notDeleted },
					select: {
						id: true,
						orderNumber: true,
						customerEmail: true,
						stripePaymentIntentId: true,
					},
				})
			: null;

		const orderNumber = order?.orderNumber ?? invoice.number ?? "N/A";
		const customerEmail = order?.customerEmail ?? invoice.customer_email ?? "N/A";
		const amount = invoice.amount_due || 0;

		// Extract error message from the invoice
		const errorMessage =
			invoice.last_finalization_error?.message ??
			`Invoice payment failed (status: ${invoice.status})`;

		const dashboardUrl = order
			? buildUrl(ROUTES.ADMIN.ORDER_DETAIL(order.id))
			: buildUrl(ROUTES.ADMIN.ORDERS);

		logger.info(`❌ [WEBHOOK] Invoice payment failed for order ${orderNumber} (${amount} cents)`, {
			service: "webhook",
		});

		return {
			success: true,
			tasks: [
				{
					type: "ADMIN_INVOICE_FAILED_ALERT",
					data: {
						orderNumber,
						customerEmail,
						amount,
						errorMessage,
						stripePaymentIntentId: order?.stripePaymentIntentId ?? undefined,
						dashboardUrl,
					},
				},
				{
					type: "INVALIDATE_CACHE",
					// Helper canonique : la liste manuelle reproduisait mot pour mot la sortie
					// sans `orderId`, tout en ayant `order` sous la main. Ce handler ne mute
					// rien (alerte seule), mais passer par le helper couvre le détail commande
					// et supprime une copie qui aurait dérivé au premier tag ajouté.
					tags: getOrderInvalidationTags(order?.id),
				},
			],
		};
	} catch (error) {
		logger.error(`❌ [WEBHOOK] Error handling invoice.payment_failed:`, error, {
			service: "webhook",
		});
		captureWebhookError(error, {
			handler: "handleInvoicePaymentFailed",
			eventType: "invoice.payment_failed",
			orderId,
		});
		throw error;
	}
}
