"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { EReportingStatus } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { INVOICE_FEATURE_FLAGS } from "@/modules/invoices/constants/feature-flags";
import type { ActionState } from "@/shared/types/server-action";
import { logger } from "@/shared/lib/logger";

const retryEReportingBatchSchema = z.object({
	id: z.string().min(1, "ID batch requis"),
});

/**
 * Relance la transmission d'un batch e-reporting (Phase 3 — DGFiP).
 *
 * Fait passer un batch REJECTED / ABANDONED → PENDING + reset providerBatchId
 * pour que le cron `transmit-ereporting-batch` le repique au prochain tick.
 * `retryCount` est incrémenté (le cron tient ses propres retries automatiques,
 * mais cette action laisse l'admin forcer un retry après correction manuelle).
 *
 * Gated par `INVOICE_FEATURE_FLAGS.enable_ereporting` (fail-closed si OFF).
 * EINV-UI-011 audit 2026-05-28.
 */
export async function retryEReportingBatch(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;

		if (!INVOICE_FEATURE_FLAGS.enable_ereporting) {
			return error(
				"E-reporting désactivé (flag INVOICE_ENABLE_EREPORTING=false). Activez le flag avant de relancer une transmission.",
			);
		}

		const validation = validateInput(retryEReportingBatchSchema, {
			id: safeFormGet(formData, "id"),
		});
		if ("error" in validation) return validation.error;

		const batch = await prisma.eReportingBatch.findUnique({
			where: { id: validation.data.id },
			select: { id: true, status: true, retryCount: true },
		});
		if (!batch) {
			return error("Batch introuvable");
		}

		if (batch.status !== EReportingStatus.REJECTED && batch.status !== EReportingStatus.ABANDONED) {
			return error(
				`Statut ${batch.status} non éligible. Seuls REJECTED ou ABANDONED peuvent être relancés.`,
			);
		}

		await prisma.eReportingBatch.update({
			where: { id: batch.id },
			data: {
				status: EReportingStatus.PENDING,
				providerBatchId: null,
				providerResponse: undefined,
				rejectedAt: null,
				rejectionReason: null,
				sentAt: null,
				// Reset (et non increment) : l'admin a corrigé la cause manuellement,
				// on repart sur le backoff complet. Incrementer ferait passer un
				// batch ABANDONED (retryCount=MAX_RETRY) au-dessus du filtre cron
				// `retryCount < MAX_RETRY` → batch coincé indéfiniment.
				retryCount: 0,
			},
		});

		logger.info(`E-reporting batch ${batch.id} reset to PENDING for retry`, {
			service: "retry-ereporting-batch",
			adminUserId: auth.user.id,
			previousStatus: batch.status,
			previousRetryCount: batch.retryCount,
		});

		updateTag(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);

		return success(
			`Batch remis en file de transmission. Le cron transmit-ereporting-batch le retraitera au prochain tick.`,
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la relance de transmission e-reporting");
	}
}
