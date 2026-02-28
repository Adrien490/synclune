import { after } from "next/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/shared/lib/stripe";
import { WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { ANTI_REPLAY_WINDOW_SECONDS } from "@/modules/webhooks/constants/webhook.constants";
import { MAX_WEBHOOK_RETRY_ATTEMPTS } from "@/modules/cron/constants/limits";
import { dispatchEvent } from "@/modules/webhooks/utils/event-registry";
import { executePostWebhookTasks } from "@/modules/webhooks/utils/execute-post-tasks";
import { sendWebhookFailedAlert } from "@/modules/webhooks/services/alert.service";

/**
 * Webhook Stripe
 *
 * Gère les événements Stripe de manière idempotente.
 * L'idempotence est assurée par :
 * - Anti-replay check (5 min window)
 * - WebhookEvent model en DB (évite les doublons)
 * - Order.paymentStatus === "PAID" (évite double décrémentation stock)
 * - Refund.stripeRefundId @unique (évite double remboursement)
 */
export async function POST(req: Request) {
	const correlationId = crypto.randomUUID().slice(0, 8);

	try {
		console.log(`📥 [webhook:${correlationId}] Incoming webhook request`);

		// 1. Validation des variables d'environnement
		if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
			console.error(`❌ [webhook:${correlationId}] Stripe configuration missing`);
			return NextResponse.json({ error: "Stripe configuration missing" }, { status: 500 });
		}

		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		const body = await req.text();
		const headersList = await headers();
		const signature = headersList.get("stripe-signature");

		if (!signature) {
			return NextResponse.json({ error: "No signature" }, { status: 400 });
		}

		// 2. 🔴 Vérification de la signature (CRITIQUE - Sécurité)
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch {
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		// 3. 🔴 ANTI-REPLAY CHECK (Best Practice Stripe 2025)
		// Rejeter les événements trop anciens pour éviter les attaques de replay
		const eventAgeSeconds = Math.floor(Date.now() / 1000) - event.created;
		if (eventAgeSeconds > ANTI_REPLAY_WINDOW_SECONDS) {
			console.warn(
				`⚠️ [webhook:${correlationId}] Event too old (${eventAgeSeconds}s), rejecting for anti-replay:`,
				event.id,
			);
			return NextResponse.json(
				{ error: "Event too old (anti-replay protection)" },
				{ status: 400 },
			);
		}

		// 4. 🔴 IDEMPOTENCE DB-LEVEL (WebhookEvent Model)
		// Vérifie si l'événement a déjà été traité pour éviter les doublons
		const existingEvent = await prisma.webhookEvent.findUnique({
			where: { stripeEventId: event.id },
			select: { id: true, status: true },
		});

		if (
			existingEvent?.status === WebhookEventStatus.COMPLETED ||
			existingEvent?.status === WebhookEventStatus.SKIPPED
		) {
			console.log(
				`⏭️ [webhook:${correlationId}] Event already processed (${existingEvent.status}):`,
				event.id,
			);
			return NextResponse.json({ received: true, status: "duplicate" });
		}

		// Enregistrer l'événement comme PROCESSING (atomic upsert)
		const webhookRecord = await prisma.webhookEvent.upsert({
			where: { stripeEventId: event.id },
			create: {
				stripeEventId: event.id,
				eventType: event.type,
				status: WebhookEventStatus.PROCESSING,
			},
			update: {
				attempts: { increment: 1 },
				status: WebhookEventStatus.PROCESSING,
			},
		});

		try {
			// 5. Dispatch au handler approprié
			const result = await dispatchEvent(event);

			// 6. 🔴 MARQUER COMME COMPLÉTÉ OU SKIPPED
			const finalStatus = result?.skipped
				? WebhookEventStatus.SKIPPED
				: WebhookEventStatus.COMPLETED;
			await prisma.webhookEvent.update({
				where: { id: webhookRecord.id },
				data: {
					status: finalStatus,
					processedAt: new Date(),
				},
			});

			// 7. 🔴 RÉPONSE RAPIDE + TRAITEMENT ASYNC (Best Practice Stripe 2025)
			// Retourner 200 immédiatement, puis exécuter les tâches en arrière-plan
			const response = NextResponse.json({ received: true, status: "processed" });

			// Exécuter les tâches post-webhook (emails, cache) via after()
			// Ne bloque pas la réponse au webhook
			const tasks = result?.tasks;
			if (tasks?.length) {
				after(async () => {
					console.log(`📧 [webhook:${correlationId}] Executing ${tasks.length} post-webhook tasks`);
					await executePostWebhookTasks(tasks);
					console.log(`📧 [webhook:${correlationId}] Post-webhook tasks completed`);
				});
			}

			console.log(`✅ [webhook:${correlationId}] ${event.type} processed successfully`);

			return response;
		} catch (error) {
			// Marquer l'événement comme FAILED
			await prisma.webhookEvent.update({
				where: { id: webhookRecord.id },
				data: {
					status: WebhookEventStatus.FAILED,
					errorMessage: error instanceof Error ? error.message : String(error),
					processedAt: new Date(),
				},
			});

			// Alert admin if too many failed attempts
			if (webhookRecord.attempts >= MAX_WEBHOOK_RETRY_ATTEMPTS - 1) {
				after(async () => {
					await sendWebhookFailedAlert({
						eventId: event.id,
						eventType: event.type,
						attempts: webhookRecord.attempts + 1,
						error: error instanceof Error ? error.message : String(error),
					});
				});
			}

			console.error(`❌ [webhook:${correlationId}] Error processing webhook event:`, error);
			throw error;
		}
	} catch {
		return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
	}
}
