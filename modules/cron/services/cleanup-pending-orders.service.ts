import { revalidateTagsInBackground } from "@/shared/lib/cache";
import {
	OrderStatus,
	PaymentStatus,
	HistorySource,
	OrderAction,
	WebhookEventStatus,
} from "@/app/generated/prisma/client";
import { notDeleted, prisma } from "@/shared/lib/prisma";
import { TX_MAX_WAIT_LONG, TX_TIMEOUT_LONG } from "@/shared/lib/prisma-tx-options";
import { logger } from "@/shared/lib/logger";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { BATCH_DEADLINE_MS, BATCH_SIZE_LARGE, THRESHOLDS } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { sendAdminCronFailedAlert } from "@/modules/emails/services/admin-emails";

/**
 * AM-5 — seuil de détection SPOF `sync-async-payments`.
 *
 * Toute commande `PENDING` portant un `stripePaymentIntentId` est censée être
 * réconciliée par `sync-async-payments` (poll Stripe dès 1h, toutes les 4h).
 * Si une telle commande dépasse ce seuil (7 jours, très au-delà de la portée du
 * poll), c'est que `sync-async-payments` est en panne durable — et comme
 * `cleanup-pending-orders` exclut volontairement les commandes à PI (pour ne pas
 * racer ce cron), aucun second filet ne les ferme. On émet donc une alerte
 * monitoring (lecture seule, zéro mutation → race-safe par construction) pour
 * transformer ce SPOF silencieux en signal actionnable.
 */
const SYNC_ASYNC_SPOF_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cancels stale PENDING orders left behind by abandoned checkouts.
 *
 * Scope: orders where status=PENDING + paymentStatus=PENDING + stripePaymentIntentId IS NULL
 * older than PENDING_ORDER_TIMEOUT_MS (24h).
 *
 * Why we exclude orders with stripePaymentIntentId: dans le flux Elements actuel,
 * TOUTE commande créée par `confirmCheckout` porte un `stripePaymentIntentId`
 * (order-creation.service.ts) — c'est `sync-async-payments` qui est désormais
 * propriétaire de leur réconciliation : il interroge Stripe et résout les PI
 * `succeeded` (→ PAID) comme les PI durablement non finalisés / abandonnés
 * (`requires_action`/`requires_confirmation`/`requires_payment_method`/`canceled`
 * → cancel + FAILED, cf. F1 2026-05-29). Y toucher ici racerait ce cron.
 * Ce cron ne couvre donc que les éventuelles commandes legacy à PI nul (aucune
 * dans la config actuelle — filet de sécurité conservé sans coût).
 *
 * Effects per order (atomic):
 *  - status → CANCELLED
 *  - audit trail (HistorySource.SYSTEM, OrderAction.CANCELLED)
 *
 * STOCK-01 : PAS de restock. Réservation optimiste — le stock n'est décrémenté
 * qu'au passage PAID. Ces commandes sont PENDING/PENDING (et PI nul) → leur stock
 * n'a jamais été décrémenté ; le restocker gonflerait l'inventaire (phantom stock).
 *
 * No email sent to the customer: the checkout session was abandoned, so there
 * is no reasonable expectation that a confirmation/cancellation would be useful.
 */
export async function cleanupPendingOrders(): Promise<CronResult> {
	const cutoff = new Date(Date.now() - THRESHOLDS.PENDING_ORDER_TIMEOUT_MS);

	const candidates = await prisma.order.findMany({
		where: {
			status: OrderStatus.PENDING,
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: null,
			createdAt: { lt: cutoff },
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			createdAt: true,
			// CACHE-AUDIT-005 : invalider les tags user-scopés pour les pending
			// abandonnés d'un client connecté.
			items: { select: { id: true, skuId: true, quantity: true } },
		},
		take: BATCH_SIZE_LARGE,
		orderBy: { createdAt: "asc" },
	});

	logger.info("Cleanup candidates loaded", {
		cronJob: "cleanup-pending-orders",
		count: candidates.length,
	});

	let processed = 0;
	let errored = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>([
		ORDERS_CACHE_TAGS.LIST,
		SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
	]);

	for (const order of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "cleanup-pending-orders",
				processed,
				remaining: candidates.length - processed - errored,
			});
			break;
		}

		try {
			await prisma.$transaction(
				async (tx) => {
					const fresh = await tx.order.findUnique({
						where: { id: order.id, ...notDeleted },
						select: { status: true, paymentStatus: true, stripePaymentIntentId: true },
					});
					if (
						!fresh ||
						fresh.status !== OrderStatus.PENDING ||
						fresh.paymentStatus !== PaymentStatus.PENDING ||
						fresh.stripePaymentIntentId !== null
					) {
						return;
					}

					await tx.order.update({
						where: { id: order.id },
						data: { status: OrderStatus.CANCELLED },
					});

					// STOCK-01 : pas de restock (stock jamais décrémenté sur une PENDING).

					await createOrderAuditTx(tx, {
						orderId: order.id,
						action: OrderAction.CANCELLED,
						previousStatus: OrderStatus.PENDING,
						newStatus: OrderStatus.CANCELLED,
						note: "Auto-annulation : panier abandonné (>24h sans paiement)",
						authorName: "Système",
						source: HistorySource.SYSTEM,
						metadata: {
							reason: "abandoned_checkout",
							itemsCount: order.items.length,
							ageHours: Math.floor((Date.now() - order.createdAt.getTime()) / (60 * 60 * 1000)),
						},
					});
				},
				{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
			);

			// CACHE-AUDIT-005 : tags user-scopés + détail commande (helper canonique).
			for (const tag of getOrderInvalidationTags(order.id)) {
				tagsToInvalidate.add(tag);
			}
			processed++;
		} catch (error) {
			errored++;
			logger.error("Failed to cancel stale pending order", error, {
				cronJob: "cleanup-pending-orders",
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}
	}

	if (processed > 0) {
		revalidateTagsInBackground(tagsToInvalidate);
	}

	// AM-5 — tripwire SPOF : détecte les commandes PENDING à PI anormalement
	// vieilles, signe que `sync-async-payments` (leur unique filet) n'a pas tourné.
	//
	// ⚠️ Le diagnostic a changé de nature au Lot 1 (2026-08-03) : `sync-async-payments`
	// n'est plus un cron Vercel mais un BOUTON de la page Maintenance. Un compteur
	// non nul ne veut donc plus dire « le cron est en panne » mais « personne n'a
	// cliqué » — c'est précisément pour ça que ce tripwire compte davantage
	// qu'avant, puisqu'il est le seul à rappeler qu'un clic est dû.
	//
	// Lecture seule : on n'agit jamais sur ces commandes ici (cela racerait
	// sync-async). On compte et on alerte l'admin.
	const spofCutoff = new Date(Date.now() - SYNC_ASYNC_SPOF_THRESHOLD_MS);
	const stalePiPendingCount = await prisma.order.count({
		where: {
			status: OrderStatus.PENDING,
			paymentStatus: PaymentStatus.PENDING,
			stripePaymentIntentId: { not: null },
			createdAt: { lt: spofCutoff },
			...notDeleted,
		},
	});
	if (stalePiPendingCount > 0) {
		logger.error(
			`${stalePiPendingCount} PENDING order(s) with a PaymentIntent older than 7 days — sync-async-payments likely failing`,
			undefined,
			{ cronJob: "cleanup-pending-orders", stalePiPendingCount },
		);
		await sendAdminCronFailedAlert({
			job: "sync-async-payments (SPOF tripwire)",
			errors: stalePiPendingCount,
			details: {
				issue: "stale-pending-pi-orders",
				thresholdDays: 7,
				count: stalePiPendingCount,
				hint: "Lancer « Synchroniser les paiements asynchrones » depuis /admin/configuration/maintenance — c'est le seul filet de réconciliation des commandes PENDING à PaymentIntent, et c'est une tâche MANUELLE depuis le Lot 1 (2026-08-03), plus un cron Vercel.",
			},
		}).catch((e) =>
			logger.error("Failed to send SPOF tripwire alert", e, {
				cronJob: "cleanup-pending-orders",
			}),
		);
	}

	// WEBHOOK-AUDIT-003 — passe de rétention des artefacts webhook résolus.
	// Le cron dédié `cleanup-webhook-events` a été retiré au right-sizing sans
	// remplaçant : les deux tables croissaient sans borne, `WebhookEvent` étant de
	// surcroît sur le chemin chaud de l'idempotence (lookup `stripeEventId @unique`
	// à chaque livraison). Rattaché ici plutôt qu'à un 12ᵉ cron Vercel.
	// Best-effort : un échec de purge ne doit jamais faire échouer l'annulation des
	// commandes, qui est la raison d'être de ce cron.
	let purgedWebhookRecords = 0;
	try {
		purgedWebhookRecords = await purgeExpiredWebhookRecords();
	} catch (error) {
		logger.error("Webhook retention pass failed", error, {
			cronJob: "cleanup-pending-orders",
		});
	}

	logger.info("Cleanup completed", {
		cronJob: "cleanup-pending-orders",
		processed,
		errored,
		stalePiPendingCount,
		purgedWebhookRecords,
	});

	return {
		processed,
		errored,
		skipped: Math.max(0, candidates.length - processed - errored),
		hasMore: candidates.length === BATCH_SIZE_LARGE,
		cancelled: processed,
	};
}

/**
 * WEBHOOK-AUDIT-003 — purge les artefacts webhook RÉSOLUS au-delà de
 * `WEBHOOK_RECORD_RETENTION_MS` (90 j).
 *
 * Périmètre volontairement étroit : `WebhookEvent` COMPLETED/SKIPPED uniquement —
 * un FAILED reste éligible à une redélivrance de Stripe (3 jours) et, au-delà,
 * documente un incident. (La purge des `PostWebhookTask` est partie avec la file,
 * Lot 2 S3.4 ; le bouton Maintenance `retry-webhooks` qui rejouait les FAILED est
 * parti à l'audit V2, Lot 3 — cf. `docs/KNOWN-ISSUES.md`, KI-006.)
 *
 * Batches bornés (`BATCH_SIZE_LARGE`) : le rattrapage s'étale sur plusieurs runs
 * quotidiens plutôt que de tenir une transaction longue sur un backlog historique.
 */
async function purgeExpiredWebhookRecords(): Promise<number> {
	const cutoff = new Date(Date.now() - THRESHOLDS.WEBHOOK_RECORD_RETENTION_MS);

	let deleted = 0;
	const staleEvents = await prisma.webhookEvent.findMany({
		where: {
			status: { in: [WebhookEventStatus.COMPLETED, WebhookEventStatus.SKIPPED] },
			receivedAt: { lt: cutoff },
		},
		select: { id: true },
		take: BATCH_SIZE_LARGE,
	});
	if (staleEvents.length > 0) {
		const { count } = await prisma.webhookEvent.deleteMany({
			where: { id: { in: staleEvents.map((e) => e.id) } },
		});
		deleted += count;
	}

	if (deleted > 0) {
		logger.info("Purged expired webhook records", {
			cronJob: "cleanup-pending-orders",
			events: staleEvents.length,
			retentionDays: Math.round(THRESHOLDS.WEBHOOK_RECORD_RETENTION_MS / (24 * 60 * 60 * 1000)),
		});
	}

	return deleted;
}
