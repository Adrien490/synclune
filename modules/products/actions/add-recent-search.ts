"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { success, handleActionError, validateInput } from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"
import {
	RECENT_SEARCHES_COOKIE_NAME,
	RECENT_SEARCHES_COOKIE_MAX_AGE,
	RECENT_SEARCHES_MAX_ITEMS,
} from "../constants/recent-searches"
import { addRecentSearchSchema } from "../schemas/recent-searches.schemas"
import { getRecentSearchesInvalidationTags } from "../constants/cache"

/**
 * Server Action pour ajouter une recherche recente
 * Stocke les recherches dans un cookie cote serveur
 */
export async function addRecentSearch(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const validation = validateInput(addRecentSearchSchema, {
			term: formData.get("term"),
		})

		if ("error" in validation) {
			return validation.error
		}

		const { term } = validation.data

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
			} catch (parseError) {
				// Cookie corrompu - reset silencieux mais loggé
				if (process.env.NODE_ENV === "development") {
					console.error("[addRecentSearch] Cookie corrompu, reset:", parseError)
				}
			}
		}

		// Ajouter la nouvelle recherche en premier (sans doublons)
		const updated = [term, ...searches.filter((s) => s !== term)].slice(
			0,
			RECENT_SEARCHES_MAX_ITEMS
		)

		// Sauvegarder dans le cookie
		cookieStore.set(RECENT_SEARCHES_COOKIE_NAME, encodeURIComponent(JSON.stringify(updated)), {
			path: "/",
			maxAge: RECENT_SEARCHES_COOKIE_MAX_AGE,
			httpOnly: true,
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		})

		// Invalider le cache
		const tags = getRecentSearchesInvalidationTags()
		tags.forEach((tag) => updateTag(tag))

		return success("Recherche ajoutée", { searches: updated })
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'ajout")
	}
}
