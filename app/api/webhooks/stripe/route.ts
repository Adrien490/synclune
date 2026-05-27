import { after } from "next/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/shared/lib/stripe";
import { Prisma, WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { MAX_WEBHOOK_RETRY_ATTEMPTS } from "@/modules/webhooks/constants/webhook.constants";
import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";
import { executePostWebhookTasks } from "@/modules/webhooks/utils/execute-post-tasks";
import { sendWebhookFailedAlert } from "@/modules/webhooks/services/alert.service";
import { logger } from "@/shared/lib/logger";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { STRIPE_WEBHOOK_LIMIT } from "@/shared/lib/rate-limit-config";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

/**
 * Webhook Stripe
 *
 * Gère les événements Stripe de manière idempotente.
 * L'idempotence est assurée par :
 * - Anti-replay via signature timestamp (constructEvent, tolerance 300s SDK Stripe)
 * - WebhookEvent model en DB (évite les doublons sur le même event.id)
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

		// 1.5 Rate limit AVANT signature verify (anti-CPU-drain sur signatures invalides)
		const ipAddress = await getClientIp(headersList);
		const rateCheck = await checkRateLimit(
			`stripe-webhook:${ipAddress ?? "unknown"}`,
			STRIPE_WEBHOOK_LIMIT,
			ipAddress,
		);
		if (!rateCheck.success) {
			return NextResponse.json(
				{ error: "Rate limit exceeded" },
				{
					status: 429,
					headers: { "Retry-After": String(rateCheck.retryAfter ?? 60) },
				},
			);
		}

		// 2. Vérification de la signature (CRITIQUE - Sécurité + anti-replay).
		// `constructEvent()` valide le `Stripe-Signature` header dont le
		// timestamp est SIGNÉ par Stripe (HMAC-SHA256 sur `${timestamp}.${body}`).
		// Le SDK applique une tolérance par défaut de 300 secondes sur ce
		// timestamp, ce qui couvre l'anti-replay : un attaquant rejouant un
		// payload >5min ne pourra pas regénérer un timestamp signé valide.
		// Stripe regénère le header à chaque retry, donc les retries légitimes
		// (1h/3h/6h backoff) passent malgré un `event.created` ancien.
		// ORD-STRIPE-003 : on a retiré l'ancien check `event.created > 300s`
		// qui rejetait les retries Stripe légitimes en plus du replay malveillant.
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
		} catch {
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		// 3. IDEMPOTENCE DB-LEVEL (WebhookEvent Model)
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

		// Race-guard post-upsert : si findUnique a vu null mais l'upsert a hit la branche
		// update (attempts >= 1), un thread concurrent vient de créer le record entre les
		// deux appels. On skip le dispatch ; les contraintes @unique downstream protègent
		// déjà l'idempotence mais ce guard évite le double-traitement explicite.
		if (existingEvent === null && webhookRecord.attempts >= 1) {
			logger.info("Concurrent webhook race detected (post-upsert), skipping dispatch", {
				correlationId,
				eventId: event.id,
				eventType: event.type,
			});
			return NextResponse.json({ received: true, status: "duplicate" });
		}

		try {
			// 4. Skip unsupported event types (avoid TypeError + infinite Stripe retries)
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

			// 5. Dispatch au handler approprié
			const result = await Sentry.startSpan({ name: `webhook.${event.type}`, op: "webhook" }, () =>
				dispatchEvent(event),
			);

			// 6. MARQUER COMME COMPLÉTÉ OU SKIPPED
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

			// 7. RÉPONSE RAPIDE + TRAITEMENT ASYNC (Best Practice Stripe 2025)
			const response = NextResponse.json({ received: true, status: "processed" });

			const tasks = result?.tasks;
			if (tasks?.length) {
				after(async () => {
					logger.info(`Executing ${tasks.length} post-webhook tasks`, {
						correlationId,
						eventType: event.type,
					});
					const stats = await executePostWebhookTasks(tasks);
					logger.info("Post-webhook tasks completed", {
						correlationId,
						eventType: event.type,
						successful: stats.successful,
						failed: stats.failed,
						total: tasks.length,
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
				Sentry.withScope((scope) => {
					scope.setLevel("warning");
					scope.setTag("webhookEventType", event.type);
					scope.setTag("webhookExhausted", "true");
					scope.setFingerprint(["webhook", "max-retries-exhausted", event.type]);
					scope.setContext("webhook", {
						eventId: event.id,
						attempts: webhookRecord.attempts + 1,
						maxAttempts: MAX_WEBHOOK_RETRY_ATTEMPTS,
					});
					Sentry.captureMessage("Webhook max retries exhausted", "warning");
				});
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
	} catch (error) {
		logger.error("Unhandled error in webhook POST handler", error, { correlationId });
		Sentry.withScope((scope) => {
			scope.setTag("webhookHandler", "route-outer-catch");
			scope.setLevel("error");
			scope.setFingerprint(["webhook", "route-outer-catch"]);
			Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
		});
		return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
	}
}
