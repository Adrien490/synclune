"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_STORE_SETTINGS_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { STORE_SETTINGS_SINGLETON_ID, getStoreSettingsInvalidationTags } from "../constants/cache";
import { closeStoreSchema } from "../schemas/store-settings.schemas";

export async function closeStore(_prevState: unknown, formData: FormData): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_STORE_SETTINGS_LIMITS.CLOSE_STORE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(closeStoreSchema, {
			closureMessage: formData.get("closureMessage") ?? "",
			reopensAt: formData.get("reopensAt") ?? "",
		});
		if ("error" in validated) return validated.error;

		const { closureMessage, reopensAt } = validated.data;

		const existing = await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			select: { isClosed: true },
		});

		if (!existing) {
			return error("Paramètres boutique introuvables");
		}

		if (existing.isClosed) {
			return error("La boutique est déjà fermée");
		}

		await prisma.storeSettings.update({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			data: {
				isClosed: true,
				closureMessage,
				closedAt: new Date(),
				closedBy: adminUser.name ?? adminUser.email,
				reopensAt,
			},
		});

		getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "store.close",
			targetType: "storeSettings",
			targetId: STORE_SETTINGS_SINGLETON_ID,
			metadata: {
				closureMessage,
				reopensAt: reopensAt?.toISOString(),
			},
		});

		return success("Boutique fermée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de fermer la boutique");
	}
}
