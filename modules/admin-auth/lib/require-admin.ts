/**
 * Gardes d'authentification admin — remplaçants des helpers Better Auth
 * (migration lean, lot 1 — décision D3 de docs/MIGRATION-PROMPTS.md).
 *
 * Il n'existe plus qu'UNE identité possible : l'administratrice, porteuse d'un
 * cookie `admin_session` signé HMAC. Plus de rôles, plus de re-vérification DB
 * (il n'y a rien à re-vérifier : zéro table d'auth), plus de distinction
 * 401/403 — un cookie absent, falsifié ou expiré produit le même refus.
 *
 * Contrats conservés à l'identique pour les ~400 call sites :
 * - `requireAdmin()` → `{ admin: true } | { error: ActionState }`
 * - `requireAdminApiRoute()` → `{ admin: true } | { response: Response }`
 * - `isAdmin()` → boolean (mémoïsé par requête)
 */

import { cache } from "react";
import { logger } from "@/shared/lib/logger";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { hasValidAdminSession } from "@/modules/admin-auth/lib/admin-session";

/**
 * Vérifie que l'appelante est l'administratrice (Server Actions).
 *
 * @example
 * ```ts
 * const adminCheck = await requireAdmin();
 * if ("error" in adminCheck) return adminCheck.error;
 * ```
 */
export async function requireAdmin(): Promise<{ admin: true } | { error: ActionState }> {
	if (await hasValidAdminSession()) {
		return { admin: true };
	}

	logger.warn("Unauthorized admin access attempt", { service: "admin-auth" });
	return {
		error: {
			status: ActionStatus.FORBIDDEN,
			message: "Accès non autorisé. Droits administrateur requis.",
		},
	};
}

/**
 * Variante route handler : renvoie une `Response` HTTP au lieu d'un ActionState.
 *
 * @example
 * ```ts
 * const admin = await requireAdminApiRoute();
 * if ("response" in admin) return admin.response;
 * ```
 */
export async function requireAdminApiRoute(): Promise<{ admin: true } | { response: Response }> {
	if (await hasValidAdminSession()) {
		return { admin: true };
	}

	logger.warn("Admin API route access denied", { service: "admin-auth" });
	return {
		response: new Response("Accès non autorisé", { status: 401 }),
	};
}

/**
 * Variante booléenne, pour les branches de privilège optionnelles (bypass admin
 * de la garde « boutique fermée », lectures admin de la couche `data/`) où un
 * refus ne doit pas produire d'erreur — juste le chemin public.
 *
 * `cache()` est ici par parité d'API avec l'ancien guard (les fetchers admin
 * l'appellent plusieurs fois par requête) — `hasValidAdminSession` est déjà
 * mémoïsé, la double couche est gratuite.
 */
export const isAdmin = cache(async (): Promise<boolean> => {
	try {
		return await hasValidAdminSession();
	} catch {
		return false;
	}
});
