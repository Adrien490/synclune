"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { success, error, handleActionError } from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"
import {
	RECENT_SEARCHES_COOKIE_NAME,
	RECENT_SEARCHES_COOKIE_MAX_AGE,
} from "@/shared/constants/recent-searches"
import { getRecentSearchesInvalidationTags } from "@/shared/constants/recent-searches-cache"

/**
 * Server Action pour supprimer une recherche recente specifique
 */
export async function removeRecentSearch(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const term = (formData.get("term") as string)?.trim().toLowerCase()

		if (!term) {
			return error("Terme manquant")
		}

		const cookieStore = await cookies()
		const existingCookie = cookieStore.get(RECENT_SEARCHES_COOKIE_NAME)

		// Recuperer les recherches existantes
		let searches: string[] = []
		if (existingCookie?.value) {
			try {
				const parsed = JSON.parse(decodeURIComponent(existingCookie.value))
				if (Array.isArray(parsed)) {
					searches = parsed
				}
			} catch {
				// Ignore les erreurs
			}
		}

		// Supprimer le terme
		const updated = searches.filter((s) => s !== term)

		if (updated.length === 0) {
			// Plus de recherches, supprimer le cookie
			cookieStore.delete(RECENT_SEARCHES_COOKIE_NAME)
		} else {
			// Mettre a jour le cookie
			cookieStore.set(
				RECENT_SEARCHES_COOKIE_NAME,
				encodeURIComponent(JSON.stringify(updated)),
				{
					path: "/",
					maxAge: RECENT_SEARCHES_COOKIE_MAX_AGE,
					httpOnly: true,
					sameSite: "strict",
					secure: process.env.NODE_ENV === "production",
				}
			)
		}

		// Invalider le cache
		const tags = getRecentSearchesInvalidationTags()
		tags.forEach((tag) => updateTag(tag))

		return success("Recherche supprimee", { searches: updated })
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression")
	}
}
