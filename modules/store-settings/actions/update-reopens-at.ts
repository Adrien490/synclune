"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_STORE_SETTINGS_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { STORE_SETTINGS_SINGLETON_ID, getStoreSettingsInvalidationTags } from "../constants/cache";
import { updateReopensAtSchema } from "../schemas/store-settings.schemas";

export async function updateReopensAt(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(
			ADMIN_STORE_SETTINGS_LIMITS.UPDATE_REOPENS_AT,
		);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(updateReopensAtSchema, {
			reopensAt: formData.get("reopensAt") ?? "",
		});
		if ("error" in validated) return validated.error;

		const { reopensAt } = validated.data;

		// Atomic: only update when store is currently closed (race-safe vs concurrent reopen).
		// Capture previous reopensAt via findUnique BEFORE updateMany for audit log delta.
		const existing = await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			select: { isClosed: true, reopensAt: true },
		});

		if (!existing) {
			return error("Paramètres boutique introuvables");
		}

		const updated = await prisma.storeSettings.updateMany({
			where: { id: STORE_SETTINGS_SINGLETON_ID, isClosed: true },
			data: { reopensAt },
		});

		if (updated.count === 0) {
			return error("La boutique est ouverte, aucune réouverture à planifier");
		}

		getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

		return success(
			reopensAt ? "Date de réouverture mise à jour" : "Réouverture automatique désactivée",
		);
	} catch (e) {
		return handleActionError(e, "Impossible de mettre à jour la date de réouverture");
	}
}
