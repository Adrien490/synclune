"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import {
	validateInput,
	success,
	error,
	handleActionError,
	parseFormIds,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { bulkInvalidateSessionsSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Bulk invalidate sessions for multiple users.
 *
 * Security incident response: force logout of multiple users at once
 * (e.g. suspected credential stuffing, compromise, admin-initiated lockout).
 * Skips the invoking admin automatically to keep them logged in.
 */
export async function bulkInvalidateSessions(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.BULK_OPERATIONS);
		if ("error" in rateCheck) return rateCheck.error;

		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const parseResult = parseFormIds(formData);
		if ("error" in parseResult) return parseResult.error;

		const validation = validateInput(bulkInvalidateSessionsSchema, { ids: parseResult.ids });
		if ("error" in validation) return validation.error;

		// Self-protection: filter out admin's own ID silently rather than reject the whole batch
		const eligibleIds = validation.data.ids.filter((id) => id !== adminUser.id);
		const skippedSelf = validation.data.ids.length - eligibleIds.length;

		if (eligibleIds.length === 0) {
			return error("Aucun utilisateur eligible (impossible d'invalider ses propres sessions).");
		}

		const result = await prisma.session.deleteMany({
			where: { userId: { in: eligibleIds } },
		});

		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "user.bulkInvalidateSessions",
			targetType: "user",
			targetId: eligibleIds.join(","),
			metadata: {
				userCount: eligibleIds.length,
				sessionCount: result.count,
				skippedSelf,
			},
		});

		const suffix = skippedSelf > 0 ? ` (${skippedSelf} ignore)` : "";
		return success(
			`${result.count} session(s) invalidee(s) pour ${eligibleIds.length} utilisateur(s)${suffix}.`,
			{
				deletedSessions: result.count,
				affectedUsers: eligibleIds.length,
				skippedSelf,
			},
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'invalidation des sessions");
	}
}
