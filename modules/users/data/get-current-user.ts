import { headers } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";
import { auth } from "@/modules/auth/lib/auth";
import { prisma } from "@/shared/lib/prisma";

import { GET_CURRENT_USER_DEFAULT_SELECT } from "../constants/current-user.constants";
import type {
	GetCurrentUserReturn,
	CurrentUser,
} from "../types/current-user.types";

// Re-export pour compatibilité
export { GET_CURRENT_USER_DEFAULT_SELECT } from "../constants/current-user.constants";
export type {
	GetCurrentUserReturn,
	CurrentUser,
} from "../types/current-user.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère l'utilisateur actuellement connecté
 *
 * Le cache est géré dans fetchCurrentUser() avec "use cache"
 *
 * @returns L'utilisateur connecté ou null si non authentifié
 */
export async function getCurrentUser(): Promise<GetCurrentUserReturn> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.user) {
		return null;
	}

	const user = await fetchCurrentUser(session.user.id);

	return user;
}

/**
 * Récupère l'utilisateur par ID depuis la DB avec use cache
 *
 * Utilise "use cache" pour:
 * - Isoler les données par utilisateur (pas de fuite)
 * - Permettre le prefetching runtime (stale >= 30s)
 * - Stockage côté client uniquement (sécurité)
 * - Invalidation lors de mise à jour du profil
 *
 * @param userId - ID de l'utilisateur à récupérer
 * @returns L'utilisateur ou null si non trouvé/supprimé
 */
export async function fetchCurrentUser(
	userId: string
): Promise<GetCurrentUserReturn> {
	"use cache: private";
	cacheLife("session");
	cacheTag(`user-${userId}`);
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
			deletedAt: null,
		},
		select: GET_CURRENT_USER_DEFAULT_SELECT,
	});

	return user;
}
