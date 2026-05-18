import type Stripe from "stripe";
import type { WebhookHandlerResult, SupportedStripeEvent } from "../types/webhook.types";

import {
	handleCheckoutSessionCompleted,
	handleCheckoutSessionExpired,
} from "../handlers/checkout-handlers";
import {
	handleChargeRefunded,
	handleRefundUpdated,
	handleRefundFailed,
} from "../handlers/refund-handlers";
import {
	handleAsyncPaymentSucceeded,
	handleAsyncPaymentFailed,
} from "../handlers/async-payment-handlers";
import { handleDisputeCreated, handleDisputeClosed } from "../handlers/dispute-handlers";

type EventHandler = (event: Stripe.Event) => Promise<WebhookHandlerResult | null>;

function getCheckoutSession(event: Stripe.Event): Stripe.Checkout.Session {
	return event.data.object as Stripe.Checkout.Session;
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
 * Registry des handlers par type d'événement Stripe.
 *
 * Migration Checkout Sessions (mai 2026) : les handlers `payment_intent.*` ont
 * été supprimés. La création d'Order passe désormais exclusivement par les
 * webhooks `checkout.session.*`.
 */
const eventHandlers: Record<SupportedStripeEvent, EventHandler> = {
	// === CHECKOUT ===
	"checkout.session.completed": async (e) => handleCheckoutSessionCompleted(getCheckoutSession(e)),
	"checkout.session.expired": async (e) => handleCheckoutSessionExpired(getCheckoutSession(e)),

	// === ASYNC PAYMENT (SEPA, Sofort, etc.) ===
	"checkout.session.async_payment_succeeded": async (e) =>
		handleAsyncPaymentSucceeded(getCheckoutSession(e)),
	"checkout.session.async_payment_failed": async (e) =>
		handleAsyncPaymentFailed(getCheckoutSession(e)),

	// === REFUND ===
	"charge.refunded": async (e) => handleChargeRefunded(getCharge(e)),
	"refund.created": async (e) => handleRefundUpdated(getRefund(e)),
	"refund.updated": async (e) => handleRefundUpdated(getRefund(e)),
	"refund.failed": async (e) => handleRefundFailed(getRefund(e)),

	// === DISPUTE (chargebacks) ===
	"charge.dispute.created": async (e) => handleDisputeCreated(getDispute(e)),
	"charge.dispute.closed": async (e) => handleDisputeClosed(getDispute(e)),
};

/**
 * Dispatch un événement au handler approprié.
 *
 * Garde interne `isEventSupported` : si un caller oublie son guard, on lève une
 * erreur explicite plutôt qu'un `TypeError: handler is not a function`.
 */
export async function dispatchEvent(event: Stripe.Event): Promise<WebhookHandlerResult | null> {
	if (!isEventSupported(event.type)) {
		throw new Error(
			`Unsupported event type: ${event.type} (call isEventSupported() before dispatchEvent)`,
		);
	}
	const handler = eventHandlers[event.type];
	return handler(event);
}

/**
 * Vérifie si un type d'événement est supporté
 */
export function isEventSupported(eventType: string): eventType is SupportedStripeEvent {
	return eventType in eventHandlers;
}
