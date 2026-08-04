import { revalidateTagsInBackground } from "@/shared/lib/cache";
import * as Sentry from "@sentry/nextjs";
import { HistorySource, OrderAction, RefundStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getStripeClient } from "@/shared/lib/stripe";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	STRIPE_THROTTLE_MS,
	STRIPE_TIMEOUT_MS,
	THRESHOLDS,
} from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { REFUNDS_CACHE_TAGS } from "@/modules/refunds/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { captureRefundError } from "@/modules/refunds/utils/capture-refund-error";
import { createOrderAuditTx } from "@/modules/orders/utils/order-audit";
import { finalizeRefundCompletion } from "@/modules/refunds/services/finalize-refund.service";
import { issueCreditNoteForRefund } from "@/modules/refunds/services/issue-credit-note.service";
import {
	AUTO_REFUND_NOTE_PREFIX,
	initiateAutomaticRefund,
	sendRefundFailureAlert,
} from "@/modules/webhooks/services/payment-intent.service";

const RECONCILE_AUDIT_AUTHOR = "Système (reconcile-refunds)";

/**
 * AM-1 — nombre max de tentatives de (re)création Stripe d'un auto-refund dont
 * le premier `stripe.refunds.create` a échoué (panne Stripe transitoire). Au-delà,
 * on arrête de retenter et on alerte l'admin pour intervention manuelle (le client
 * est débité, l'argent doit être restitué). Borne anti-boucle si l'échec est
 * permanent (PI non remboursable, charge déjà remboursée hors-bande, etc.).
 */
const AUTO_REFUND_MAX_CREATE_ATTEMPTS = 5;

/**
 * DLQ refund reconciler.
 *
 * Picks up refunds where the SAGA `processRefund` Step 3 (DB finalization)
 * failed after Step 2 (Stripe call succeeded). Such refunds are stuck in
 * status APPROVED with `stripeRefundId IS NOT NULL AND processedAt IS NULL`.
 * Without this cron, the order `paymentStatus` would never transition to
 * REFUNDED / PARTIALLY_REFUNDED even though Stripe successfully refunded
 * the customer — accounting drift + comptabilité incorrecte (audit TVA risk).
 *
 * Strategy :
 * 1. Find candidate refunds (APPROVED, stripeRefundId set, no processedAt,
 *    last 7 days to bound the scan window).
 * 2. For each : retrieve Stripe refund status. If `succeeded` → finalize
 *    locally (transaction : COMPLETED + processedAt + order paymentStatus).
 *    If `pending` → skip (the webhook will eventually finalize).
 *    If `failed` → mark FAILED locally (idempotent with webhook).
 * 3. Idempotent : guard `status: APPROVED` on each update — concurrent
 *    webhook reconciliation never collides.
 */
export async function reconcileRefunds(): Promise<CronResult> {
	logger.info("Starting refund reconciliation", { cronJob: "reconcile-refunds" });

	const stripe = getStripeClient();
	if (!stripe) {
		logger.warn("STRIPE_SECRET_KEY not configured — skipping run", {
			cronJob: "reconcile-refunds",
		});
		return {
			processed: 0,
			errored: 0,
			skipped: 1,
			reason: "STRIPE_KEY_MISSING",
		};
	}

	// Scan window : 90 jours, avec au moins REFUND_RECONCILE_MIN_AGE_MS (1h) de
	// quarantine pour laisser le webhook path finaliser en premier.
	// EINV-CREDIT-009 : élargi 7j→90j pour couvrir les incidents production
	// prolongés (panne BDD, pause cron prolongée) où un Refund peut rester
	// stuck en APPROVED+stripeRefundId+processedAt=null pendant plusieurs
	// semaines sans rattrapage. Au-delà de 90j : procédure manuelle.
	const now = Date.now();
	const maxAge = new Date(now - 90 * 24 * 60 * 60 * 1000);
	const minAge = new Date(now - THRESHOLDS.REFUND_RECONCILE_MIN_AGE_MS);

	const candidates = await prisma.refund.findMany({
		where: {
			status: RefundStatus.APPROVED,
			stripeRefundId: { not: null },
			processedAt: null,
			createdAt: { gte: maxAge, lt: minAge },
		},
		select: {
			id: true,
			stripeRefundId: true,
			amount: true,
			orderId: true,
			// Âge du refund : sert l'escalade des remboursements bloqués chez Stripe
			// (statut non terminal au-delà de `REFUND_STALE_PENDING_MS`).
			createdAt: true,
			// La finalisation (paymentStatus, avoir, email au snapshot
			// customerEmail) vit dans `finalizeRefundCompletion`, qui se self-load —
			// ce select ne porte plus que le nécessaire au pilotage de la passe.
			order: {
				select: {
					id: true,
					orderNumber: true,
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	logger.info("Found refund candidates", {
		cronJob: "reconcile-refunds",
		count: candidates.length,
	});

	// EINV-CREDIT-009 : alerte Sentry P1 si on atteint le batch max — indique
	// soit un backlog anormal (incident production prolongé), soit un bug
	// systémique (webhook charge.refunded en panne durable). Cas normal : on
	// pick quelques unités/jour, jamais BATCH_SIZE_MEDIUM (=25).
	if (candidates.length === BATCH_SIZE_MEDIUM) {
		Sentry.withScope((scope) => {
			scope.setLevel("warning");
			scope.setTag("cron", "reconcile-refunds");
			scope.setTag("anomaly", "batch-saturated");
			scope.setFingerprint(["reconcile-refunds", "batch-saturated"]);
			scope.setContext("reconcile", {
				batchSize: BATCH_SIZE_MEDIUM,
				windowDays: 90,
			});
			Sentry.captureMessage(
				`reconcile-refunds picked ${BATCH_SIZE_MEDIUM} candidates (batch saturated — system anomaly)`,
				"warning",
			);
		});
	}

	let processed = 0;
	let errored = 0;
	let skipped = 0;
	const deadline = Date.now() + BATCH_DEADLINE_MS;
	const tagsToInvalidate = new Set<string>();

	for (const refund of candidates) {
		// Lu une fois : le numéro de commande sert dans 5 contextes Sentry/logs de
		// cette itération.
		const orderNumber = refund.order.orderNumber;
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping batch early", {
				cronJob: "reconcile-refunds",
			});
			break;
		}
		if (!refund.stripeRefundId) {
			skipped++;
			continue;
		}

		try {
			// Throttle every call (uniform pacing, cap burst at 1/STRIPE_THROTTLE_MS req/s).
			await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));

			const stripeRefund = await stripe.refunds.retrieve(refund.stripeRefundId, undefined, {
				timeout: STRIPE_TIMEOUT_MS,
			});

			if (stripeRefund.status === "succeeded") {
				// P1-C (audit 2026-08-01) : toute la finalisation (claim COMPLETED,
				// paymentStatus, audit, avoir, voidInvoice fallback,
				// email) vit dans le service PARTAGÉ avec le webhook refund.updated —
				// les deux chemins sont le même code. Le service n'invalide rien :
				// on collecte ses tags et on sort en `revalidateTagsInBackground` en
				// fin de passe (cron — `updateTag` y throw, E872).
				const outcome = await finalizeRefundCompletion({
					refundId: refund.id,
					source: HistorySource.SYSTEM,
					authorName: RECONCILE_AUDIT_AUTHOR,
					auditNote: "Refund completed via Stripe DLQ reconciliation",
					auditMetadata: { reason: "stripe_dlq_reconcile" },
				});
				if (outcome.finalized) {
					processed++;
					for (const tag of outcome.tags) {
						tagsToInvalidate.add(tag);
					}
				} else {
					skipped++;
				}
			} else if (stripeRefund.status === "failed") {
				const failureReason = stripeRefund.failure_reason ?? "unknown";
				const failed = await prisma.$transaction(async (tx) => {
					const updated = await tx.refund.updateMany({
						where: { id: refund.id, status: RefundStatus.APPROVED },
						data: { status: RefundStatus.FAILED, failureReason },
					});
					if (updated.count === 0) return false;

					await createOrderAuditTx(tx, {
						orderId: refund.orderId,
						action: OrderAction.REFUND_FAILED,
						source: HistorySource.SYSTEM,
						authorName: RECONCILE_AUDIT_AUTHOR,
						note: `Refund failed via Stripe DLQ reconciliation (${failureReason})`,
						metadata: {
							refundId: refund.id,
							stripeRefundId: refund.stripeRefundId,
							amount: refund.amount,
							failureReason,
							reason: "stripe_dlq_reconcile",
						},
					});
					return true;
				});

				if (failed) {
					processed++;
					tagsToInvalidate.add(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
				} else {
					skipped++;
				}
			} else {
				// pending / requires_action → laisser le webhook ou le prochain run gérer.
				//
				// ⚠️ « Le prochain run gérera » n'était vrai que pour `pending`. Un refund
				// bloqué chez Stripe (typiquement `requires_action`) retombait ici À CHAQUE
				// passage, indéfiniment, sans jamais rien signaler : le client n'était pas
				// remboursé, l'avoir n'était pas émis, et personne ne l'apprenait. Passé
				// `REFUND_STALE_PENDING_MS`, on escalade — une fois, sur la clé
				// d'idempotence Resend, pour ne pas re-alerter à chaque exécution.
				skipped++;

				const ageMs = now - refund.createdAt.getTime();
				if (ageMs > THRESHOLDS.REFUND_STALE_PENDING_MS) {
					logger.warn(
						`Refund ${refund.id} stuck in '${stripeRefund.status}' for ${Math.round(ageMs / 3_600_000)}h`,
						{
							cronJob: "reconcile-refunds",
							refundId: refund.id,
							stripeRefundId: refund.stripeRefundId,
							stripeStatus: stripeRefund.status,
						},
					);
					await sendRefundFailureAlert(
						refund.orderId,
						refund.stripeRefundId,
						"other",
						`Remboursement bloqué chez Stripe au statut '${stripeRefund.status}' depuis ${Math.round(ageMs / 3_600_000)} h — intervention manuelle requise dans le Dashboard.`,
					);
				}
			}
		} catch (error) {
			logger.error("Error reconciling refund", error, {
				cronJob: "reconcile-refunds",
				refundId: refund.id,
				stripeRefundId: refund.stripeRefundId,
			});
			captureRefundError(error, {
				action: "reconcile-refunds",
				refundId: refund.id,
				stripeRefundId: refund.stripeRefundId,
				orderId: refund.orderId,
				orderNumber,
			});
			errored++;
		}
	}

	// AM-1 — 2ᵉ phase : repêche les auto-refunds dont la *création* Stripe a
	// échoué (APPROVED + stripeRefundId NULL). Le filet principal ci-dessus exige
	// `stripeRefundId NOT NULL`, donc ces refunds n'étaient sinon jamais retentés —
	// client débité (oversell / payment_failed) sans remboursement émis.
	const retryStats = await retryStuckAutoRefundCreations({ minAge, maxAge, deadline });
	processed += retryStats.retried;
	errored += retryStats.errored;
	skipped += retryStats.skipped;

	// P1-C (audit 2026-08-01) — filet avoirs : refunds COMPLETED sans
	// creditNoteNumber, que la phase 1 ne revoit jamais (`processedAt: null`).
	const backfillStats = await backfillMissingCreditNotes({ minAge, maxAge, deadline });
	processed += backfillStats.issued;
	errored += backfillStats.errored;
	for (const tag of backfillStats.tags) {
		tagsToInvalidate.add(tag);
	}

	// OVERBILL-RESOLVE-01 : auto-résolution de la sur-facturation. Reprend la
	// moitié « résolution » de l'ex-cron alert-overbilled-orders (supprimé au
	// right-sizing) — qui était le SEUL writer de Order.overbillingResolvedAt.
	// Sans ce rattrapage, une commande sur-facturée puis remboursée resterait
	// affichée « à traiter » sur le dashboard à vie (compteur monotone, cry-wolf).
	// La ré-alerte email n'est PAS restaurée : la surveillance est passée en PULL
	// (dashboard get-action-items). Lecture + mutation minimale, jamais le montant.
	const overbillStats = await reconcileOverbilledOrders();
	processed += overbillStats.resolved;
	errored += overbillStats.errored;
	for (const tag of overbillStats.tags) {
		tagsToInvalidate.add(tag);
	}

	if (tagsToInvalidate.size > 0) {
		tagsToInvalidate.add(REFUNDS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(ORDERS_CACHE_TAGS.LIST);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_BADGES);
		tagsToInvalidate.add(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
		revalidateTagsInBackground(tagsToInvalidate);
	}

	logger.info("Reconciliation completed", {
		cronJob: "reconcile-refunds",
		processed,
		errored,
		skipped,
	});

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
	};
}

/**
 * OVERBILL-RESOLVE-01 — auto-résolution de la sur-facturation.
 *
 * Le webhook `payment_intent.succeeded` persiste `Order.overbilledAmountCents`
 * quand Stripe encaisse plus que `order.total` (sans auto-rembourser — Invariant 9
 * e-reporting). Le dashboard (`get-action-items`) liste ces commandes tant que
 * `overbillingResolvedAt IS NULL`. Cette passe pose `overbillingResolvedAt` dès que
 * les refunds COMPLETED de la commande couvrent le delta (l'admin a remboursé le
 * trop-perçu via le flux refund normal) — quel que soit le chemin de complétion
 * (webhook `charge.refunded`, action `processRefund`, ou la phase 1 de ce cron).
 *
 * Reprend la moitié « résolution » de l'ex-cron `alert-overbilled-orders` (supprimé
 * au right-sizing), qui en était l'unique writer. La ré-alerte email n'est PAS
 * restaurée (monitoring passé en PULL). Lecture + `overbillingResolvedAt` seulement —
 * jamais le montant ni l'e-reporting (le remboursement reste une décision admin).
 */
async function reconcileOverbilledOrders(): Promise<{
	resolved: number;
	errored: number;
	tags: string[];
}> {
	const candidates = await prisma.order.findMany({
		where: {
			overbilledAmountCents: { not: null },
			overbillingResolvedAt: null,
			...notDeleted,
		},
		select: { id: true, orderNumber: true, total: true, overbilledAmountCents: true },
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	if (candidates.length === 0) return { resolved: 0, errored: 0, tags: [] };

	let resolved = 0;
	let errored = 0;
	// CACHE : la résolution change la fiche commande admin + le dashboard
	// « À traiter » — invalider les tags par-commande/user via le helper SSOT,
	// pas seulement les listes globales (sinon stale ~10 min profil `user`).
	const tags = new Set<string>();

	for (const order of candidates) {
		const delta = order.overbilledAmountCents ?? 0;
		try {
			const completedRefunds = await prisma.refund.findMany({
				where: { orderId: order.id, status: RefundStatus.COMPLETED },
				select: { amount: true },
			});
			const totalRefunded = completedRefunds.reduce((sum, r) => sum + r.amount, 0);

			// OVERBILL-RESOLVE-02 : un simple `totalRefunded >= delta` marquait
			// « résolu » dès qu'un refund quelconque (retour produit, geste commercial)
			// atteignait le delta, sans que le trop-perçu ait été restitué en tant que
			// tel. Aucun lien causal refund↔overbilling n'existe en DB (les refunds
			// Dashboard sont ré-alloués au pro-rata des items, la raison n'est pas
			// discriminante, et tout refund est postérieur à la détection) — on retient
			// donc deux signaux sans faux positif :
			//   (a) un refund COMPLETED du montant EXACT du delta — le workflow
			//       instruit par l'alerte admin (« remboursement manuel du delta ») ;
			//   (b) cumul >= order.total + delta — les refunds produits ne peuvent
			//       excéder order.total, donc le delta est nécessairement restitué.
			// Faux négatif possible (delta remboursé en plusieurs fois) : la commande
			// reste visible sur le dashboard « À traiter », jamais résolue à tort.
			const hasExactDeltaRefund = completedRefunds.some((r) => r.amount === delta);
			const isEverythingRefunded = totalRefunded >= order.total + delta;

			if (hasExactDeltaRefund || isEverythingRefunded) {
				// Guard `overbillingResolvedAt: null` → idempotent (pas de double-résolution
				// si deux runs se chevauchent).
				const { count } = await prisma.order.updateMany({
					where: { id: order.id, overbillingResolvedAt: null },
					data: { overbillingResolvedAt: new Date() },
				});
				if (count > 0) {
					resolved++;
					for (const tag of getOrderInvalidationTags(order.id)) {
						tags.add(tag);
					}
					logger.info(`Overbilling auto-resolved on order ${order.orderNumber}`, {
						cronJob: "reconcile-refunds",
						orderId: order.id,
						deltaCents: delta,
						totalRefunded,
					});
				}
			}
		} catch (error) {
			errored++;
			logger.error("Failed to reconcile overbilled order", error, {
				cronJob: "reconcile-refunds",
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}
	}

	return { resolved, errored, tags: [...tags] };
}

/**
 * AM-1 — retente la création Stripe des auto-refunds bloqués.
 *
 * Cible : `Refund` APPROVED, `stripeRefundId IS NULL`, note préfixée
 * `AUTO_REFUND_NOTE_PREFIX` (donc émis automatiquement par un handler webhook),
 * dans la fenêtre [maxAge, minAge[ et sous le plafond de tentatives.
 *
 * Réutilise `initiateAutomaticRefund` (idempotent : retrouve le Refund local
 * existant et rappelle `stripe.refunds.create` avec la clé d'idempotence
 * `auto-refund-${paymentIntentId}` — Stripe renvoie le même `re_*` s'il avait
 * en fait été créé). En cas de succès, `stripeRefundId` est posé et la phase 1
 * du prochain run (ou le webhook `charge.refunded`) finalise le refund.
 *
 * `attemptCount` borne les retries : au plafond, on alerte l'admin (refund
 * manuel requis) et on cesse de retenter.
 */
async function retryStuckAutoRefundCreations(params: {
	minAge: Date;
	maxAge: Date;
	deadline: number;
}): Promise<{ retried: number; errored: number; skipped: number }> {
	const { minAge, maxAge, deadline } = params;

	const stuck = await prisma.refund.findMany({
		where: {
			status: RefundStatus.APPROVED,
			stripeRefundId: null,
			note: { startsWith: AUTO_REFUND_NOTE_PREFIX },
			attemptCount: { lt: AUTO_REFUND_MAX_CREATE_ATTEMPTS },
			createdAt: { gte: maxAge, lt: minAge },
		},
		select: {
			id: true,
			orderId: true,
			attemptCount: true,
			order: {
				select: { stripePaymentIntentId: true, orderNumber: true },
			},
		},
		take: BATCH_SIZE_MEDIUM,
		orderBy: { createdAt: "asc" },
	});

	if (stuck.length === 0) {
		return { retried: 0, errored: 0, skipped: 0 };
	}

	logger.info("Found stuck auto-refunds without stripeRefundId", {
		cronJob: "reconcile-refunds",
		count: stuck.length,
	});

	let retried = 0;
	let errored = 0;
	let skipped = 0;

	for (const refund of stuck) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping auto-refund retry phase early", {
				cronJob: "reconcile-refunds",
			});
			break;
		}

		const paymentIntentId = refund.order.stripePaymentIntentId;
		if (!paymentIntentId) {
			// Sans PI on ne peut pas appeler stripe.refunds.create — anomalie
			// (un auto-refund n'existe que sur une commande payée par PI).
			logger.error(
				`Stuck auto-refund ${refund.id} on order without stripePaymentIntentId — manual intervention`,
				undefined,
				{ cronJob: "reconcile-refunds", refundId: refund.id },
			);
			skipped++;
			continue;
		}

		// Incrémente AVANT l'appel pour borner même si l'appel throw/timeout.
		await prisma.refund.update({
			where: { id: refund.id },
			data: { attemptCount: { increment: 1 } },
		});
		const attemptsAfter = refund.attemptCount + 1;

		// Throttle uniforme (cap burst Stripe), comme la phase 1.
		await new Promise((resolve) => setTimeout(resolve, STRIPE_THROTTLE_MS));

		const result = await initiateAutomaticRefund(
			paymentIntentId,
			refund.orderId,
			"DLQ retry — création auto-refund échouée",
		);

		if (result.success) {
			retried++;
			logger.info(`Auto-refund creation succeeded on DLQ retry for refund ${refund.id}`, {
				cronJob: "reconcile-refunds",
				refundId: refund.id,
				attempt: attemptsAfter,
			});
			continue;
		}

		errored++;
		// Au plafond : on alerte l'admin (le client reste débité), on cesse de
		// retenter (la prochaine sélection exclut attemptCount >= plafond).
		if (attemptsAfter >= AUTO_REFUND_MAX_CREATE_ATTEMPTS) {
			await sendRefundFailureAlert(
				refund.orderId,
				paymentIntentId,
				"other",
				`Auto-refund Stripe création échouée après ${attemptsAfter} tentatives (DLQ reconcile-refunds). ${result.error?.message ?? ""}`,
			);
			Sentry.withScope((scope) => {
				scope.setLevel("error");
				scope.setTag("cron", "reconcile-refunds");
				scope.setTag("anomaly", "auto-refund-create-exhausted");
				scope.setFingerprint(["reconcile-refunds", "auto-refund-create-exhausted"]);
				scope.setContext("refund", {
					refundId: refund.id,
					orderNumber: refund.order.orderNumber,
					attempts: attemptsAfter,
				});
				Sentry.captureMessage(
					"Auto-refund creation exhausted retries (manual refund required)",
					"error",
				);
			});
		}
	}

	logger.info("Stuck auto-refund retry phase completed", {
		cronJob: "reconcile-refunds",
		retried,
		errored,
		skipped,
	});

	return { retried, errored, skipped };
}

/**
 * P1-C (audit « Admin commandes » 2026-08-01) — filet avoirs : refunds COMPLETED
 * sans `creditNoteNumber`. Deux origines possibles : finalisation historique par
 * l'ancien chemin webhook maigre (status+processedAt sans avoir), ou échec
 * best-effort d'`issueCreditNoteForRefund` jamais retenté une fois `processedAt`
 * posé (la phase 1 exige `processedAt: null`). Idempotent : le service noop si
 * l'avoir est déjà émis, et noop sur un full-refund (l'avoir canonique vient de
 * voidInvoice, couvert par `reconcile-voided-invoices`) — ces derniers restent
 * candidats à chaque run de la fenêtre, à coût d'un noop.
 */
async function backfillMissingCreditNotes(params: {
	minAge: Date;
	maxAge: Date;
	deadline: number;
}): Promise<{ issued: number; errored: number; tags: string[] }> {
	const { minAge, maxAge, deadline } = params;

	const candidates = await prisma.refund.findMany({
		where: {
			status: RefundStatus.COMPLETED,
			creditNoteNumber: null,
			processedAt: { gte: maxAge, lt: minAge },
			order: { invoiceNumber: { not: null } },
		},
		select: { id: true, orderId: true, order: { select: { orderNumber: true } } },
		take: BATCH_SIZE_MEDIUM,
		orderBy: { processedAt: "asc" },
	});

	if (candidates.length === 0) return { issued: 0, errored: 0, tags: [] };

	let issued = 0;
	let errored = 0;
	const tags = new Set<string>();

	for (const refund of candidates) {
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping credit-note backfill early", {
				cronJob: "reconcile-refunds",
			});
			break;
		}
		try {
			const result = await issueCreditNoteForRefund({
				refundId: refund.id,
				source: HistorySource.SYSTEM,
				authorName: RECONCILE_AUDIT_AUTHOR,
			});
			if (result.kind === "issued") {
				issued++;
				tags.add(REFUNDS_CACHE_TAGS.DETAIL(refund.id));
				tags.add(ORDERS_CACHE_TAGS.REFUNDS(refund.orderId));
				logger.info(`Credit note backfilled for refund ${refund.id}`, {
					cronJob: "reconcile-refunds",
					refundId: refund.id,
					orderNumber: refund.order.orderNumber,
				});
			} else if (result.kind === "failed") {
				errored++;
			}
		} catch (error) {
			errored++;
			captureRefundError(error, {
				action: "reconcile-refunds-credit-note-backfill",
				refundId: refund.id,
				orderId: refund.orderId,
				orderNumber: refund.order.orderNumber,
			});
		}
	}

	return { issued, errored, tags: [...tags] };
}
