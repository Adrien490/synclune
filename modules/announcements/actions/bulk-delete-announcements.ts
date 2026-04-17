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
import { bulkDeleteAnnouncementsSchema } from "../schemas/announcement.schemas";

export async function bulkDeleteAnnouncements(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ANNOUNCEMENT_LIMITS.BULK_DELETE);
		if ("error" in rateLimit) return rateLimit.error;

		const ids = formData.getAll("ids") as string[];

		const validated = validateInput(bulkDeleteAnnouncementsSchema, { ids });
		if ("error" in validated) return validated.error;

		const existing = await prisma.announcementBar.findMany({
			where: { id: { in: validated.data.ids } },
			select: { id: true, message: true },
		});

		if (existing.length === 0) {
			return error("Aucune annonce trouvée");
		}

		const deletableIds = existing.map((a) => a.id);

		// Hard delete: ephemeral content, no legal retention obligation
		await prisma.announcementBar.deleteMany({
			where: { id: { in: deletableIds } },
		});

		getAnnouncementInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "announcement.bulkDelete",
			targetType: "announcement",
			targetId: deletableIds.join(","),
			metadata: { count: deletableIds.length, messages: existing.map((a) => a.message) },
		});

		const skippedCount = validated.data.ids.length - deletableIds.length;
		const message =
			skippedCount > 0
				? `${deletableIds.length} annonce(s) supprimée(s), ${skippedCount} introuvable(s)`
				: `${deletableIds.length} annonce(s) supprimée(s)`;

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression des annonces");
	}
}
