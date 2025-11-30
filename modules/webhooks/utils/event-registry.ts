import type Stripe from "stripe";
import type { WebhookHandlerResult, SupportedStripeEvent } from "../types/webhook.types";

// Import handlers
import { handleCheckoutSessionCompleted, handleCheckoutSessionExpired } from "../handlers/checkout-handlers";
import { handlePaymentSuccess, handlePaymentFailure, handlePaymentCanceled } from "../handlers/payment-handlers";
import { handleChargeRefunded, handleRefundUpdated, handleRefundFailed } from "../handlers/refund-handlers";
import { handleAsyncPaymentSucceeded, handleAsyncPaymentFailed } from "../handlers/async-payment-handlers";
import { handleDisputeCreated } from "../handlers/dispute-handlers";
import { handleInvoiceFinalized, handleInvoicePaid, handleInvoicePaymentFailed } from "../handlers/invoice-handlers";

type EventHandler = (event: Stripe.Event) => Promise<WebhookHandlerResult | null>;

/**
 * Registry des handlers par type d'événement
 * Chaque handler reçoit l'événement Stripe et retourne optionnellement des tâches post-webhook
 */
const eventHandlers: Record<SupportedStripeEvent, EventHandler> = {
	// === CHECKOUT ===
	"checkout.session.completed": async (e) =>
		handleCheckoutSessionCompleted(e.data.object as Stripe.Checkout.Session),
	"checkout.session.expired": async (e) => {
		await handleCheckoutSessionExpired(e.data.object as Stripe.Checkout.Session);
		return null;
	},

	// === PAYMENT INTENT ===
	"payment_intent.succeeded": async (e) => {
		await handlePaymentSuccess(e.data.object as Stripe.PaymentIntent);
		return null;
	},
	"payment_intent.payment_failed": async (e) => {
		await handlePaymentFailure(e.data.object as Stripe.PaymentIntent);
		return null;
	},
	"payment_intent.canceled": async (e) => {
		await handlePaymentCanceled(e.data.object as Stripe.PaymentIntent);
		return null;
	},

	// === REFUND ===
	"charge.refunded": async (e) => {
		await handleChargeRefunded(e.data.object as Stripe.Charge);
		return null;
	},
	"refund.created": async (e) => {
		await handleRefundUpdated(e.data.object as Stripe.Refund);
		return null;
	},
	"refund.updated": async (e) => {
		await handleRefundUpdated(e.data.object as Stripe.Refund);
		return null;
	},
	"refund.failed": async (e) => {
		await handleRefundFailed(e.data.object as Stripe.Refund);
		return null;
	},

	// === ASYNC PAYMENT (SEPA, Sofort, etc.) ===
	"checkout.session.async_payment_succeeded": async (e) =>
		handleAsyncPaymentSucceeded(e.data.object as Stripe.Checkout.Session),
	"checkout.session.async_payment_failed": async (e) => {
		await handleAsyncPaymentFailed(e.data.object as Stripe.Checkout.Session);
		return null;
	},

	// === DISPUTE / CHARGEBACK ===
	"charge.dispute.created": async (e) => {
		await handleDisputeCreated(e.data.object as Stripe.Dispute);
		return null;
	},

	// === INVOICE ===
	"invoice.finalized": async (e) => {
		await handleInvoiceFinalized(e.data.object as Stripe.Invoice);
		return null;
	},
	"invoice.paid": async (e) => {
		await handleInvoicePaid(e.data.object as Stripe.Invoice);
		return null;
	},
	"invoice.payment_failed": async (e) => {
		await handleInvoicePaymentFailed(e.data.object as Stripe.Invoice);
		return null;
	},
};

/**
 * Dispatch un événement au handler approprié
 * @returns Le résultat du handler avec les tâches post-webhook, ou null si non géré
 */
export async function dispatchEvent(event: Stripe.Event): Promise<WebhookHandlerResult | null> {
	const handler = eventHandlers[event.type as SupportedStripeEvent];
	if (!handler) {
		return null;
	}
	return handler(event);
}

/**
 * Vérifie si un type d'événement est supporté
 */
export function isEventSupported(eventType: string): eventType is SupportedStripeEvent {
	return eventType in eventHandlers;
}
