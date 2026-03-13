"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_ANNOUNCEMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";

import { getAnnouncementInvalidationTags } from "../constants/cache";
import { updateAnnouncementSchema } from "../schemas/announcement.schemas";

export async function updateAnnouncement(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ANNOUNCEMENT_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawLink = formData.get("link") as string | null;
		const rawLinkText = formData.get("linkText") as string | null;
		const rawEndsAt = formData.get("endsAt") as string | null;

		const validated = validateInput(updateAnnouncementSchema, {
			id: formData.get("id"),
			message: formData.get("message"),
			link: rawLink ?? null,
			linkText: rawLinkText ?? null,
			startsAt: formData.get("startsAt"),
			endsAt: rawEndsAt ?? null,
			dismissDurationHours: Number(formData.get("dismissDurationHours")) || 24,
		});
		if ("error" in validated) return validated.error;

		const data = validated.data;

		const existing = await prisma.announcementBar.findUnique({
			where: { id: data.id },
		});

		if (!existing) {
			return error("Cette annonce n'existe pas");
		}

		await prisma.announcementBar.update({
			where: { id: data.id },
			data: {
				message: sanitizeText(data.message),
				link: data.link,
				linkText: data.linkText ? sanitizeText(data.linkText) : null,
				startsAt: data.startsAt,
				endsAt: data.endsAt,
				dismissDurationHours: data.dismissDurationHours,
			},
		});

		getAnnouncementInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "announcement.update",
			targetType: "announcement",
			targetId: data.id,
			metadata: { message: data.message },
		});

		return success("Annonce modifiée avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la modification de l'annonce");
	}
}
