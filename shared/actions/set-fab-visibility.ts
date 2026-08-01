"use server";

import { cookies } from "next/headers";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { success, handleActionError, validateInput } from "@/shared/lib/actions";
import { PRODUCT_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { FAB_COOKIE_MAX_AGE, getFabCookieName } from "@/shared/constants/fab";
import { setFabVisibilitySchema } from "@/shared/schemas/fab-visibility.schema";

/**
 * Server Action pour basculer la visibilité d'un FAB (préférence en cookie).
 *
 * ⚠️ L'écriture du cookie est délibérément INLINE plutôt que déléguée à un helper
 * exporté depuis un autre fichier `"use server"`. Elle vivait auparavant dans
 * `toggle-fab-visibility.ts`, dont l'en-tête `"use server"` faisait de
 * `toggleFabVisibility(key, isHidden)` un **endpoint RPC à part entière** :
 * `key: FabKey` n'est qu'un type TypeScript, effacé à l'exécution, donc un appel
 * direct pouvait passer n'importe quelle valeur et piloter le nom du cookie écrit
 * (`fab-hidden-${key}`) — sans validation, sans auth, sans rate limit. Valider ici
 * ne protégeait pas la fonction sous-jacente, qui restait exposée séparément.
 *
 * Un helper appelé par une Server Action ne doit donc jamais vivre dans un module
 * `"use server"` : soit il est inline, soit son fichier n'a pas la directive.
 */
export async function setFabVisibility(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// Action publique non authentifiée : le rate limit est le seul plafond.
	// Même préset que les autres préférences en cookie (`addRecentProduct` & co.),
	// même nature d'écriture. Audit rate limiting 2026-07-31.
	const rateLimit = await enforceRateLimitForCurrentUser(PRODUCT_LIMITS.COOKIE_ACTION);
	if ("error" in rateLimit) return rateLimit.error;

	const validation = validateInput(setFabVisibilitySchema, {
		key: formData.get("key"),
		isHidden: formData.get("isHidden"),
	});

	if ("error" in validation) {
		return validation.error;
	}

	try {
		const { key, isHidden } = validation.data;
		const cookieStore = await cookies();
		const cookieName = getFabCookieName(key);

		if (isHidden) {
			cookieStore.set(cookieName, "true", {
				path: "/",
				maxAge: FAB_COOKIE_MAX_AGE,
				httpOnly: true,
				sameSite: "strict",
				secure: process.env.NODE_ENV === "production",
			});
		} else {
			cookieStore.delete(cookieName);
		}

		return success("Préférence enregistrée", { isHidden });
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'enregistrement");
	}
}
