import { PostWebhookTaskStatus } from "@/app/generated/prisma/client";
import type { Prisma } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import {
	sendAdminNewOrderEmail,
	sendAdminRefundFailedAlert,
	sendAdminDisputeAlert,
	sendAdminInvoiceFailedAlert,
	sendAdminOrderProcessingFailedAlert,
	sendAdminDashboardRefundAttentionAlert,
	sendWebhookFailedAlertEmail,
} from "@/modules/emails/services/admin-emails";
import { sendRefundConfirmationEmail } from "@/modules/emails/services/refund-emails";
import { sendRefundConfirmationOnce } from "@/modules/refunds/services/send-refund-confirmation.service";
import { sendPaymentFailedEmail } from "@/modules/emails/services/payment-emails";
import { MAX_POST_WEBHOOK_RETRY_ATTEMPTS } from "../constants/webhook.constants";
import type { PostWebhookTask } from "../types/webhook.types";

/**
 * ORD-STRIPE-003 — service de persistance + exécution des tâches post-webhook.
 *
 * Sans persistance, un crash de la lambda Vercel entre `after()` start et email-
 * send = email perdu sans backstop (Stripe ne re-livre pas après 200).
 *
 * Pipeline :
 *   1. `persistPostWebhookTasks(tx, ...)` — créé les rows PENDING dans la MÊME
 *      tx que `WebhookEvent.status=COMPLETED` (route.ts).
 *   2. `executePersistedTasks(ids)` — appelé via `after()` post-200. Exécute
 *      chaque task et update status en DB.
 *   3. `retryPendingPostWebhookTasks()` — cron 5min, repop PENDING + FAILED.
 */

const CRITICAL_EMAIL_TASKS = new Set([
	"ORDER_CONFIRMATION_EMAIL",
	"ADMIN_NEW_ORDER_EMAIL",
	"REFUND_CONFIRMATION_EMAIL",
	"PAYMENT_FAILED_EMAIL",
	"ADMIN_ORDER_PROCESSING_FAILED_ALERT",
]);

type EmailTask = Exclude<PostWebhookTask, { type: "INVALIDATE_CACHE" }>;

async function dispatchEmailTask(task: EmailTask): Promise<void> {
	switch (task.type) {
		case "ORDER_CONFIRMATION_EMAIL":
			await sendOrderConfirmationEmail(task.data);
			break;
		case "ADMIN_NEW_ORDER_EMAIL":
			await sendAdminNewOrderEmail(task.data);
			break;
		case "REFUND_CONFIRMATION_EMAIL":
			// ORD-STRIPE-005 : si le payload contient refundId, on passe par
			// sendRefundConfirmationOnce qui pose `Refund.confirmationEmailSentAt`
			// atomiquement → bloque SAGA admin / cron qui auraient envoyé un 2e mail.
			if (task.data.refundId) {
				await sendRefundConfirmationOnce({
					refundId: task.data.refundId,
					to: task.data.to,
					orderNumber: task.data.orderNumber,
					customerName: task.data.customerName,
					refundAmount: task.data.refundAmount,
					reason: task.data.reason as Parameters<typeof sendRefundConfirmationOnce>[0]["reason"],
					orderDetailsUrl: task.data.orderDetailsUrl,
					invoiceNumber: task.data.invoiceNumber ?? null,
					creditNoteNumber: task.data.creditNoteNumber ?? null,
				});
			} else {
				await sendRefundConfirmationEmail(task.data);
			}
			break;
		case "PAYMENT_FAILED_EMAIL":
			await sendPaymentFailedEmail(task.data);
			break;
		case "ADMIN_REFUND_FAILED_ALERT":
			await sendAdminRefundFailedAlert(task.data);
			break;
		case "ADMIN_DISPUTE_ALERT":
			await sendAdminDisputeAlert(task.data);
			break;
		case "ADMIN_INVOICE_FAILED_ALERT":
			await sendAdminInvoiceFailedAlert(task.data);
			break;
		case "ADMIN_ORDER_PROCESSING_FAILED_ALERT":
			await sendAdminOrderProcessingFailedAlert(task.data);
			break;
		case "ADMIN_DASHBOARD_REFUND_ALERT":
			await sendAdminDashboardRefundAttentionAlert(task.data);
			break;
	}
}

/**
 * Extrait la clé d'idempotence applicative d'une tâche, si présente.
 * Permet la dédup côté DB (Unique constraint sur `idempotencyKey`) en plus
 * de la dédup Resend (24h).
 */
function extractIdempotencyKey(task: PostWebhookTask): string | undefined {
	if (task.type === "INVALIDATE_CACHE") return undefined;
	const data = task.data as { idempotencyKey?: unknown };
	return typeof data.idempotencyKey === "string" ? data.idempotencyKey : undefined;
}

/**
 * Sérialise une task au format DB. Cache → `{ tags }`. Email → `data` brut.
 */
function serializePayload(task: PostWebhookTask): Prisma.InputJsonValue {
	if (task.type === "INVALIDATE_CACHE") {
		return { tags: task.tags };
	}
	return task.data as unknown as Prisma.InputJsonValue;
}

/**
 * Désérialise une row DB en PostWebhookTask exécutable.
 */
function deserializeTask(row: { taskType: string; payload: Prisma.JsonValue }): PostWebhookTask {
	const payload = row.payload as Record<string, unknown>;
	if (row.taskType === "INVALIDATE_CACHE") {
		return { type: "INVALIDATE_CACHE", tags: payload.tags as string[] };
	}
	return {
		type: row.taskType,
		data: payload,
	} as unknown as PostWebhookTask;
}

/**
 * Persiste les tâches en DB en PENDING. À appeler dans la MÊME transaction que
 * `webhookEvent.update({ status: COMPLETED })` pour garantir l'atomicité —
 * sinon une lambda qui crashe entre les deux écritures laisse l'event
 * COMPLETED sans queue → emails perdus.
 *
 * Si `idempotencyKey` existe ET qu'une row avec la même clé existe déjà
 * (envoi antérieur), on skip silencieusement via `skipDuplicates: true`.
 */
export async function persistPostWebhookTasks(
	tx: Prisma.TransactionClient,
	webhookEventId: string,
	tasks: PostWebhookTask[],
): Promise<{ created: number }> {
	if (tasks.length === 0) return { created: 0 };

	const rows = tasks.map((task) => ({
		webhookEventId,
		taskType: task.type,
		payload: serializePayload(task),
		idempotencyKey: extractIdempotencyKey(task) ?? null,
		status: PostWebhookTaskStatus.PENDING,
	}));

	const result = await tx.postWebhookTask.createMany({
		data: rows,
		skipDuplicates: true,
	});
	return { created: result.count };
}

interface ExecutionStats {
	successful: number;
	failed: number;
	skipped: number;
}

/**
 * Exécute les tâches PENDING d'un webhook donné. Update le status en DB :
 *  - succès → COMPLETED + processedAt
 *  - erreur → FAILED si attempts+1 >= MAX, sinon reste PENDING pour retry cron
 */
export async function executePersistedTasksForEvent(
	webhookEventId: string,
): Promise<ExecutionStats> {
	const persisted = await prisma.postWebhookTask.findMany({
		where: {
			webhookEventId,
			status: { in: [PostWebhookTaskStatus.PENDING, PostWebhookTaskStatus.FAILED] },
			attempts: { lt: MAX_POST_WEBHOOK_RETRY_ATTEMPTS },
		},
		select: { id: true, taskType: true, payload: true, attempts: true },
	});

	return executeBatch(persisted);
}

/**
 * Exécute un batch de tâches persistées (utilisé par after() ET par le cron retry).
 */
export async function executeBatch(
	tasks: Array<{ id: string; taskType: string; payload: Prisma.JsonValue; attempts: number }>,
): Promise<ExecutionStats> {
	const stats: ExecutionStats = { successful: 0, failed: 0, skipped: 0 };
	const criticalFailures: Array<{ type: string; error: string }> = [];

	const results = await Promise.allSettled(
		tasks.map(async (row) => {
			const task = deserializeTask(row);
			try {
				if (task.type === "INVALIDATE_CACHE") {
					task.tags.forEach((tag) => updateTag(tag));
				} else {
					await dispatchEmailTask(task);
				}
				await prisma.postWebhookTask.update({
					where: { id: row.id },
					data: {
						status: PostWebhookTaskStatus.COMPLETED,
						processedAt: new Date(),
						attempts: row.attempts + 1,
					},
				});
				return { type: row.taskType, ok: true as const };
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				const nextAttempts = row.attempts + 1;
				const exhausted = nextAttempts >= MAX_POST_WEBHOOK_RETRY_ATTEMPTS;
				await prisma.postWebhookTask
					.update({
						where: { id: row.id },
						data: {
							status: exhausted ? PostWebhookTaskStatus.FAILED : PostWebhookTaskStatus.PENDING,
							attempts: nextAttempts,
							errorMessage,
						},
					})
					.catch(() => {
						// Best-effort: si l'update échoue, le cron retry reprendra via l'ancien status.
					});
				logger.error(`[WEBHOOK-POSTTASK] Failed to execute ${row.taskType}:`, error, {
					service: "webhook",
					taskId: row.id,
					attempts: nextAttempts,
					exhausted,
				});
				return { type: row.taskType, ok: false as const, error: errorMessage, exhausted };
			}
		}),
	);

	for (const r of results) {
		if (r.status !== "fulfilled") continue;
		const v = r.value;
		if (v.ok) {
			stats.successful++;
		} else {
			stats.failed++;
			if (v.exhausted && CRITICAL_EMAIL_TASKS.has(v.type)) {
				criticalFailures.push({ type: v.type, error: v.error });
			}
		}
	}

	if (criticalFailures.length > 0) {
		try {
			await sendWebhookFailedAlertEmail({
				eventId: "post-task-email-failure",
				eventType: criticalFailures.map((f) => f.type).join(", "),
				attempts: MAX_POST_WEBHOOK_RETRY_ATTEMPTS,
				error: criticalFailures.map((f) => `${f.type}: ${f.error}`).join("; "),
			});
		} catch {
			logger.error(
				"[WEBHOOK-POSTTASK] Failed to send admin alert for exhausted email tasks",
				undefined,
				{
					service: "webhook",
				},
			);
		}
	}

	return stats;
}

/**
 * Cron-callable : repop les tasks PENDING/FAILED dont attempts < MAX. Retourne
 * stats pour CronResult.
 */
export async function retryPendingPostWebhookTasks(batchSize: number): Promise<ExecutionStats> {
	const candidates = await prisma.postWebhookTask.findMany({
		where: {
			status: { in: [PostWebhookTaskStatus.PENDING, PostWebhookTaskStatus.FAILED] },
			attempts: { lt: MAX_POST_WEBHOOK_RETRY_ATTEMPTS },
		},
		select: { id: true, taskType: true, payload: true, attempts: true },
		orderBy: { createdAt: "asc" },
		take: batchSize,
	});

	if (candidates.length === 0) {
		return { successful: 0, failed: 0, skipped: 0 };
	}

	return executeBatch(candidates);
}
