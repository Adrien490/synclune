"use server"

import { updateTag } from "next/cache"
import { cookies } from "next/headers"
import { success, handleActionError, validateInput } from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"
import {
	RECENT_PRODUCTS_COOKIE_NAME,
	RECENT_PRODUCTS_COOKIE_MAX_AGE,
	RECENT_PRODUCTS_MAX_ITEMS,
} from "../constants/recent-products"
import { getRecentProductsInvalidationTags } from "../constants/cache"
import { recentProductSlugSchema } from "@/shared/schemas/recent-product-schema"

/**
 * Server Action pour ajouter un produit aux recemment vus
 * Stocke les slugs dans un cookie cote serveur
 */
export async function addRecentProduct(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const rawSlug = (formData.get("slug") as string)?.trim()

		// Validation avec Zod
		const validated = validateInput(recentProductSlugSchema, rawSlug)
		if ("error" in validated) return validated.error
		const slug = validated.data

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
				// Cookie corrompu - reset silencieux
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

		return success("Produit ajouté", { products: updated })
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'ajout")
	}
}
