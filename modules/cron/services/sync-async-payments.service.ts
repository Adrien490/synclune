import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	createOrderFromCheckoutSession,
	retrieveCheckoutSessionForOrder,
} from "@/modules/webhooks/services/checkout.service";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

/**
 * Filet de sécurité pour les webhooks Stripe ratés.
 *
 * Avec la migration vers Checkout Sessions API, l'`Order` Synclune n'est créé
 * qu'au webhook `checkout.session.completed` (ou `async_payment_succeeded`
 * pour les paiements asynchrones type SEPA). Si ce webhook est perdu (panne
 * réseau, signature invalide, retry abandonné), ce cron rattrape les Sessions
 * payées sans `Order` correspondant et crée l'`Order` a posteriori.
 *
 * Le polling Stripe est restreint aux Sessions :
 * - créées entre 1h et 10 jours (fenêtre SEPA Direct Debit)
 * - status === "complete"
 * - payment_status === "paid"
 *
 * L'idempotence est assurée par `Order.stripeCheckoutSessionId @unique` :
 * un second appel ne dupliquera pas l'ordre.
 */
export async function syncAsyncPayments(): Promise<CronResult | null> {
	logger.info("Starting async checkout sessions sync", { cronJob: "sync-async-payments" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.error("STRIPE_SECRET_KEY not configured", undefined, {
			cronJob: "sync-async-payments",
		});
		return null;
	}

	const now = Math.floor(Date.now() / 1000);
	const minAgeSeconds = Math.floor(THRESHOLDS.ASYNC_PAYMENT_MIN_AGE_MS / 1000);
	const maxAgeSeconds = Math.floor(THRESHOLDS.ASYNC_PAYMENT_MAX_AGE_MS / 1000);

	let cursor: string | undefined;
	let updated = 0;
	let errors = 0;
	let skipped = 0;
	let scanned = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	scan: for (;;) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "sync-async-payments",
				scanned,
			});
			break;
		}

		const listResponse = await stripe.checkout.sessions.list(
			{
				limit: 100,
				created: { gte: now - maxAgeSeconds, lte: now - minAgeSeconds },
				...(cursor ? { starting_after: cursor } : {}),
			},
			{ timeout: STRIPE_TIMEOUT_MS },
		);

		for (const session of listResponse.data) {
			scanned++;

			if (session.status !== "complete" || session.payment_status !== "paid") {
				skipped++;
				continue;
			}

			const exists = await prisma.order.findUnique({
				where: { stripeCheckoutSessionId: session.id },
				select: { id: true },
			});
			if (exists) {
				skipped++;
				continue;
			}

			try {
				if (updated > 0 || errors > 0) {
					await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));
				}
				const fullSession = await retrieveCheckoutSessionForOrder(session.id);
				const order = await createOrderFromCheckoutSession(fullSession);
				logger.info("Recovered missing order from Stripe session", {
					cronJob: "sync-async-payments",
					sessionId: session.id,
					orderNumber: order.orderNumber,
				});
				updated++;
			} catch (error) {
				errors++;
				logger.error("Failed to recover order from session", error, {
					cronJob: "sync-async-payments",
					sessionId: session.id,
				});
			}

			if (scanned >= BATCH_SIZE_MEDIUM) {
				break scan;
			}
			if (Date.now() > deadline) {
				break scan;
			}
		}

		if (!listResponse.has_more) break;
		cursor = listResponse.data.at(-1)?.id;
		if (!cursor) break;
	}

	if (updated > 0) {
		tagsToInvalidate.add(ORDERS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_BADGES);
		for (const tag of tagsToInvalidate) {
			updateTag(tag);
		}
	}

	logger.info("Sync completed", {
		cronJob: "sync-async-payments",
		updated,
		errors,
		skipped,
		scanned,
	});

	return {
		processed: updated,
		errored: errors,
		skipped,
		checked: scanned,
		updated,
		errors,
		hasMore: scanned >= BATCH_SIZE_MEDIUM,
	};
}
