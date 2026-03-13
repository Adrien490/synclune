"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_ANNOUNCEMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getAnnouncementInvalidationTags } from "../constants/cache";
import { toggleAnnouncementStatusSchema } from "../schemas/content.schemas";

export async function toggleAnnouncementStatus(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ANNOUNCEMENT_LIMITS.TOGGLE_STATUS);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(toggleAnnouncementStatusSchema, {
			id: formData.get("id"),
			isActive: formData.get("isActive") === "true",
		});
		if ("error" in validated) return validated.error;

		const { id, isActive } = validated.data;

		const existing = await prisma.announcementBar.findUnique({
			where: { id },
		});

		if (!existing) {
			return error("Cette annonce n'existe pas");
		}

		// Transaction: deactivate all others when activating
		if (isActive) {
			await prisma.$transaction([
				prisma.announcementBar.updateMany({
					where: { isActive: true, id: { not: id } },
					data: { isActive: false },
				}),
				prisma.announcementBar.update({
					where: { id },
					data: { isActive: true },
				}),
			]);
		} else {
			await prisma.announcementBar.update({
				where: { id },
				data: { isActive: false },
			});
		}

		getAnnouncementInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "announcement.toggleStatus",
			targetType: "announcement",
			targetId: id,
			metadata: { message: existing.message, isActive },
		});

		return success(isActive ? "Annonce activée avec succès" : "Annonce désactivée avec succès");
	} catch (e) {
		return handleActionError(e, "Impossible de modifier le statut de l'annonce");
	}
}
