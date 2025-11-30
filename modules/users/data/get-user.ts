import { getSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { cacheCurrentUser } from "../constants/cache";
import { prisma } from "@/shared/lib/prisma";

import { GET_USER_SELECT } from "../constants/user.constants";
import { getUserSchema } from "../schemas/user.schemas";
import type { GetUserParams, GetUserReturn, UserDetail } from "../types/user.types";

// Re-export pour compatibilité
export { GET_USER_SELECT } from "../constants/user.constants";
export { getUserSchema } from "../schemas/user.schemas";
export type { GetUserParams, GetUserReturn, UserDetail } from "../types/user.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère un utilisateur
 * - Si userId est fourni et que l'utilisateur est admin : récupère l'utilisateur spécifié
 * - Si userId est fourni et que l'utilisateur n'est pas admin : récupère uniquement si c'est son propre profil
 * - Si userId n'est pas fourni : récupère l'utilisateur de la session courante
 *
 * @param params - Paramètres optionnels (userId)
 * @returns L'utilisateur ou null
 */
export async function getUser(
	params?: Partial<GetUserParams>
): Promise<GetUserReturn> {
	const validation = getUserSchema.safeParse(params ?? {});

	if (!validation.success) {
		if (process.env.NODE_ENV !== "production") {
			// console.warn("getUser invalid params", validation.error.issues);
		}
		return null;
	}

	const session = await getSession();

	if (!session?.user) {
		return null;
	}

	// Si userId est fourni
	if (validation.data.userId) {
		const admin = await isAdmin();

		// Admin peut récupérer n'importe quel utilisateur
		if (admin) {
			return fetchUser(validation.data.userId);
		}

		// Non-admin ne peut récupérer que son propre profil
		if (validation.data.userId !== session.user.id) {
			return null;
		}

		return fetchUser(session.user.id);
	}

	// Si pas de userId, récupérer l'utilisateur de la session
	return fetchUser(session.user.id);
}

/**
 * Récupère un utilisateur par son ID
 * Fonction utilitaire serveur pure (pas d'auth - géré dans getUser)
 *
 * @param userId - ID de l'utilisateur à récupérer
 * @returns L'utilisateur ou null
 */
export async function fetchUser(userId: string): Promise<GetUserReturn> {
	"use cache";
	cacheCurrentUser(userId);

	try {
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
				deletedAt: null, // Soft delete: exclure les utilisateurs supprimés
			},
			select: GET_USER_SELECT,
		});

		return user;
	} catch (error) {
		if (process.env.NODE_ENV !== "production") {
			// console.error("fetchUser error:", error);
		}
		return null;
	}
}
