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
import { executePostWebhookTasks } from "@/modules/webhooks/services/execute-post-webhook-tasks.service";
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
 *         (a) catch P2002 sur le `create` quand deux threads tentent la première
 *             insertion simultanément ;
 *         (b) claim OPTIMISTE (`updateMany` conditionné sur le couple
 *             `status` + `attempts` qu'on vient de lire) pour toute reprise :
 *             `claimed.count === 0` ⇒ un autre worker a repris l'event, on sort.
 *         ⚠️ Ce paragraphe décrivait un `upsert` et un race-guard
 *         `existingEvent === null && attempts >= 1` jusqu'à l'audit Stripe du
 *         2026-08-04 : IDEM-ROUTE-001 les a remplacés par la paire
 *         create/claim ci-dessous, précisément parce que l'`upsert` réécrivait
 *         PROCESSING sans ré-asserter l'état lu.
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
		const secretKey = process.env.STRIPE_SECRET_KEY;

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
		} catch (signatureError) {
			// L'échec de signature était avalé par un `catch {}` NU : ni log, ni Sentry.
			// C'est le seul événement de sécurité que cet endpoint puisse produire, et
			// il était invisible — impossible de distinguer « un secret de webhook
			// périmé après rotation » (tous les paiements cessent d'être enregistrés,
			// en silence) d'« un scanner qui tape l'URL ». La checklist de mise en
			// production de Stripe demande explicitement de journaliser côté marchand.
			//
			// ⚠️ On ne journalise NI le corps NI la signature : le payload porte des
			// données client, et la même checklist rappelle que les logs ne doivent
			// contenir aucune donnée confidentielle. Le message du SDK suffit à
			// séparer « timestamp hors tolérance » de « signature invalide ».
			const reason = signatureError instanceof Error ? signatureError.message : "unknown";
			logger.warn("Webhook signature verification failed", { correlationId, reason });
			Sentry.withScope((scope) => {
				scope.setLevel("warning");
				scope.setTag("webhookSignature", "invalid");
				scope.setFingerprint(["webhook", "invalid-signature"]);
				scope.setContext("webhook", { reason });
				Sentry.captureMessage("Webhook signature verification failed", "warning");
			});
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		// 2bis. Cohérence de mode (test ↔ live).
		//
		// La signature prouve que l'event vient bien de Stripe, PAS qu'il vient du
		// bon compte : un endpoint dont le `whsec_` de test traîne en production
		// accepterait des events de sandbox et muterait de vraies commandes. Le
		// `whsec_` ne portant aucun marqueur de mode, c'est `event.livemode` qui
		// ferme ce côté — l'env schema couvrant déjà la paire sk_/pk_.
		//
		// 200 `skipped` et non 4xx/5xx : l'event est authentique, il n'est
		// simplement pas pour nous. Un statut d'erreur déclencherait des retries
		// Stripe jusqu'à épuisement, sur un event qui ne sera jamais traitable.
		// ⚠️ On n'arbitre QUE si `livemode` est un booléen présent. Un event Stripe
		// réel le porte toujours, mais traiter son absence comme un désaccord
		// reviendrait à refuser un paiement sur une inférence — c'est-à-dire à faire
		// plus de dégâts que le défaut couvert, alors que la signature a déjà prouvé
		// l'authenticité. Un `!== expectsLiveEvents` nu faisait d'ailleurs échouer
		// tout payload sans le champ.
		const expectsLiveEvents = secretKey.startsWith("sk_live_");
		if (typeof event.livemode === "boolean" && event.livemode !== expectsLiveEvents) {
			logger.warn("Webhook livemode mismatch, skipping", {
				correlationId,
				eventId: event.id,
				eventType: event.type,
				eventLivemode: event.livemode,
				expectsLiveEvents,
			});
			Sentry.withScope((scope) => {
				scope.setLevel("warning");
				scope.setTag("webhookLivemodeMismatch", "true");
				scope.setFingerprint(["webhook", "livemode-mismatch"]);
				Sentry.captureMessage("Webhook livemode mismatch", "warning");
			});
			return NextResponse.json({ received: true, status: "skipped" });
		}

		// 3. IDEMPOTENCE DB-LEVEL (WebhookEvent Model)
		const existingEvent = await prisma.webhookEvent.findUnique({
			where: { stripeEventId: event.id },
			// IDEM-ROUTE-001 : `attempts` sert de version optimiste au claim ci-dessous.
			select: {
				id: true,
				status: true,
				attempts: true,
				receivedAt: true,
				processingStartedAt: true,
			},
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

		// Enregistrer l'événement comme PROCESSING.
		//
		// IDEM-ROUTE-001 (audit idempotence 2026-07-26) : l'ancien `upsert` écrivait
		// `PROCESSING` en branche `update` SANS ré-asserter le statut lu par le pré-check
		// ci-dessus, et le race-guard post-upsert n'armait que si l'event était absent.
		// Sur un event `FAILED`, la séquence « la route lit FAILED → un second
		// dispatcher claim FAILED→PROCESSING → la route écrit quand même » faisait
		// dispatcher les DEUX en parallèle. C'est la fenêtre qui rendait atteignables les
		// doublons handler-level (dont IDEM-DISPUTE-001, P0).
		//
		// On distingue donc les deux cas : `create` pour une première réception, sinon un
		// claim CONDITIONNEL sur l'état exact qu'on vient de lire (`status` + `attempts`
		// en version optimiste). Un seul gagnant, quel que soit le nombre de concurrents
		// — la garde reste nécessaire, deux redélivrances Stripe pouvant se croiser.
		let webhookRecord: { id: string; attempts: number };

		if (existingEvent === null) {
			try {
				const created = await prisma.webhookEvent.create({
					data: {
						stripeEventId: event.id,
						eventType: event.type,
						status: WebhookEventStatus.PROCESSING,
						// WEBHOOK-AUDIT-002 : démarre l'horloge de fraîcheur du traitement courant.
						processingStartedAt: new Date(),
					},
					select: { id: true, attempts: true },
				});
				webhookRecord = created;
			} catch (e) {
				// P2002 : un thread concurrent a créé le record entre le findUnique et ici.
				// 200 (et non 500) pour ne pas déclencher un retry Stripe inutile.
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
		} else {
			const claimed = await prisma.webhookEvent.updateMany({
				where: {
					id: existingEvent.id,
					// L'état lu doit être TOUJOURS celui-là au moment d'écrire ; sinon le
					// cron ou une autre instance a repris l'event entre-temps.
					status: existingEvent.status,
					attempts: existingEvent.attempts,
				},
				data: {
					attempts: { increment: 1 },
					status: WebhookEventStatus.PROCESSING,
					// WEBHOOK-AUDIT-002 : une reprise (PROCESSING périmé / FAILED) redémarre
					// l'horloge → une redélivrance Stripe concurrente la verra fraîche et
					// court-circuitera au lieu de double-dispatcher.
					processingStartedAt: new Date(),
				},
			});

			if (claimed.count === 0) {
				logger.info("Concurrent webhook claim lost, skipping dispatch", {
					correlationId,
					eventId: event.id,
					eventType: event.type,
					readStatus: existingEvent.status,
				});
				return NextResponse.json({ received: true, status: "duplicate" });
			}

			webhookRecord = { id: existingEvent.id, attempts: existingEvent.attempts + 1 };
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

			// 6. MARQUER COMME COMPLÉTÉ OU SKIPPED. Les post-tasks (emails + cache)
			// s'exécutent EN DIRECT dans le after() ci-dessous — la file durable
			// PostWebhookTask a été retirée au Lot 2 (SIMPLIFICATION.md S3.4) : le
			// crash de lambda entre le 200 et l'envoi se rattrape à la main (alerte
			// admin + resend-order-email), et la dédup reste portée par les clés
			// d'idempotence Resend 24 h.
			const finalStatus = result?.skipped
				? WebhookEventStatus.SKIPPED
				: WebhookEventStatus.COMPLETED;
			const tasks = result?.tasks ?? [];
			await prisma.webhookEvent.update({
				where: { id: webhookRecord.id },
				data: {
					status: finalStatus,
					processedAt: new Date(),
				},
			});

			// 7. Réponse, puis effets de bord différés.
			//
			// ⚠️ Ce commentaire annonçait « RÉPONSE RAPIDE + TRAITEMENT ASYNC (Best
			// Practice Stripe) » — ce que le code ne fait PAS et n'a jamais fait :
			// `dispatchEvent` est AWAITÉ plus haut, donc le 200 part après le
			// traitement métier complet. Seules les tâches post-webhook (emails,
			// invalidation de cache) passent par `after()`.
			//
			// C'est un choix, pas un oubli : accuser réception avant d'avoir traité
			// obligerait à une file durable pour ne pas perdre l'event si la lambda
			// meurt — or `PostWebhookTask` a justement été retirée (Lot 2). Traiter
			// en ligne fait porter la reprise par le retry de Stripe, qui est
			// durable par construction. `maxDuration = 60` couvre la fenêtre.
			const response = NextResponse.json({ received: true, status: "processed" });

			if (tasks.length > 0) {
				after(async () => {
					logger.info(`Executing ${tasks.length} post-webhook tasks`, {
						correlationId,
						eventType: event.type,
					});
					const stats = await executePostWebhookTasks(tasks);
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
