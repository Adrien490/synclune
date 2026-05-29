import * as Sentry from "@sentry/nextjs";
import { DisputeStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { BATCH_SIZE_LARGE } from "@/modules/cron/constants/limits";
import { sendAdminDisputeAlert } from "@/modules/emails/services/admin-emails";
import { getBaseUrl, ROUTES, EXTERNAL_URLS } from "@/shared/constants/urls";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "alert-dispute-deadlines";

/**
 * Fenêtre de relance avant la deadline Stripe de soumission des preuves.
 * Un litige non répondu avant `dueBy` est perdu par défaut. L'admin n'est
 * notifié qu'à l'ouverture (`handleDisputeCreated`) — sans rappel, un mail
 * manqué = perte d'un litige défendable. On scanne quotidiennement les disputes
 * dont la deadline tombe dans les 2 prochains jours.
 */
const DISPUTE_DEADLINE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Rappel admin avant l'échéance Stripe des litiges encore à répondre.
 *
 * Read-only sur les modèles métier : ce cron ne mute aucun Dispute/Order, il
 * émet uniquement une alerte email. Idempotent via `idempotencyKey` Resend +
 * dédup DB post-webhook : la clé inclut un bucket journalier
 * (`alert:dispute-deadline:${id}:${jour}`) → au plus 1 rappel/jour/litige, soit
 * 2 rappels sur la fenêtre de 2 jours. Re-courir chaque jour est intentionnel :
 * tant que l'admin n'a pas répondu (statut toujours NEEDS_RESPONSE), le rappel
 * doit persister.
 */
export async function alertDisputeDeadlines(): Promise<CronResult> {
	const now = Date.now();
	const windowEnd = new Date(now + DISPUTE_DEADLINE_WINDOW_MS);
	const nowDate = new Date(now);
	// Bucket journalier UTC pour la clé d'idempotence (1 rappel max/jour/litige).
	const dayBucket = Math.floor(now / (24 * 60 * 60 * 1000));

	const disputes = await prisma.dispute.findMany({
		where: {
			// Seul NEEDS_RESPONSE exige encore une action de l'admin (UNDER_REVIEW =
			// preuves déjà soumises, WON/LOST/CHARGE_REFUNDED = clos).
			status: DisputeStatus.NEEDS_RESPONSE,
			// Deadline à venir dans la fenêtre — exclut les deadlines déjà dépassées
			// (rappel inutile : le litige est de facto perdu) et celles trop lointaines.
			dueBy: { gte: nowDate, lte: windowEnd },
			order: { ...notDeleted },
		},
		select: {
			id: true,
			stripeDisputeId: true,
			amount: true,
			reason: true,
			dueBy: true,
			order: {
				select: { id: true, orderNumber: true, customerEmail: true },
			},
		},
		take: BATCH_SIZE_LARGE,
		orderBy: { dueBy: "asc" },
	});

	logger.info("Dispute deadline scan completed", {
		cronJob: CRON_JOB,
		count: disputes.length,
	});

	let processed = 0;
	let errored = 0;
	const baseUrl = getBaseUrl();

	for (const dispute of disputes) {
		try {
			const result = await sendAdminDisputeAlert({
				orderNumber: dispute.order.orderNumber,
				customerEmail: dispute.order.customerEmail,
				amount: dispute.amount,
				reason: `[RAPPEL DEADLINE] ${dispute.reason} — répondez avant l'échéance Stripe sous peine de perdre le litige par défaut.`,
				disputeId: dispute.stripeDisputeId,
				deadline: dispute.dueBy ? dispute.dueBy.toLocaleDateString("fr-FR") : null,
				dashboardUrl: `${baseUrl}${ROUTES.ADMIN.ORDER_DETAIL(dispute.order.id)}`,
				stripeDashboardUrl: EXTERNAL_URLS.STRIPE.DISPUTE(dispute.stripeDisputeId),
				idempotencyKey: `alert:dispute-deadline:${dispute.stripeDisputeId}:${dayBucket}`,
			});
			if (result.success) {
				processed++;
			} else {
				errored++;
				logger.error("Failed to send dispute deadline reminder", undefined, {
					cronJob: CRON_JOB,
					disputeId: dispute.id,
					error: result.error,
				});
			}
		} catch (error) {
			errored++;
			logger.error("Exception sending dispute deadline reminder", error, {
				cronJob: CRON_JOB,
				disputeId: dispute.id,
			});
			Sentry.withScope((scope) => {
				scope.setTag("cronJob", CRON_JOB);
				scope.setLevel("error");
				scope.setFingerprint(["cron", CRON_JOB, "email-failed"]);
				scope.setContext("dispute", {
					disputeId: dispute.id,
					stripeDisputeId: dispute.stripeDisputeId,
				});
				Sentry.captureException(error);
			});
		}
	}

	return {
		processed,
		errored,
		skipped: 0,
		disputesNearDeadline: disputes.length,
	};
}
