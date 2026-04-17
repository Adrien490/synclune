"use server";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_ANNOUNCEMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { invalidateAnnouncementCache } from "../constants/cache";
import { duplicateAnnouncementSchema } from "../schemas/announcement.schemas";

export async function duplicateAnnouncement(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ANNOUNCEMENT_LIMITS.DUPLICATE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(duplicateAnnouncementSchema, {
			id: formData.get("id"),
		});
		if ("error" in validated) return validated.error;

		const source = await prisma.announcementBar.findUnique({
			where: { id: validated.data.id },
			select: {
				message: true,
				link: true,
				linkText: true,
				dismissDurationHours: true,
			},
		});

		if (!source) {
			return notFound("L'annonce source");
		}

		const duplicated = await prisma.announcementBar.create({
			data: {
				message: source.message,
				link: source.link,
				linkText: source.linkText,
				dismissDurationHours: source.dismissDurationHours,
				isActive: false,
				startsAt: new Date(),
				endsAt: null,
			},
			select: { id: true, message: true },
		});

		invalidateAnnouncementCache();

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "announcement.duplicate",
			targetType: "announcement",
			targetId: duplicated.id,
			metadata: { sourceId: validated.data.id, message: duplicated.message },
		});

		return success("Annonce dupliquée avec succès", { id: duplicated.id });
	} catch (e) {
		return handleActionError(e, "Erreur lors de la duplication de l'annonce");
	}
}
