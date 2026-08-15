"use server";

import { cookies } from "next/headers";
import { success, handleActionError, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import {
	RECENT_SEARCHES_COOKIE_NAME,
	RECENT_SEARCHES_COOKIE_MAX_AGE,
} from "../constants/recent-searches";
import { removeRecentSearchSchema } from "../schemas/recent-searches.schemas";
import { shouldUseSecureCookies } from "@/shared/lib/cookie-security";

/**
 * Server Action pour supprimer une recherche recente specifique
 */
export async function removeRecentSearch(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const validation = validateInput(removeRecentSearchSchema, {
			term: formData.get("term"),
		});

		if ("error" in validation) {
			return validation.error;
		}

		const { term } = validation.data;

		const cookieStore = await cookies();
		const existingCookie = cookieStore.get(RECENT_SEARCHES_COOKIE_NAME);

		// Recuperer les recherches existantes
		let searches: string[] = [];
		if (existingCookie?.value) {
			try {
				const parsed: unknown = JSON.parse(decodeURIComponent(existingCookie.value));
				if (Array.isArray(parsed)) {
					searches = parsed.filter((s): s is string => typeof s === "string");
				}
			} catch {
				// Ignore les erreurs
			}
		}

		// Supprimer le terme
		const updated = searches.filter((s) => s !== term);

		if (updated.length === 0) {
			// Plus de recherches, supprimer le cookie
			cookieStore.delete(RECENT_SEARCHES_COOKIE_NAME);
		} else {
			// Mettre a jour le cookie
			cookieStore.set(RECENT_SEARCHES_COOKIE_NAME, encodeURIComponent(JSON.stringify(updated)), {
				path: "/",
				maxAge: RECENT_SEARCHES_COOKIE_MAX_AGE,
				httpOnly: true,
				sameSite: "strict",
				secure: shouldUseSecureCookies(), // SSOT — cf. shared/lib/cookie-security.ts
			});
		}

		// Aucune invalidation : cf. `add-recent-search.ts` — le lecteur cookie
		// `get-recent-searches.ts` n'est pas caché, `recent-searches-list` n'avait
		// aucun poseur.

		return success("Recherche supprimée", { searches: updated });
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}
