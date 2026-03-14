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
import { toggleStoreClosureSchema } from "../schemas/store-settings.schemas";

export async function toggleStoreClosure(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(
			ADMIN_STORE_SETTINGS_LIMITS.TOGGLE_CLOSURE,
		);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(toggleStoreClosureSchema, {
			isClosed: formData.get("isClosed") === "true",
			closureMessage: formData.get("closureMessage") ?? "",
			reopensAt: formData.get("reopensAt") ?? "",
		});
		if ("error" in validated) return validated.error;

		const { isClosed, closureMessage, reopensAt } = validated.data;

		// Verify singleton exists
		const existing = await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
		});

		if (!existing) {
			return error("Paramètres boutique introuvables");
		}

		if (isClosed) {
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
		} else {
			await prisma.storeSettings.update({
				where: { id: STORE_SETTINGS_SINGLETON_ID },
				data: {
					isClosed: false,
					closureMessage: null,
					closedAt: null,
					closedBy: null,
					reopensAt: null,
				},
			});
		}

		getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: isClosed ? "store.close" : "store.reopen",
			targetType: "storeSettings",
			targetId: STORE_SETTINGS_SINGLETON_ID,
			metadata: isClosed ? { closureMessage, reopensAt: reopensAt?.toISOString() } : {},
		});

		return success(isClosed ? "Boutique fermée avec succès" : "Boutique réouverte avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut de la boutique");
	}
}
