import Stripe from "stripe";

/**
 * Injection d'events Checkout SIGNÉS sur le webhook local — la façon de
 * tester la suite du flux sans piloter la page hébergée Stripe (lot 7) :
 * `stripe-node` fournit `generateTestHeaderString`, la route vérifie la
 * vraie signature.
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

function getSecret(): string {
	const secret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!secret) {
		throw new Error("STRIPE_WEBHOOK_SECRET manquant — impossible de signer les events webhook.");
	}
	return secret;
}

async function postSignedEvent(payload: object): Promise<number> {
	const body = JSON.stringify(payload);
	const signature = Stripe.webhooks.generateTestHeaderString({
		payload: body,
		secret: getSecret(),
	});
	const response = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
		method: "POST",
		headers: { "content-type": "application/json", "stripe-signature": signature },
		body,
	});
	return response.status;
}

/** `checkout.session.completed` (paid) — PENDING → PAID + email. */
export async function completeSessionViaWebhook(params: {
	sessionId: string;
	email: string;
	name?: string;
}): Promise<number> {
	return postSignedEvent({
		id: `evt_e2e_${Date.now()}`,
		object: "event",
		api_version: "2026-06-24.dahlia",
		type: "checkout.session.completed",
		data: {
			object: {
				id: params.sessionId,
				object: "checkout.session",
				payment_status: "paid",
				status: "complete",
				payment_intent: `pi_e2e_${Date.now()}`,
				customer_email: null,
				customer_details: {
					email: params.email,
					name: params.name ?? "Cliente E2E",
					address: null,
					phone: null,
					tax_exempt: "none",
					tax_ids: [],
				},
				collected_information: {
					shipping_details: {
						name: params.name ?? "Cliente E2E",
						address: {
							line1: "1 rue du Test",
							line2: null,
							postal_code: "44000",
							city: "Nantes",
							country: "FR",
						},
					},
				},
			},
		},
	});
}

/** `checkout.session.expired` — PENDING → CANCELLED + restock. */
export async function expireSessionViaWebhook(sessionId: string): Promise<number> {
	return postSignedEvent({
		id: `evt_e2e_exp_${Date.now()}`,
		object: "event",
		api_version: "2026-06-24.dahlia",
		type: "checkout.session.expired",
		data: {
			object: {
				id: sessionId,
				object: "checkout.session",
				payment_status: "unpaid",
				status: "expired",
			},
		},
	});
}
