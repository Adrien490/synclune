"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_STORE_SETTINGS_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { STORE_SETTINGS_SINGLETON_ID, getStoreSettingsInvalidationTags } from "../constants/cache";

export async function cancelScheduledClosure(
	_prevState: unknown,
	_formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(
			ADMIN_STORE_SETTINGS_LIMITS.CANCEL_SCHEDULED_CLOSURE,
		);
		if ("error" in rateLimit) return rateLimit.error;

		const existing = await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			select: { scheduledCloseAt: true },
		});

		if (!existing) {
			return error("Paramètres boutique introuvables");
		}

		if (!existing.scheduledCloseAt) {
			return error("Aucune fermeture planifiée");
		}

		await prisma.storeSettings.update({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			data: {
				scheduledCloseAt: null,
				closureMessage: null,
				reopensAt: null,
			},
		});

		getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "store.cancel-scheduled-closure",
			targetType: "storeSettings",
			targetId: STORE_SETTINGS_SINGLETON_ID,
			metadata: {
				canceledScheduledCloseAt: existing.scheduledCloseAt.toISOString(),
			},
		});

		return success("Fermeture planifiée annulée");
	} catch (e) {
		return handleActionError(e, "Impossible d'annuler la fermeture planifiée");
	}
}
