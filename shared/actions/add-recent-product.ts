"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { success, error, handleActionError } from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"
import {
	RECENT_PRODUCTS_COOKIE_NAME,
	RECENT_PRODUCTS_COOKIE_MAX_AGE,
	RECENT_PRODUCTS_MAX_ITEMS,
} from "@/shared/constants/recent-products"
import { getRecentProductsInvalidationTags } from "@/shared/constants/recent-products-cache"

/**
 * Server Action pour ajouter un produit aux recemment vus
 * Stocke les slugs dans un cookie cote serveur
 */
export async function addRecentProduct(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const slug = (formData.get("slug") as string)?.trim()

		// Validation
		if (!slug || slug.length < 1) {
			return error("Slug produit invalide")
		}

		const cookieStore = await cookies()
		const existingCookie = cookieStore.get(RECENT_PRODUCTS_COOKIE_NAME)

		// Recuperer les produits existants
		let products: string[] = []
		if (existingCookie?.value) {
			try {
				const parsed = JSON.parse(decodeURIComponent(existingCookie.value))
				if (Array.isArray(parsed)) {
					products = parsed
				}
			} catch {
				// Ignore les erreurs de parsing
			}
		}

		// Ajouter le nouveau produit en premier (sans doublons)
		const updated = [slug, ...products.filter((s) => s !== slug)].slice(
			0,
			RECENT_PRODUCTS_MAX_ITEMS
		)

		// Sauvegarder dans le cookie
		cookieStore.set(
			RECENT_PRODUCTS_COOKIE_NAME,
			encodeURIComponent(JSON.stringify(updated)),
			{
				path: "/",
				maxAge: RECENT_PRODUCTS_COOKIE_MAX_AGE,
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
			}
		)

		// Invalider le cache
		const tags = getRecentProductsInvalidationTags()
		tags.forEach((tag) => updateTag(tag))

		return success("Produit ajoute", { products: updated })
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'ajout")
	}
}
