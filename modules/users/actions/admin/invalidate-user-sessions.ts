"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	success,
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { adminUserIdSchema } from "../../schemas/user-admin.schemas";

/**
 * Server Action ADMIN pour forcer la déconnexion d'un utilisateur
 *
 * Supprime toutes les sessions actives de l'utilisateur,
 * le forçant à se reconnecter.
 */
export async function invalidateUserSessions(userId: string): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.INVALIDATE_SESSIONS);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2b. Validation du userId
		const validation = validateInput(adminUserIdSchema, { userId });
		if ("error" in validation) return validation.error;

		// 3. Vérifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, email: true, name: true },
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		// 4. Supprimer toutes les sessions de l'utilisateur
		const result = await prisma.session.deleteMany({
			where: { userId },
		});

		// 5. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		const displayName = user.name || user.email;
		return success(`${result.count} session(s) de ${displayName} invalidée(s)`, {
			deletedCount: result.count,
		});
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'invalidation des sessions");
	}
}
