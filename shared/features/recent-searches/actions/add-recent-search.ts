"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { success, error, handleActionError } from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"
import {
	RECENT_SEARCHES_COOKIE_NAME,
	RECENT_SEARCHES_COOKIE_MAX_AGE,
	RECENT_SEARCHES_MAX_ITEMS,
	RECENT_SEARCHES_MIN_LENGTH,
} from "../constants"
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
		const term = (formData.get("term") as string)?.trim().toLowerCase()

		// Validation
		if (!term || term.length < RECENT_SEARCHES_MIN_LENGTH) {
			return error("Terme de recherche trop court")
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

		return success("Recherche ajoutee", { searches: updated })
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'ajout")
	}
}
