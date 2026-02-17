import type Stripe from "stripe";
import type { WebhookHandlerResult, SupportedStripeEvent } from "../types/webhook.types";

// Import handlers
import { handleCheckoutSessionCompleted, handleCheckoutSessionExpired } from "../handlers/checkout-handlers";
import { handlePaymentSuccess, handlePaymentFailure, handlePaymentCanceled } from "../handlers/payment-handlers";
import { handleChargeRefunded, handleRefundUpdated, handleRefundFailed } from "../handlers/refund-handlers";
import { handleAsyncPaymentSucceeded, handleAsyncPaymentFailed } from "../handlers/async-payment-handlers";
import { handleDisputeCreated, handleDisputeClosed } from "../handlers/dispute-handlers";

type EventHandler = (event: Stripe.Event) => Promise<WebhookHandlerResult | null>;

/**
 * Type helpers pour extraire les données d'événements Stripe
 * NOTE: Stripe SDK ne fournit pas de type narrowing basé sur event.type
 * Ces assertions sont nécessaires et sûres car Stripe garantit le type par événement
 * @see https://stripe.com/docs/api/events/types
 */
function getCheckoutSession(event: Stripe.Event): Stripe.Checkout.Session {
	return event.data.object as Stripe.Checkout.Session;
}

function getPaymentIntent(event: Stripe.Event): Stripe.PaymentIntent {
	return event.data.object as Stripe.PaymentIntent;
}

function getCharge(event: Stripe.Event): Stripe.Charge {
	return event.data.object as Stripe.Charge;
}

function getRefund(event: Stripe.Event): Stripe.Refund {
	return event.data.object as Stripe.Refund;
}

function getDispute(event: Stripe.Event): Stripe.Dispute {
	return event.data.object as Stripe.Dispute;
}

/**
 * Registry des handlers par type d'événement
 * Chaque handler reçoit l'événement Stripe et retourne optionnellement des tâches post-webhook
 * Les extracteurs (getCheckoutSession, etc.) documentent le type attendu par événement
 */
const eventHandlers: Record<SupportedStripeEvent, EventHandler> = {
	// === CHECKOUT ===
	"checkout.session.completed": async (e) =>
		handleCheckoutSessionCompleted(getCheckoutSession(e)),
	"checkout.session.expired": async (e) =>
		handleCheckoutSessionExpired(getCheckoutSession(e)),

	// === PAYMENT INTENT ===
	"payment_intent.succeeded": async (e) => {
		await handlePaymentSuccess(getPaymentIntent(e));
		return null;
	},
	"payment_intent.payment_failed": async (e) =>
		handlePaymentFailure(getPaymentIntent(e)),
	"payment_intent.canceled": async (e) =>
		handlePaymentCanceled(getPaymentIntent(e)),

	// === REFUND ===
	"charge.refunded": async (e) =>
		handleChargeRefunded(getCharge(e)),
	"refund.created": async (e) =>
		handleRefundUpdated(getRefund(e)),
	"refund.updated": async (e) =>
		handleRefundUpdated(getRefund(e)),
	"refund.failed": async (e) =>
		handleRefundFailed(getRefund(e)),

	// === ASYNC PAYMENT (SEPA, Sofort, etc.) ===
	"checkout.session.async_payment_succeeded": async (e) =>
		handleAsyncPaymentSucceeded(getCheckoutSession(e)),
	"checkout.session.async_payment_failed": async (e) =>
		handleAsyncPaymentFailed(getCheckoutSession(e)),

	// === DISPUTE (chargebacks) ===
	"charge.dispute.created": async (e) =>
		handleDisputeCreated(getDispute(e)),
	"charge.dispute.closed": async (e) =>
		handleDisputeClosed(getDispute(e)),
};

/**
 * Dispatch un événement au handler approprié
 * @returns Le résultat du handler avec les tâches post-webhook, ou un résultat "skipped" si non géré
 */
export async function dispatchEvent(event: Stripe.Event): Promise<WebhookHandlerResult | null> {
	const handler = eventHandlers[event.type as SupportedStripeEvent];

	if (!handler) {
		console.warn(`⚠️ [WEBHOOK] Unsupported event type: ${event.type} - ignoring`);
		return { success: true, skipped: true, reason: `Unsupported event: ${event.type}` };
	}

	return handler(event);
}

/**
 * Vérifie si un type d'événement est supporté
 */
export function isEventSupported(eventType: string): eventType is SupportedStripeEvent {
	return eventType in eventHandlers;
}
