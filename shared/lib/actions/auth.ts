/**
 * Helpers d'authentification pour Server Actions
 *
 * Wrappers autour de getCurrentUser() et isAdmin() qui retournent
 * des ActionState au lieu de booléens, pour simplifier le code des actions.
 */

import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { isAdmin } from "@/shared/lib/guards";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

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
	| { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
	| { error: ActionState }
> {
	const user = await getCurrentUser();

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
	const admin = await isAdmin();

	if (!admin) {
		return {
			error: {
				status: ActionStatus.FORBIDDEN,
				message: "Accès non autorisé. Droits administrateur requis.",
			},
		};
	}

	return { admin: true };
}
