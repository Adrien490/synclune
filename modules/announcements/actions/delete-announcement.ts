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
import { deleteAnnouncementSchema } from "../schemas/announcement.schemas";

export async function deleteAnnouncement(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ANNOUNCEMENT_LIMITS.DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(deleteAnnouncementSchema, {
			id: formData.get("id"),
		});
		if ("error" in validated) return validated.error;

		const existing = await prisma.announcementBar.findUnique({
			where: { id: validated.data.id },
		});

		if (!existing) {
			return error("Cette annonce n'existe pas");
		}

		// Hard delete: ephemeral content, no legal retention obligation
		await prisma.announcementBar.delete({
			where: { id: validated.data.id },
		});

		getAnnouncementInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "announcement.delete",
			targetType: "announcement",
			targetId: validated.data.id,
			metadata: { message: existing.message },
		});

		return success("Annonce supprimée avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression de l'annonce");
	}
}
