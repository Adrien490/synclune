"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_STORE_SETTINGS_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { STORE_SETTINGS_SINGLETON_ID, getStoreSettingsInvalidationTags } from "../constants/cache";

export async function reopenStore(_prevState: unknown, _formData: FormData): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(
			ADMIN_STORE_SETTINGS_LIMITS.REOPEN_STORE,
		);
		if ("error" in rateLimit) return rateLimit.error;

		// Atomic check-and-set: WHERE isClosed=true guards against concurrent admin clicks.
		const updated = await prisma.storeSettings.updateMany({
			where: { id: STORE_SETTINGS_SINGLETON_ID, isClosed: true },
			data: {
				isClosed: false,
				closureMessage: null,
				closedAt: null,
				closedBy: null,
				reopensAt: null,
			},
		});

		if (updated.count === 0) {
			const existing = await prisma.storeSettings.findUnique({
				where: { id: STORE_SETTINGS_SINGLETON_ID },
				select: { id: true },
			});
			return error(existing ? "La boutique est déjà ouverte" : "Paramètres boutique introuvables");
		}

		getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

		return success("Boutique réouverte avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de réouvrir la boutique");
	}
}
