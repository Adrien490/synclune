import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { logger } from "@/shared/lib/logger";
import { ADMIN_SESSION_COOKIE } from "@/modules/admin-auth/constants/admin-auth.constants";
import { verifySessionToken } from "@/modules/admin-auth/lib/session-token";

/**
 * Lit et valide le cookie de session admin.
 *
 * C'est LA vérification d'identité de toute l'application : signature HMAC
 * (temps constant) + expiry. Pas de lecture en base — il n'y a plus de table de
 * session (décision D3, docs/MIGRATION-PROMPTS.md).
 *
 * `cache()` déduplique la lecture au sein d'UNE requête serveur : layout admin,
 * page et fetchers partagent la même résolution. Ce n'est pas un cache
 * temporel — la mémoïsation meurt avec la requête.
 *
 * ⚠️ Sans `AUTH_SECRET`, la réponse est TOUJOURS `false` (fail-closed) : un
 * secret absent ne doit jamais ouvrir l'admin.
 */
export const hasValidAdminSession = cache(async (): Promise<boolean> => {
	const secret = process.env.AUTH_SECRET;
	if (!secret) {
		logger.error("AUTH_SECRET manquant — session admin refusée (fail-closed)", {
			service: "admin-auth",
		});
		return false;
	}

	const cookieStore = await cookies();
	const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
	if (!token) return false;

	// `Date.now()` est une valeur instable au prérendu (PPR) : `connection()`
	// force le rendu dynamique AVANT de lire l'horloge — sans quoi Next 16
	// refuse le prérendu de toute page qui valide un cookie présent.
	await connection();
	return verifySessionToken(token, secret, Date.now());
});
