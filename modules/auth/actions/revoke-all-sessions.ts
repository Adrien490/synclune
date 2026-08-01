"use server";

import { headers } from "next/headers";
import { auth } from "@/modules/auth/lib/auth";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { AUTH_SESSION_CONFIG } from "@/modules/auth/lib/auth-env";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { handleActionError, success } from "@/shared/lib/actions";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import { logger } from "@/shared/lib/logger";
import type { ActionState } from "@/shared/types/server-action";

/**
 * Révoque TOUTES les sessions du compte administrateur, y compris celle qui
 * déclenche l'action — donc l'appelante est déconnectée elle aussi.
 *
 * ## Pourquoi cette action existe
 *
 * Depuis le retrait de l'espace client (2026-07-31), `modules/users` a disparu
 * avec lui, et `suspend-user.ts` — le seul code qui supprimait les sessions d'un
 * compte — avec. Il ne restait donc **aucun moyen applicatif de révoquer une
 * session** : le seul geste possible était un `DELETE FROM "Session"` à la main.
 * Sur un compte unique administrant toute la boutique, « je crois ma session
 * volée » doit avoir un bouton.
 *
 * ## Ce que ça coupe, et en combien de temps
 *
 * Better Auth sert la session depuis son cookie-cache signé **sans lecture en
 * base** tant que celui-ci est valide. Supprimer les lignes `Session` ne se voit
 * donc qu'au prochain rafraîchissement du cookie : la révocation est effective
 * sur les autres appareils en **au plus `cookieCache.maxAge`** (60 s), pas
 * instantanément. C'est précisément pourquoi ce réglage a été ramené de 300 s à
 * 60 s dans le même lot — sans lui, ce bouton mentirait de cinq minutes.
 *
 * La copie de l'UI doit annoncer cette latence, pas la masquer.
 */
export async function revokeAllSessions(
	_prevState: ActionState | undefined,
	_formData: FormData,
): Promise<ActionState> {
	// Garde admin AVANT tout : `auth.api.revokeSessions` est une écriture.
	const admin = await requireAdminWithUser();
	if ("error" in admin) return admin.error;

	try {
		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.LOGOUT);
		if ("error" in rateLimit) return rateLimit.error;

		const headersList = await headers();

		// `revokeSessions` (et non `revokeOtherSessions`) : le scénario visé est
		// « je ne sais pas laquelle de mes sessions est compromise ». Garder la
		// session courante supposerait de savoir qu'elle est saine — exactement
		// l'hypothèse qu'on ne peut pas faire ici.
		await auth.api.revokeSessions({ headers: headersList });

		// `revokeSessions` supprime les LIGNES `Session` ; il ne touche pas les
		// cookies du navigateur appelant. Sans ce `signOut`, l'opératrice resterait
		// visuellement connectée jusqu'à l'expiration de son propre cookie-cache —
		// soit exactement le doute qu'elle vient de vouloir lever. Tolérant à
		// l'échec : la session vient d'être supprimée en base, l'essentiel est fait.
		try {
			await auth.api.signOut({ headers: headersList });
		} catch (signOutError) {
			logger.warn("Sessions revoked but local sign-out failed (cookies may linger)", {
				service: "revoke-all-sessions",
				userId: admin.user.id,
				error: signOutError instanceof Error ? signOutError.message : String(signOutError),
			});
		}

		logger.warn("All sessions revoked by admin", {
			service: "revoke-all-sessions",
			userId: admin.user.id,
			cookieCacheMaxAgeSeconds: AUTH_SESSION_CONFIG.cookieCache.maxAge,
		});

		return success(
			"Toutes tes sessions ont été révoquées. Les autres appareils perdent l'accès dans la minute.",
		);
	} catch (err) {
		return handleActionError(err, "Impossible de révoquer les sessions", {
			service: "revoke-all-sessions",
		});
	}
}
