"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_STORE_SETTINGS_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { STORE_SETTINGS_SINGLETON_ID, getStoreSettingsInvalidationTags } from "../constants/cache";
import { updateAnnouncementSchema } from "../schemas/store-settings.schemas";

export async function updateAnnouncement(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(
			ADMIN_STORE_SETTINGS_LIMITS.UPDATE_ANNOUNCEMENT,
		);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(updateAnnouncementSchema, {
			message: formData.get("message") ?? "",
			link: formData.get("link") ?? "",
			startsAt: formData.get("startsAt") ?? "",
			endsAt: formData.get("endsAt") ?? "",
			isActive: formData.get("isActive") ?? false,
		});
		if ("error" in validated) return validated.error;

		const { message, link, startsAt, endsAt, isActive } = validated.data;

		const existing = await prisma.storeSettings.findUnique({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			select: { id: true },
		});
		if (!existing) return error("Paramètres boutique introuvables");

		await prisma.storeSettings.update({
			where: { id: STORE_SETTINGS_SINGLETON_ID },
			data: {
				announcementMessage: message,
				announcementLink: link,
				announcementStartsAt: startsAt,
				announcementEndsAt: endsAt,
				announcementIsActive: isActive,
			},
		});

		getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));

		return success(isActive ? "Annonce publiée" : "Annonce enregistrée");
	} catch (e) {
		return handleActionError(e, "Impossible de mettre à jour l'annonce");
	}
}
