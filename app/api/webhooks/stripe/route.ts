import { after } from "next/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/shared/lib/stripe";
import { Prisma, WebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import {
	MAX_WEBHOOK_RETRY_ATTEMPTS,
	STALE_PROCESSING_THRESHOLD_MS,
} from "@/modules/webhooks/constants/webhook.constants";
import { dispatchEvent, isEventSupported } from "@/modules/webhooks/utils/event-registry";
import {
	persistPostWebhookTasks,
	executePersistedTasksForEvent,
} from "@/modules/webhooks/services/post-webhook-tasks.service";
import { sendWebhookFailedAlert } from "@/modules/webhooks/services/alert.service";
import { logger } from "@/shared/lib/logger";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { STRIPE_WEBHOOK_LIMIT } from "@/shared/lib/rate-limit-config";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

/**
 * Webhook Stripe
 *
 * Sécurité et idempotence en couches indépendantes :
 *
 *  1. **Authenticité** (signature HMAC-SHA256 sur `${timestamp}.${body}` par Stripe).
 *     `stripe.webhooks.constructEvent` rejette tout payload dont la signature
 *     ne valide pas — clé : `STRIPE_WEBHOOK_SECRET`. Sans la clé, un attaquant
 *     ne peut PAS forger un timestamp signé valide.
 *
 *  2. **Anti-replay temporel** (tolérance 300s du SDK sur le timestamp signé).
 *     Un payload capté est rejouable PENDANT 5 minutes — au-delà, le SDK le
 *     rejette comme "timestamp outside the tolerance zone". Les retries
 *     légitimes de Stripe (1h/3h/6h backoff) passent car Stripe re-signe le
 *     payload à chaque retry avec un nouveau timestamp.
 *     ⚠️ Un attaquant qui intercepte un payload signé peut le rejouer pendant
 *     5min — mitigé par la couche 3 ci-dessous.
 *
 *  3. **Anti-replay applicatif** (par `event.id`). `WebhookEvent.stripeEventId`
 *     est UNIQUE en DB. Un même `evt_xxx` n'est traité qu'une fois (status
 *     PROCESSING frais/COMPLETED/SKIPPED → skip). Couvre :
 *       - le replay malveillant pendant la fenêtre 5min
 *       - les retries Stripe légitimes après timeout 200
 *       - les doublons cross-instance Vercel concurrents via deux gardes ciblées :
 *         (a) catch P2002 sur l'`upsert` quand deux threads tentent la branche
 *             CREATE simultanément (1ère insertion) ;
 *         (b) race-guard post-upsert (`existingEvent === null && attempts >= 1`)
 *             quand un thread a inséré entre le findUnique et l'upsert d'un autre.
 *       - la reprise d'un PROCESSING périmé (lambda crashée) sans avaler le retry
 *         Stripe NI barger-in sur un traitement concurrent : la fraîcheur est
 *         mesurée sur `processingStartedAt` (WEBHOOK-AUDIT-002), (re)posé à chaque
 *         passage en PROCESSING par la route ET le cron retry-webhooks, de sorte
 *         qu'une reprise fraîche court-circuite les arrivants pendant son exécution.
 *
 *  4. **Idempotence métier** (downstream) :
 *       - `Order.stripePaymentIntentId @unique` → pas de double order par PI
 *       - `Order.paymentStatus === "PAID"` guard → pas de double décrément stock
 *       - `Refund.stripeRefundId @unique` → pas de double refund
 *       - Advisory locks Postgres sur la numérotation facture/avoir
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
			select: { id: true, status: true, receivedAt: true, processingStartedAt: true },
		});

		// WEBHOOK-AUDIT-001 : un PROCESSING « frais » signale un traitement live
		// concurrent (autre instance Vercel ou cron retry-webhooks) → on court-circuite
		// pour éviter le double-dispatch. Mais un PROCESSING « périmé »
		// (> STALE_PROCESSING_THRESHOLD_MS, soit bien au-delà du maxDuration=60s de la
		// route) trahit une lambda crashée en plein dispatch : si on renvoyait 200
		// "duplicate", on AVALERAIT le retry légitime de Stripe (Stripe considère l'event
		// traité et arrête de réessayer), laissant la commande/refund/litige bloqué
		// jusqu'au reset du cron. On laisse donc l'upsert ci-dessous reprendre la main.
		//
		// WEBHOOK-AUDIT-002 : la fraîcheur se mesure sur `processingStartedAt` (DÉBUT du
		// traitement courant, (re)posé à chaque passage en PROCESSING), PAS sur
		// `receivedAt` (1ère réception, jamais rafraîchie). Sinon un PROCESSING
		// fraîchement repris par le cron retry-webhooks (receivedAt ancien) était vu
		// « périmé » par une redélivrance Stripe concurrente, qui barge-in et
		// double-dispatchait l'event pendant que le cron le traitait encore. Fallback
		// `receivedAt` pour les lignes legacy (processingStartedAt NULL avant migration).
		const processingSince = existingEvent?.processingStartedAt ?? existingEvent?.receivedAt ?? null;
		const isStaleProcessing =
			existingEvent?.status === WebhookEventStatus.PROCESSING &&
			processingSince !== null &&
			Date.now() - processingSince.getTime() > STALE_PROCESSING_THRESHOLD_MS;

		if (
			existingEvent?.status === WebhookEventStatus.COMPLETED ||
			existingEvent?.status === WebhookEventStatus.SKIPPED ||
			(existingEvent?.status === WebhookEventStatus.PROCESSING && !isStaleProcessing)
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
					// WEBHOOK-AUDIT-002 : démarre l'horloge de fraîcheur du traitement courant.
					processingStartedAt: new Date(),
				},
				update: {
					attempts: { increment: 1 },
					status: WebhookEventStatus.PROCESSING,
					// WEBHOOK-AUDIT-002 : une reprise (PROCESSING périmé / FAILED) redémarre
					// l'horloge → une redélivrance Stripe concurrente la verra fraîche et
					// court-circuitera au lieu de double-dispatcher.
					processingStartedAt: new Date(),
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

			// 6. MARQUER COMME COMPLÉTÉ OU SKIPPED + persister les post-tasks (ORD-STRIPE-003)
			// Atomique : si la persist échoue, l'event reste PROCESSING → retry-webhooks
			// le repop. Si la persist réussit, les tasks survivront à un crash lambda
			// dans le after() qui suit (cron retry-post-webhook-tasks les rattrape).
			const finalStatus = result?.skipped
				? WebhookEventStatus.SKIPPED
				: WebhookEventStatus.COMPLETED;
			const tasks = result?.tasks ?? [];
			await prisma.$transaction(async (tx) => {
				await tx.webhookEvent.update({
					where: { id: webhookRecord.id },
					data: {
						status: finalStatus,
						processedAt: new Date(),
					},
				});
				if (tasks.length > 0) {
					await persistPostWebhookTasks(tx, webhookRecord.id, tasks);
				}
			});

			// 7. RÉPONSE RAPIDE + TRAITEMENT ASYNC (Best Practice Stripe 2025)
			const response = NextResponse.json({ received: true, status: "processed" });

			if (tasks.length > 0) {
				after(async () => {
					logger.info(`Executing ${tasks.length} persisted post-webhook tasks`, {
						correlationId,
						eventType: event.type,
					});
					const stats = await executePersistedTasksForEvent(webhookRecord.id);
					logger.info("Post-webhook tasks executed", {
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
