"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validateInput, success, error, handleActionError } from "@/shared/lib/actions";
import { ADMIN_MAINTENANCE_LIMIT } from "@/shared/lib/rate-limit-config";
import { logger } from "@/shared/lib/logger";
import type { ActionState } from "@/shared/types/server-action";
import type { CronResult } from "@/modules/cron/lib/cron-result";
import { runMaintenanceTaskSchema } from "../schemas/maintenance.schemas";
import type { MaintenanceTaskId } from "../constants/maintenance-tasks";
import { retryFailedWebhooks } from "../services/retry-webhooks.service";
import { reconcileRefunds } from "../services/reconcile-refunds.service";
import { syncAsyncPayments } from "../services/sync-async-payments.service";
import { retryPostWebhookTasks } from "../services/retry-post-webhook-tasks.service";
import { cleanupOrphanMedia } from "../services/cleanup-orphan-media.service";

/**
 * Lance une tâche de maintenance à la demande — Lot 1 SIMPLIFICATION.md.
 *
 * Ces cinq passes étaient des crons quotidiens/hebdomadaires ; leur service est
 * inchangé (mêmes claims idempotents, mêmes captures Sentry, invalidation via
 * `revalidateTagsInBackground` — légale dans une Server Action, contrairement à
 * `updateTag` qui, lui, est interdit dans les routes). Seul le déclencheur
 * change : un clic sur `/admin/configuration/maintenance` au lieu du planning
 * Vercel. Le noyau resté automatique (factures, RGPD, hygiène quotidienne) vit
 * dans `modules/cron/constants/schedules.ts`.
 */
export async function runMaintenanceTask(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MAINTENANCE_LIMIT);
	if ("error" in rateLimit) return rateLimit.error;

	const validated = validateInput(runMaintenanceTaskSchema, { task: formData.get("task") });
	if ("error" in validated) return validated.error;
	const { task } = validated.data;

	// Map locale, volontairement NON exportée : dans un fichier "use server",
	// chaque export devient un endpoint RPC.
	const runners: Record<MaintenanceTaskId, () => Promise<CronResult>> = {
		"retry-webhooks": retryFailedWebhooks,
		"reconcile-refunds": reconcileRefunds,
		"sync-async-payments": syncAsyncPayments,
		"retry-post-webhook-tasks": retryPostWebhookTasks,
		"cleanup-orphan-media": cleanupOrphanMedia,
	};

	try {
		logger.info("Manual maintenance task started", { task, source: "admin-maintenance" });
		const result = await runners[task]();

		const summary = `${result.processed} traité(s), ${result.skipped} ignoré(s), ${result.errored} en erreur`;

		if (result.errored > 0) {
			// Les erreurs pas-à-pas sont déjà capturées dans Sentry par le service ;
			// ici on rend seulement le bilan visible dans le toast.
			return error(`Tâche terminée avec des erreurs — ${summary}`);
		}

		return success(result.hasMore ? `${summary}. Il en reste : relance pour continuer.` : summary);
	} catch (e) {
		return handleActionError(e, "La tâche de maintenance a échoué");
	}
}
