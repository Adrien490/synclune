"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_ANNOUNCEMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";

import { getAnnouncementInvalidationTags } from "../constants/cache";
import { createAnnouncementSchema } from "../schemas/announcement.schemas";

export async function createAnnouncement(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ANNOUNCEMENT_LIMITS.CREATE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawLink = formData.get("link") as string | null;
		const rawLinkText = formData.get("linkText") as string | null;
		const rawEndsAt = formData.get("endsAt") as string | null;

		const validated = validateInput(createAnnouncementSchema, {
			message: formData.get("message"),
			link: rawLink ?? null,
			linkText: rawLinkText ?? null,
			startsAt: formData.get("startsAt") ?? undefined,
			endsAt: rawEndsAt ?? null,
			dismissDurationHours: Number(formData.get("dismissDurationHours")) || 24,
		});
		if ("error" in validated) return validated.error;

		const data = validated.data;

		await prisma.announcementBar.create({
			data: {
				message: sanitizeText(data.message),
				link: data.link,
				linkText: data.linkText ? sanitizeText(data.linkText) : null,
				startsAt: data.startsAt ?? new Date(),
				endsAt: data.endsAt,
				dismissDurationHours: data.dismissDurationHours,
				isActive: false,
			},
		});

		getAnnouncementInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "announcement.create",
			targetType: "announcement",
			targetId: "new",
			metadata: { message: data.message },
		});

		return success("Annonce créée avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la création de l'annonce");
	}
}
