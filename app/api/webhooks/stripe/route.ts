import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
	cancelOrderFromExpiredSession,
	markOrderPaidFromSession,
} from "@/modules/webhooks/services/checkout-session-transitions.service";
import { revalidateTagsInBackground } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { stripe } from "@/shared/lib/stripe";

export const maxDuration = 60;

/**
 * Webhook Stripe — Checkout hébergé (migration lean, lot 3).
 *
 * Deux events traités (D4-D5) :
 * - `checkout.session.completed` (payment_status = paid) → PENDING → PAID +
 *   email de confirmation ;
 * - `checkout.session.expired` → PENDING → CANCELLED + restock.
 *
 * L'idempotence est portée par la garde de transition `updateMany` sur
 * `Order.stripeSessionId @unique` + `status: PENDING` — plus de table
 * WebhookEvent (perte volontaire § 1). Toute erreur de traitement répond 500 :
 * Stripe redélivre pendant 3 jours, et la redélivrance d'un event déjà traité
 * est un no-op. Pas de système de retry maison.
 *
 * ⚠️ Contexte route handler : `updateTag` THROW ici (E872) — l'invalidation
 * passe par `revalidateTagsInBackground` (`revalidateTag(tag, { expire: 0 })`).
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

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch {
		return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object;
				// Card-only : `completed` arrive payé. Un `payment_status` autre
				// (méthode différée) est acquitté sans transition — la
				// réconciliation admin rattrapera si besoin.
				if (session.payment_status !== "paid") {
					logger.warn("[webhook] checkout.session.completed non payé — ignoré", {
						service: "webhook",
						stripeSessionId: session.id,
						paymentStatus: session.payment_status,
					});
					break;
				}
				const result = await markOrderPaidFromSession(session);
				if (result.outcome === "transitioned") {
					revalidateTagsInBackground(result.tags);
					logger.info("[webhook] Commande payée", {
						service: "webhook",
						orderId: result.orderId ?? undefined,
					});
				}
				break;
			}

			case "checkout.session.expired": {
				const result = await cancelOrderFromExpiredSession(event.data.object.id);
				if (result.outcome === "transitioned") {
					revalidateTagsInBackground(result.tags);
					logger.info("[webhook] Session expirée — commande annulée et stock restitué", {
						service: "webhook",
						orderId: result.orderId ?? undefined,
					});
				}
				break;
			}

			default:
				// Event non écouté (config Stripe plus large que nécessaire) : 200.
				logger.info(`[webhook] Événement ${event.type} ignoré`, { service: "webhook" });
		}
	} catch (error) {
		logger.error(`[webhook] Échec de traitement ${event.type}`, {
			service: "webhook",
			eventId: event.id,
			error,
		});
		// 500 ⇒ Stripe redélivre ; la garde de transition rend le rejeu sûr.
		return NextResponse.json({ error: "Traitement échoué" }, { status: 500 });
	}

	return NextResponse.json({ received: true });
}
