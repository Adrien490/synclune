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
import { updateClosureMessageSchema } from "../schemas/store-settings.schemas";

export async function updateClosureMessage(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(
			ADMIN_STORE_SETTINGS_LIMITS.UPDATE_CLOSURE_MESSAGE,
		);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(updateClosureMessageSchema, {
			closureMessage: formData.get("closureMessage") ?? "",
		});
		if ("error" in validated) return validated.error;

		const { closureMessage } = validated.data;

		const existing = await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			select: { isClosed: true, closureMessage: true },
		});

		if (!existing) {
			return error("Paramètres boutique introuvables");
		}

		if (!existing.isClosed) {
			return error("La boutique est ouverte, aucun message à modifier");
		}

		await prisma.storeSettings.update({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			data: { closureMessage },
		});

		getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "store.update-closure-message",
			targetType: "storeSettings",
			targetId: STORE_SETTINGS_SINGLETON_ID,
			metadata: {
				previousMessage: existing.closureMessage,
				newMessage: closureMessage,
			},
		});

		return success("Message de fermeture mis à jour");
	} catch (e) {
		return handleActionError(e, "Impossible de mettre à jour le message de fermeture");
	}
}
