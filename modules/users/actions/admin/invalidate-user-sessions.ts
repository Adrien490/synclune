"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	requireAdmin,
	enforceRateLimitForCurrentUser,
	success,
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// Rate limit: 10 requêtes par minute
const INVALIDATE_SESSIONS_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 };

/**
 * Server Action ADMIN pour forcer la déconnexion d'un utilisateur
 *
 * Supprime toutes les sessions actives de l'utilisateur,
 * le forçant à se reconnecter.
 */
export async function invalidateUserSessions(userId: string): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(INVALIDATE_SESSIONS_RATE_LIMIT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

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
