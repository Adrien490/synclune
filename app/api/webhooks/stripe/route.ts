import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/shared/lib/stripe";
import { logger } from "@/shared/lib/logger";

export const maxDuration = 60;

/**
 * Webhook Stripe — STUB (migration lean, lot 2).
 *
 * TODO lot 3 : traiter `checkout.session.completed` (PENDING → PAID) et
 * `checkout.session.expired` (PENDING → CANCELLED + restock). Idempotence par
 * `Order.stripeSessionId @unique` + gardes de transition `updateMany` — plus de
 * table WebhookEvent (perte volontaire § 1).
 *
 * En attendant : la signature est vérifiée (authenticité + anti-replay 300 s du
 * SDK), l'événement est journalisé puis acquitté en 200 pour que Stripe ne
 * retente pas en boucle pendant la migration.
 */
export async function POST(request: Request) {
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!webhookSecret) {
		logger.error("STRIPE_WEBHOOK_SECRET manquant", { service: "webhook" });
		return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
	}

	const signature = (await headers()).get("stripe-signature");
	if (!signature) {
		return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
	}

	const body = await request.text();

	let eventType: string;
	try {
		const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		eventType = event.type;
	} catch {
		return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
	}

	logger.info(`[WEBHOOK][STUB lot 2] Événement ${eventType} acquitté sans traitement`, {
		service: "webhook",
	});

	return NextResponse.json({ received: true, stub: true });
}
