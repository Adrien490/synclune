import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { prisma } from "@/shared/lib/prisma"
import { GET_PRODUCTS_SELECT } from "@/modules/products/constants/product.constants"
import type { Product } from "@/modules/products/types/product.types"
import { getRecentProductSlugs } from "./get-recent-product-slugs"
import { RECENT_PRODUCTS_DISPLAY_LIMIT } from "@/shared/constants/recent-products"
import { RECENT_PRODUCTS_CACHE_TAGS } from "@/shared/constants/recent-products-cache"

interface GetRecentProductsOptions {
	/** Slug du produit courant a exclure */
	excludeSlug?: string
	/** Nombre maximum de produits a retourner */
	limit?: number
}

/**
 * Recupere les produits recemment vus
 *
 * Pattern wrapper: accede aux cookies puis delegue a une fonction cachee
 *
 * @param options.excludeSlug - Slug du produit courant (pour ne pas l'afficher)
 * @param options.limit - Nombre max de produits (default: 8)
 * @returns Liste des produits recemment vus
 */
export async function getRecentProducts(
	options?: GetRecentProductsOptions
): Promise<Product[]> {
	const { excludeSlug, limit = RECENT_PRODUCTS_DISPLAY_LIMIT } = options ?? {}

	// 1. Recuperer les slugs depuis le cookie (acces runtime)
	const slugs = await getRecentProductSlugs()

	if (slugs.length === 0) {
		return []
	}

	// 2. Filtrer le produit courant
	const filteredSlugs = excludeSlug
		? slugs.filter((s) => s !== excludeSlug)
		: slugs

	if (filteredSlugs.length === 0) {
		return []
	}

	// 3. Limiter avant la requete DB
	const slugsToFetch = filteredSlugs.slice(0, limit)

	// 4. Deleguer a la fonction cachee
	return fetchProductsBySlugs(slugsToFetch)
}

/**
 * Fonction cachee qui recupere les produits par slugs
 *
 * Cache: private (isole par utilisateur via cookies)
 * Invalide par: updateTag("recent-products-list") dans addRecentProduct
 */
async function fetchProductsBySlugs(slugs: string[]): Promise<Product[]> {
	"use cache: private"
	cacheLife("relatedProducts") // 30m stale, 10m revalidate, 3h expire
	cacheTag(RECENT_PRODUCTS_CACHE_TAGS.LIST)

	try {
		const products = await prisma.product.findMany({
			where: {
				slug: { in: slugs },
				status: "PUBLIC",
				skus: {
					some: {
						isActive: true,
					},
				},
			},
			select: GET_PRODUCTS_SELECT,
		})

		// Trier selon l'ordre des slugs (plus recent en premier)
		const productsBySlug = new Map(products.map((p) => [p.slug, p]))
		const orderedProducts = slugs
			.map((slug) => productsBySlug.get(slug))
			.filter((p): p is Product => p !== undefined)

		return orderedProducts
	} catch (e) {
		// Log en dev, silencieux en prod
		if (process.env.NODE_ENV === "development") {
			console.error("[RecentProducts] Erreur DB:", e)
		}
		return []
	}
}
