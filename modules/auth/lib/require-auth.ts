/**
 * Helpers d'authentification pour Server Actions
 *
 * Fonctions qui retournent des ActionState pour simplifier le code des actions.
 * Utilisent directement la session et Prisma pour éviter les cycles de dépendances.
 */

// `AccountStatus` vient de `prisma/enums` et non de `prisma/client` : depuis que les
// 3 routes de documents fiscaux consomment `isVerifiedAdmin()`, ce module est tiré dans
// leur graphe. Un import de valeur depuis `/client` y ferait entrer tout le runtime
// Prisma (et casserait les suites qui mockent `/client` avec les seuls enums dont elles
// ont besoin). `Prisma` reste importé en `type` — effacé à la compilation.
import { cache } from "react";
import { AccountStatus } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
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
 * **C'est LE point de re-vérification**, celui qui rend inopérant un cookie de
 * session périmé. Filtre : `deletedAt IS NULL` + `suspendedAt IS NULL` +
 * `accountStatus = ACTIVE`. Bloque donc suspended / PENDING_DELETION /
 * INACTIVE / ANONYMIZED — et pas seulement une rétrogradation de rôle.
 *
 * `cache()` déduplique l'appel au sein d'UNE requête serveur : le layout admin et
 * la page qu'il enveloppe se gardent tous les deux, sans payer deux requêtes.
 * Ce n'est pas un cache temporel — aucune fenêtre de staleness introduite.
 *
 * ⚠️ Garder la signature à UN SEUL argument primitif. `cache()` mémoïse sur
 * l'identité des arguments : un paramètre objet (`{}` littéral au call site)
 * produirait une clé neuve à chaque appel et annulerait silencieusement la
 * déduplication.
 */
const fetchUserForAuth = cache(async (userId: string): Promise<RequireAuthUser | null> => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
			...notDeleted,
			suspendedAt: null,
			accountStatus: { in: [AccountStatus.ACTIVE] },
		},
		select: REQUIRE_AUTH_USER_SELECT,
	});

	return user;
});

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

/*
 * `requireAuthAllowPendingDeletion()` a été supprimé le 2026-07-31.
 *
 * C'était une variante volontairement PLUS PERMISSIVE (elle acceptait un compte
 * en `PENDING_DELETION`), taillée pour `cancelAccountDeletion` et la période de
 * grâce RGPD de 30 jours. Ces deux surfaces sont parties avec l'espace client :
 * il ne restait qu'un helper laxiste sans appelant, exactement le genre de chose
 * que le prochain venu attrape en cherchant « le helper d'auth ».
 *
 * Si un chemin de suppression de compte revient un jour, le réintroduire
 * explicitement — ne pas élargir le filtre de `fetchUserForAuth` à sa place.
 */

/**
 * Autorise les invités (aucune session) MAIS rejette une session dont le
 * compte n'est pas `ACTIVE` (suspendu / INACTIVE / PENDING_DELETION / supprimé).
 *
 * À utiliser dans les flux commerce optionnellement authentifiés (checkout,
 * validation de code promo) où `requireAuth()` est trop strict (il refuse les
 * invités). Ferme la fenêtre cookie-cache Better Auth pendant laquelle
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
 * Vérifie si l'acteur est RÉELLEMENT admin, sans bloquer (retourne un booléen).
 *
 * À utiliser pour les branches de privilège optionnelles (ex: bypass de la
 * garde « boutique fermée » au checkout) où un non-admin doit simplement
 * suivre le chemin normal au lieu de recevoir une erreur.
 *
 * `session.user.role` seul est best-effort (stale jusqu'à
 * `AUTH_SESSION_CONFIG.cookieCache.maxAge`, cookieCache Better Auth — cf.
 * EINV-SEC-008) : on re-vérifie le rôle en DB UNIQUEMENT quand le cookie
 * prétend admin. Aucune query supplémentaire pour les invités et les clients
 * normaux.
 *
 * ⚠️ Passe par `fetchUserForAuth()` et PAS par un `findUnique` local : le
 * filtre doit couvrir `deletedAt` **et** `suspendedAt` **et** `accountStatus`,
 * pas seulement le rôle. Les routes de documents fiscaux avaient leur propre
 * copie de cette query (`resolve-invoice-admin.ts`, supprimé) qui ne lisait que
 * `role` — un admin *suspendu* y gardait le bypass d'ownership sur des PDF
 * porteurs de PII. Une seule implémentation ne peut pas diverger.
 *
 * @param session - Session courante (déjà résolue par l'appelant via getSession())
 * @param service - Nom du service appelant, pour le log de session stale.
 */
export async function isVerifiedAdmin(
	session: { user: { id: string; role?: string | null } } | null | undefined,
	service = "require-auth",
): Promise<boolean> {
	if (!session?.user.id || session.user.role !== "ADMIN") {
		return false;
	}

	const user = await fetchUserForAuth(session.user.id);

	if (!user || user.role !== "ADMIN") {
		logger.warn("Admin privilege branch denied - stale session (demoted, suspended or deleted)", {
			service,
			userId: session.user.id,
			sessionRole: session.user.role,
			// `fetchUserForAuth` filtre aussi le statut de compte : un compte
			// suspendu ou non-ACTIVE ressort `null`, donc indistinct d'un compte
			// absent. C'est voulu — la branche de privilège est refusée pareil.
			dbRole: user?.role ?? "not_active_or_missing",
		});
		return false;
	}

	return true;
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

/**
 * Vérifie que l'utilisateur est authentifié ET admin, et renvoie son objet user.
 *
 * Le seul helper admin qui distingue « pas de session » (401 UNAUTHORIZED) de
 * « session non-admin » (403 FORBIDDEN) — `requireAdmin()` répond FORBIDDEN dans
 * les deux cas. C'est pourquoi le layout admin et `assertAdminPage()` passent par
 * celui-ci : une visiteuse déconnectée doit atterrir sur `/connexion`, pas sur
 * une page « accès refusé ».
 *
 * @example
 * ```ts
 * const auth = await requireAdminWithUser();
 * if ("error" in auth) return auth.error;
 * const user = auth.user;
 * ```
 */
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
