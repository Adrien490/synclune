import { headers } from "next/headers";
import { auth } from "@/modules/auth/lib/auth";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { SESSION_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { cacheDefault } from "@/shared/lib/cache";
import { prisma } from "@/shared/lib/prisma";

import type {
	UserSession,
	GetUserSessionsReturn,
} from "../types/session.types";

// Re-export pour compatibilité
export type {
	UserSession,
	GetUserSessionsReturn,
} from "../types/session.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère les sessions de l'utilisateur actuel
 * Avec indication de la session courante
 *
 * NOTE: Ne peut pas utiliser "use cache" car utilise headers() qui est dynamique
 */
export async function getUserSessions(): Promise<GetUserSessionsReturn> {
	const user = await getCurrentUser();

	if (!user) {
		return [];
	}

	const headersList = await headers();
	const currentSession = await auth.api.getSession({
		headers: headersList,
	});

	return fetchUserSessions(user.id, currentSession?.session?.id);
}

/**
 * Récupère les sessions d'un utilisateur avec enrichissement
 * @param userId L'ID de l'utilisateur
 * @param currentSessionId L'ID de la session courante (optionnel)
 */
export async function fetchUserSessions(
	userId: string,
	currentSessionId?: string
): Promise<GetUserSessionsReturn> {
	"use cache: private";
	cacheDefault(SESSION_CACHE_TAGS.SESSIONS(userId));

	try {
		const sessions = await prisma.session.findMany({
			where: {
				userId,
			},
			select: {
				id: true,
				ipAddress: true,
				userAgent: true,
				createdAt: true,
				expiresAt: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		const now = new Date();

		return sessions.map((session) => ({
			...session,
			isCurrentSession: currentSessionId
				? session.id === currentSessionId
				: false,
			isExpired: session.expiresAt < now,
		}));
	} catch (error) {
		// console.error("Erreur lors de la récupération des sessions utilisateur:", error);
		return [];
	}
}
