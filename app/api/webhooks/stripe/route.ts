import { after } from "next/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/shared/lib/stripe";
import { Prisma, WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { ANTI_REPLAY_WINDOW_SECONDS } from "@/modules/webhooks/constants/webhook.constants";
import { MAX_WEBHOOK_RETRY_ATTEMPTS } from "@/modules/cron/constants/limits";
import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";
import { executePostWebhookTasks } from "@/modules/webhooks/utils/execute-post-tasks";
import { sendWebhookFailedAlert } from "@/modules/webhooks/services/alert.service";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

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
		logger.info("Incoming webhook request", { correlationId });

		// 1. Validation des variables d'environnement
		if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
			logger.error("Stripe configuration missing", undefined, { correlationId });
			return NextResponse.json({ error: "Internal server error" }, { status: 500 });
		}

		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

		const body = await req.text();
		const headersList = await headers();
		const signature = headersList.get("stripe-signature");

		if (!signature) {
			return NextResponse.json({ error: "No signature" }, { status: 400 });
		}

		// 2. Vérification de la signature (CRITIQUE - Sécurité)
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch {
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		// 3. ANTI-REPLAY CHECK (Best Practice Stripe 2025)
		const eventAgeSeconds = Math.floor(Date.now() / 1000) - event.created;
		if (eventAgeSeconds > ANTI_REPLAY_WINDOW_SECONDS) {
			logger.warn("Event too old, rejecting for anti-replay", {
				correlationId,
				eventId: event.id,
				eventType: event.type,
				eventAgeSeconds,
			});
			return NextResponse.json(
				{ error: "Event too old (anti-replay protection)" },
				{ status: 400 },
			);
		}

		// 4. IDEMPOTENCE DB-LEVEL (WebhookEvent Model)
		const existingEvent = await prisma.webhookEvent.findUnique({
			where: { stripeEventId: event.id },
			select: { id: true, status: true },
		});

		if (
			existingEvent?.status === WebhookEventStatus.COMPLETED ||
			existingEvent?.status === WebhookEventStatus.SKIPPED ||
			existingEvent?.status === WebhookEventStatus.PROCESSING
		) {
			logger.info("Event already processed, skipping", {
				correlationId,
				eventId: event.id,
				eventType: event.type,
				status: existingEvent.status,
			});
			return NextResponse.json({ received: true, status: "duplicate" });
		}

		// Enregistrer l'événement comme PROCESSING (atomic upsert)
		// Catch P2002 unique constraint violation on concurrent identical webhooks
		// to return 200 instead of 500, avoiding unnecessary Stripe retries
		let webhookRecord;
		try {
			webhookRecord = await prisma.webhookEvent.upsert({
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
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
				logger.info("Concurrent duplicate webhook detected, returning 200", {
					correlationId,
					eventId: event.id,
					eventType: event.type,
				});
				return NextResponse.json({ received: true, status: "duplicate" });
			}
			throw e;
		}

		try {
			// 5. Skip unsupported event types (avoid TypeError + infinite Stripe retries)
			if (!isEventSupported(event.type)) {
				logger.info("Unsupported event type, skipping", {
					correlationId,
					eventId: event.id,
					eventType: event.type,
				});
				await prisma.webhookEvent.update({
					where: { id: webhookRecord.id },
					data: {
						status: WebhookEventStatus.SKIPPED,
						processedAt: new Date(),
					},
				});
				return NextResponse.json({ received: true, status: "skipped" });
			}

			// 6. Dispatch au handler approprié
			const result = await Sentry.startSpan({ name: `webhook.${event.type}`, op: "webhook" }, () =>
				dispatchEvent(event),
			);

			// 7. MARQUER COMME COMPLÉTÉ OU SKIPPED
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

			// 8. RÉPONSE RAPIDE + TRAITEMENT ASYNC (Best Practice Stripe 2025)
			const response = NextResponse.json({ received: true, status: "processed" });

			const tasks = result?.tasks;
			if (tasks?.length) {
				after(async () => {
					logger.info(`Executing ${tasks.length} post-webhook tasks`, {
						correlationId,
						eventType: event.type,
					});
					await executePostWebhookTasks(tasks);
					logger.info("Post-webhook tasks completed", {
						correlationId,
						eventType: event.type,
					});
				});
			}

			logger.info("Webhook processed successfully", {
				correlationId,
				eventType: event.type,
				eventId: event.id,
			});

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

			logger.error("Error processing webhook event", error, {
				correlationId,
				eventType: event.type,
				eventId: event.id,
				attempts: webhookRecord.attempts,
			});
			throw error;
		}
	} catch {
		return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
	}
}
