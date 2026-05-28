import { headers } from "next/headers";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Prisma, ProviderWebhookEventStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { checkRateLimit, getClientIp } from "@/shared/lib/rate-limit";
import { PDP_WEBHOOK_LIMIT } from "@/shared/lib/rate-limit-config";
import { getInvoiceProvider } from "@/modules/invoices/providers/factory";

export const maxDuration = 30;

/**
 * Webhook entrant émis par la plateforme agréée (PDP/PA) — Phase 5.
 *
 * Mirror exact du pattern Stripe (`app/api/webhooks/stripe/route.ts`) :
 * - Rate-limit IP AVANT verify signature (anti-CPU-drain).
 * - Signature déléguée à `provider.handleProviderWebhook(payload)` (provider-specific).
 * - Idempotence via `ProviderWebhookEvent.(provider, externalEventId) @@unique`.
 * - Upsert atomique + race-guard post-upsert.
 * - Statuts PROCESSING/COMPLETED/FAILED/SKIPPED + retry cron.
 * - Sentry fingerprint `["webhook", "pdp", providerId, eventType]`.
 *
 * Tant qu'aucun provider concret n'est branché (`INVOICE_PROVIDER=local`), cette
 * route répond 503 explicitement — `LocalPdfProvider.handleProviderWebhook`
 * throw délibérément (cf. modules/invoices/providers/local-pdf.provider.ts).
 */
export async function POST(req: Request, { params }: { params: Promise<{ providerId: string }> }) {
	const { providerId } = await params;
	const correlationId = crypto.randomUUID().slice(0, 8);

	try {
		logger.info("Incoming PDP webhook request", { correlationId, providerId });

		const headersList = await headers();

		// Rate-limit AVANT toute parse — anti-CPU-drain signatures invalides
		const ipAddress = await getClientIp(headersList);
		const rateCheck = await checkRateLimit(
			`pdp-webhook:${providerId}:${ipAddress ?? "unknown"}`,
			PDP_WEBHOOK_LIMIT,
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

		// Verify provider is configured + matches the route segment.
		// Le factory env-driven garantit que le provider runtime correspond
		// à INVOICE_PROVIDER. Si un attaquant frappe /api/webhooks/pdp/random,
		// on rejette 404 sans révéler la liste des providers supportés.
		let provider;
		try {
			provider = getInvoiceProvider();
		} catch (e) {
			logger.warn("PDP webhook hit but provider factory threw", {
				correlationId,
				providerId,
				error: e instanceof Error ? e.message : String(e),
			});
			return NextResponse.json({ error: "Provider not configured" }, { status: 503 });
		}

		if (provider.id !== providerId) {
			logger.warn("PDP webhook segment mismatch with active provider", {
				correlationId,
				providerId,
				activeProviderId: provider.id,
			});
			return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
		}

		const body = await req.text();
		let payload: unknown;
		try {
			payload = JSON.parse(body);
		} catch {
			return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
		}

		// Délégation au provider pour vérifier la signature + extraire l'event.
		// Si la signature est invalide, le provider throw → 400 sans persister.
		let event;
		try {
			event = await provider.handleProviderWebhook(payload);
		} catch (e) {
			logger.warn("PDP webhook signature or payload invalid", {
				correlationId,
				providerId,
				error: e instanceof Error ? e.message : String(e),
			});
			return NextResponse.json({ error: "Invalid signature or payload" }, { status: 400 });
		}

		const externalEventId =
			event.providerInvoiceId || `${event.eventType}:${event.receivedAt.toISOString()}`;

		// Idempotence DB-level.
		const existing = await prisma.providerWebhookEvent.findUnique({
			where: { provider_externalEventId: { provider: providerId, externalEventId } },
			select: { id: true, status: true },
		});

		if (
			existing?.status === ProviderWebhookEventStatus.COMPLETED ||
			existing?.status === ProviderWebhookEventStatus.SKIPPED ||
			existing?.status === ProviderWebhookEventStatus.PROCESSING
		) {
			logger.info("PDP event already processed, skipping", {
				correlationId,
				providerId,
				externalEventId,
				status: existing.status,
			});
			return NextResponse.json({ received: true, status: "duplicate" });
		}

		let record;
		try {
			record = await prisma.providerWebhookEvent.upsert({
				where: { provider_externalEventId: { provider: providerId, externalEventId } },
				create: {
					provider: providerId,
					externalEventId,
					eventType: event.eventType,
					status: ProviderWebhookEventStatus.PROCESSING,
					payloadSnapshot: payload as Prisma.InputJsonValue,
				},
				update: {
					attempts: { increment: 1 },
					status: ProviderWebhookEventStatus.PROCESSING,
				},
			});
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
				return NextResponse.json({ received: true, status: "duplicate" });
			}
			throw e;
		}

		try {
			// Note : aucun handler concret n'est branché aujourd'hui — le payload
			// décodé `event` est persisté en SKIPPED tant que les services métier
			// downstream ne sont pas câblés. Dès qu'une PDP réelle sera signée,
			// l'orchestration appellera `persistPdpTransmission()` ou
			// `markInvoiceAccepted()` selon `event.status`.
			await prisma.providerWebhookEvent.update({
				where: { id: record.id },
				data: {
					status: ProviderWebhookEventStatus.SKIPPED,
					processedAt: new Date(),
				},
			});

			logger.info("PDP webhook acknowledged (no handler wired yet)", {
				correlationId,
				providerId,
				externalEventId,
				eventType: event.eventType,
				eventStatus: event.status,
			});

			return NextResponse.json({ received: true, status: "acknowledged" });
		} catch (error) {
			await prisma.providerWebhookEvent.update({
				where: { id: record.id },
				data: {
					status: ProviderWebhookEventStatus.FAILED,
					errorMessage: error instanceof Error ? error.message : String(error),
					processedAt: new Date(),
				},
			});

			Sentry.withScope((scope) => {
				scope.setTag("pdpProvider", providerId);
				scope.setTag("pdpEventType", event.eventType);
				scope.setFingerprint(["webhook", "pdp", providerId, event.eventType]);
				scope.setLevel("error");
				Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
			});

			logger.error("Error processing PDP webhook event", error, {
				correlationId,
				providerId,
				externalEventId,
				eventType: event.eventType,
			});
			throw error;
		}
	} catch (error) {
		logger.error("Unhandled error in PDP webhook handler", error, {
			correlationId,
			providerId,
		});
		Sentry.withScope((scope) => {
			scope.setTag("pdpProvider", providerId);
			scope.setTag("webhookHandler", "pdp-outer-catch");
			scope.setLevel("error");
			scope.setFingerprint(["webhook", "pdp", providerId, "outer-catch"]);
			Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
		});
		return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
	}
}
