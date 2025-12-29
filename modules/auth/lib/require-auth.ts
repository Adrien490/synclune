/**
 * Helpers d'authentification pour Server Actions
 *
 * Fonctions qui retournent des ActionState pour simplifier le code des actions.
 * Utilisent directement la session et Prisma pour éviter les cycles de dépendances.
 */

import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

/**
 * Select par défaut pour les données utilisateur dans require-auth
 */
const REQUIRE_AUTH_USER_SELECT = {
	id: true,
	email: true,
	name: true,
	role: true,
	image: true,
	firstName: true,
	lastName: true,
	emailVerified: true,
	stripeCustomerId: true,
} as const;

type RequireAuthUser = {
	id: string;
	email: string;
	name: string | null;
	role: string;
	image: string | null;
	firstName: string | null;
	lastName: string | null;
	emailVerified: boolean;
	stripeCustomerId: string | null;
};

/**
 * Récupère l'utilisateur depuis la DB pour les helpers d'auth
 * Version interne qui évite le cycle de dépendances avec users/
 */
async function fetchUserForAuth(userId: string): Promise<RequireAuthUser | null> {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
			deletedAt: null,
		},
		select: REQUIRE_AUTH_USER_SELECT,
	});

	return user;
}

/**
 * Vérifie que l'utilisateur est authentifié
 *
 * @returns L'utilisateur connecté ou une erreur ActionState
 *
 * @example
 * ```ts
 * const auth = await requireAuth();
 * if ("error" in auth) return auth.error;
 *
 * const user = auth.user;
 * // ... logique métier avec user
 * ```
 */
export async function requireAuth(): Promise<
	| { user: RequireAuthUser }
	| { error: ActionState }
> {
	const session = await getSession();

	if (!session?.user?.id) {
		return {
			error: {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action.",
			},
		};
	}

	const user = await fetchUserForAuth(session.user.id);

	if (!user) {
		return {
			error: {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action.",
			},
		};
	}

	return { user };
}

/**
 * Vérifie que l'utilisateur est admin
 *
 * @returns true si admin, ou une erreur ActionState
 *
 * @example
 * ```ts
 * const adminCheck = await requireAdmin();
 * if ("error" in adminCheck) return adminCheck.error;
 *
 * // L'utilisateur est admin, continuer
 * ```
 */
export async function requireAdmin(): Promise<{ admin: true } | { error: ActionState }> {
	const session = await getSession();

	if (session?.user?.role !== "ADMIN") {
		return {
			error: {
				status: ActionStatus.FORBIDDEN,
				message: "Accès non autorisé. Droits administrateur requis.",
			},
		};
	}

	return { admin: true };
}

/**
 * Vérifie que l'utilisateur est authentifié ET admin
 *
 * Combine requireAuth() et requireAdmin() en un seul appel
 * pour éviter le double fetch de session.
 *
 * @returns L'utilisateur admin ou une erreur ActionState
 *
 * @example
 * ```ts
 * const auth = await requireAdminWithUser();
 * if ("error" in auth) return auth.error;
 *
 * const user = auth.user;
 * // user.id, user.name, etc. sont disponibles
 * ```
 */
export async function requireAdminWithUser(): Promise<
	| { user: RequireAuthUser }
	| { error: ActionState }
> {
	const session = await getSession();

	if (!session?.user?.id) {
		return {
			error: {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action.",
			},
		};
	}

	if (session.user.role !== "ADMIN") {
		return {
			error: {
				status: ActionStatus.FORBIDDEN,
				message: "Accès non autorisé. Droits administrateur requis.",
			},
		};
	}

	const user = await fetchUserForAuth(session.user.id);

	if (!user) {
		return {
			error: {
				status: ActionStatus.UNAUTHORIZED,
				message: "Utilisateur non trouvé.",
			},
		};
	}

	return { user };
}
