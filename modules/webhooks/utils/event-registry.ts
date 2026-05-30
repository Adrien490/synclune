import type Stripe from "stripe";
import type { WebhookHandlerResult, SupportedStripeEvent } from "../types/webhook.types";

// Import handlers
import {
	handlePaymentSuccess,
	handlePaymentFailure,
	handlePaymentCanceled,
	handlePaymentProcessing,
	handleInvoicePaymentFailed,
} from "../handlers/payment-handlers";
import {
	handleChargeRefunded,
	handleRefundUpdated,
	handleRefundFailed,
} from "../handlers/refund-handlers";
import {
	handleDisputeCreated,
	handleDisputeUpdated,
	handleDisputeClosed,
	handleDisputeFundsWithdrawn,
	handleDisputeFundsReinstated,
} from "../handlers/dispute-handlers";

type EventHandler = (event: Stripe.Event) => Promise<WebhookHandlerResult | null>;

/**
 * Type helpers pour extraire les données d'événements Stripe
 * NOTE: Stripe SDK ne fournit pas de type narrowing basé sur event.type
 * Ces assertions sont nécessaires et sûres car Stripe garantit le type par événement
 * @see https://stripe.com/docs/api/events/types
 */
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

function getInvoice(event: Stripe.Event): Stripe.Invoice {
	return event.data.object as Stripe.Invoice;
}

/**
 * Registry des handlers par type d'événement
 * Chaque handler reçoit l'événement Stripe et retourne optionnellement des tâches post-webhook
 * Les extracteurs (getCheckoutSession, etc.) documentent le type attendu par événement
 */
const eventHandlers: Record<SupportedStripeEvent, EventHandler> = {
	// === PAYMENT INTENT ===
	// Flow réel = Stripe Elements (PaymentIntents). Aucun Checkout Session n'est créé
	// (cf. initialize-payment.ts), donc aucun event `checkout.session.*` n'est émis —
	// les paiements différés (3DS, processing) transitent par `payment_intent.*`.
	"payment_intent.succeeded": async (e) => handlePaymentSuccess(getPaymentIntent(e)),
	"payment_intent.payment_failed": async (e) => handlePaymentFailure(getPaymentIntent(e)),
	"payment_intent.canceled": async (e) => handlePaymentCanceled(getPaymentIntent(e)),
	"payment_intent.processing": async (e) => handlePaymentProcessing(getPaymentIntent(e)),

	// === REFUND ===
	"charge.refunded": async (e) => handleChargeRefunded(getCharge(e)),
	"refund.created": async (e) => handleRefundUpdated(getRefund(e)),
	"refund.updated": async (e) => handleRefundUpdated(getRefund(e)),
	// Alias legacy : `charge.refund.updated` porte un objet Refund identique à
	// `refund.updated`. On le route vers le même handler pour ne pas dépendre de la
	// version d'API souscrite par l'endpoint Stripe (sinon désync silencieuse des
	// remboursements émis depuis le Dashboard — cf. audit webhooks 2026-05-30).
	"charge.refund.updated": async (e) => handleRefundUpdated(getRefund(e)),
	"refund.failed": async (e) => handleRefundFailed(getRefund(e)),

	// === DISPUTE (chargebacks) ===
	"charge.dispute.created": async (e) => handleDisputeCreated(getDispute(e)),
	"charge.dispute.updated": async (e) => handleDisputeUpdated(getDispute(e)),
	"charge.dispute.closed": async (e) => handleDisputeClosed(getDispute(e)),
	"charge.dispute.funds_withdrawn": async (e) => handleDisputeFundsWithdrawn(getDispute(e)),
	"charge.dispute.funds_reinstated": async (e) => handleDisputeFundsReinstated(getDispute(e)),

	// === INVOICE ===
	"invoice.payment_failed": async (e) => handleInvoicePaymentFailed(getInvoice(e)),
};

/**
 * Dispatch un événement au handler approprié
 * @returns Le résultat du handler avec les tâches post-webhook, ou un résultat "skipped" si non géré
 */
export async function dispatchEvent(event: Stripe.Event): Promise<WebhookHandlerResult | null> {
	const handler = eventHandlers[event.type as SupportedStripeEvent];

	return handler(event);
}

/**
 * Vérifie si un type d'événement est supporté
 */
export function isEventSupported(eventType: string): eventType is SupportedStripeEvent {
	return eventType in eventHandlers;
}

/**
 * Liste exhaustive des types d'événements réellement dispatchés par le registry.
 * Exposé pour le contract test (garde de complétude : tout type enregistré doit
 * avoir une fixture + un handler attendu testés, cf. test/contract/stripe-events.test.ts).
 */
export function getRegisteredEventTypes(): SupportedStripeEvent[] {
	return Object.keys(eventHandlers) as SupportedStripeEvent[];
}
