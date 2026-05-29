/**
 * Helpers d'authentification pour Server Actions
 *
 * Fonctions qui retournent des ActionState pour simplifier le code des actions.
 * Utilisent directement la session et Prisma pour éviter les cycles de dépendances.
 */

import { AccountStatus, type Prisma } from "@/app/generated/prisma/client";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
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
	emailVerified: true,
	stripeCustomerId: true,
} as const;

type RequireAuthUser = Prisma.UserGetPayload<{
	select: typeof REQUIRE_AUTH_USER_SELECT;
}>;

/**
 * Récupère l'utilisateur depuis la DB pour les helpers d'auth.
 *
 * Filtre par défaut: `deletedAt IS NULL` + `suspendedAt IS NULL` + `accountStatus = ACTIVE`.
 * Bloque suspended / PENDING_DELETION / INACTIVE / ANONYMIZED.
 *
 * Pour `cancelAccountDeletion` (qui doit accepter PENDING_DELETION),
 * passer `allowPendingDeletion: true` → filtre élargi à `[ACTIVE, PENDING_DELETION]`.
 */
async function fetchUserForAuth(
	userId: string,
	options: { allowPendingDeletion?: boolean } = {},
): Promise<RequireAuthUser | null> {
	const allowedStatuses = options.allowPendingDeletion
		? [AccountStatus.ACTIVE, AccountStatus.PENDING_DELETION]
		: [AccountStatus.ACTIVE];

	const user = await prisma.user.findUnique({
		where: {
			id: userId,
			...notDeleted,
			suspendedAt: null,
			accountStatus: { in: allowedStatuses },
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
export async function requireAuth(): Promise<{ user: RequireAuthUser } | { error: ActionState }> {
	const session = await getSession();

	if (!session?.user.id) {
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
 * Variante de `requireAuth()` qui accepte un compte en `PENDING_DELETION`.
 *
 * À utiliser EXCLUSIVEMENT par les flows qui doivent rester accessibles
 * pendant la période de grâce 30 jours (RGPD Art. 17) :
 * - `cancelAccountDeletion` (annuler la demande de suppression)
 * - logout / signOut
 *
 * Refuse toujours: deleted, suspended, INACTIVE, ANONYMIZED.
 */
export async function requireAuthAllowPendingDeletion(): Promise<
	{ user: RequireAuthUser } | { error: ActionState }
> {
	const session = await getSession();

	if (!session?.user.id) {
		return {
			error: {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action.",
			},
		};
	}

	const user = await fetchUserForAuth(session.user.id, { allowPendingDeletion: true });

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
 * Autorise les invités (aucune session) MAIS rejette une session dont le
 * compte n'est pas `ACTIVE` (suspendu / INACTIVE / PENDING_DELETION / supprimé).
 *
 * À utiliser dans les flux commerce optionnellement authentifiés (checkout,
 * validation de code promo) où `requireAuth()` est trop strict (il refuse les
 * invités). Ferme la fenêtre cookie-cache Better Auth (~5 min) pendant laquelle
 * un compte fraîchement suspendu garde un `session.user.id` exploitable :
 * `fetchUserForAuth` re-vérifie le statut en DB.
 *
 * @returns `{ ok: true }` (invité OU compte actif) ou une erreur ActionState.
 *
 * @example
 * ```ts
 * const gate = await requireActiveAccountIfAuthenticated();
 * if ("error" in gate) return gate.error;
 * ```
 */
export async function requireActiveAccountIfAuthenticated(): Promise<
	{ ok: true } | { error: ActionState }
> {
	const session = await getSession();

	// Invité : pas de session → autorisé (le flux gère le cas userId=null).
	if (!session?.user.id) {
		return { ok: true };
	}

	const user = await fetchUserForAuth(session.user.id);

	if (!user) {
		logger.warn("Active-account gate denied - authenticated session on non-active account", {
			service: "require-auth",
			userId: session.user.id,
		});
		return {
			error: {
				status: ActionStatus.FORBIDDEN,
				message: "Votre compte n'est pas autorisé à effectuer cette action.",
			},
		};
	}

	return { ok: true };
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

	if (session?.user.role !== "ADMIN" || !session.user.id) {
		logger.warn("Unauthorized admin access attempt", {
			service: "require-auth",
			userId: session?.user.id ?? "unauthenticated",
			role: session?.user.role ?? "none",
		});
		return {
			error: {
				status: ActionStatus.FORBIDDEN,
				message: "Accès non autorisé. Droits administrateur requis.",
			},
		};
	}

	// Verify admin still exists and hasn't been soft-deleted or demoted
	const user = await fetchUserForAuth(session.user.id);

	if (!user || user.role !== "ADMIN") {
		logger.warn("Admin access denied - stale session (demoted or deleted)", {
			service: "require-auth",
			userId: session.user.id,
			sessionRole: session.user.role,
			dbRole: user?.role ?? "user_not_found",
		});
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
/**
 * Verifies that the current user is admin for API routes (not server actions).
 *
 * Unlike requireAdmin() which returns ActionState, this returns a Response
 * suitable for route handlers. Re-verifies the role from DB to prevent
 * stale cookie cache exploitation (5-min window after demotion).
 *
 * @returns The admin user or an HTTP Response error
 */
export async function requireAdminApiRoute(): Promise<
	{ user: RequireAuthUser } | { response: Response }
> {
	const session = await getSession();

	if (!session?.user.id) {
		return {
			response: new Response("Accès non autorisé", { status: 401 }),
		};
	}

	if (session.user.role !== "ADMIN") {
		return {
			response: new Response("Accès non autorisé", { status: 403 }),
		};
	}

	// Re-verify admin role from DB (session cookie cache may be stale)
	const user = await fetchUserForAuth(session.user.id);

	if (!user || user.role !== "ADMIN") {
		logger.warn("Admin API route access denied - stale session", {
			service: "require-auth",
			userId: session.user.id,
			sessionRole: session.user.role,
			dbRole: user?.role ?? "user_not_found",
		});
		return {
			response: new Response("Accès non autorisé", { status: 403 }),
		};
	}

	return { user };
}

export async function requireAdminWithUser(): Promise<
	{ user: RequireAuthUser } | { error: ActionState }
> {
	const session = await getSession();

	if (!session?.user.id) {
		return {
			error: {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action.",
			},
		};
	}

	if (session.user.role !== "ADMIN") {
		logger.warn("Unauthorized admin access attempt", {
			service: "require-auth",
			userId: session.user.id,
			role: session.user.role,
		});
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

	// Re-verify admin role from DB (session may be stale after demotion)
	if (user.role !== "ADMIN") {
		logger.warn("Admin access denied - stale session (demoted or deleted)", {
			service: "require-auth",
			userId: session.user.id,
			sessionRole: session.user.role,
			dbRole: user.role,
		});
		return {
			error: {
				status: ActionStatus.FORBIDDEN,
				message: "Accès non autorisé. Droits administrateur requis.",
			},
		};
	}

	return { user };
}
