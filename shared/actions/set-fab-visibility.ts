"use server";

import { cookies } from "next/headers";
import { success, handleActionError, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { FAB_COOKIE_MAX_AGE, getFabCookieName } from "@/shared/constants/fab";
import { setFabVisibilitySchema } from "@/shared/schemas/fab-visibility.schema";
import { shouldUseSecureCookies } from "@/shared/lib/cookie-security";

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
				secure: shouldUseSecureCookies(), // SSOT — cf. shared/lib/cookie-security.ts
			});
		} else {
			cookieStore.delete(cookieName);
		}

		return success("Préférence enregistrée", { isHidden });
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'enregistrement");
	}
}
