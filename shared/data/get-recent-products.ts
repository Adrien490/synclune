import "server-only"

import { prisma } from "@/shared/lib/prisma"
import { GET_PRODUCTS_SELECT } from "@/modules/products/constants/product.constants"
import type { Product } from "@/modules/products/types/product.types"
import { getRecentProductSlugs } from "./get-recent-product-slugs"
import { RECENT_PRODUCTS_DISPLAY_LIMIT } from "@/shared/constants/recent-products"

interface GetRecentProductsOptions {
	/** Slug du produit courant a exclure */
	excludeSlug?: string
	/** Nombre maximum de produits a retourner */
	limit?: number
}

/**
 * Recupere les produits recemment vus
 *
 * @param options.excludeSlug - Slug du produit courant (pour ne pas l'afficher)
 * @param options.limit - Nombre max de produits (default: 8)
 * @returns Liste des produits recemment vus
 */
export async function getRecentProducts(
	options?: GetRecentProductsOptions
): Promise<Product[]> {
	const { excludeSlug, limit = RECENT_PRODUCTS_DISPLAY_LIMIT } = options ?? {}

	// 1. Recuperer les slugs depuis le cookie
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

	try {
		// 4. Recuperer les produits depuis la DB
		const products = await prisma.product.findMany({
			where: {
				slug: { in: slugsToFetch },
				status: "PUBLIC",
				skus: {
					some: {
						isActive: true,
					},
				},
			},
			select: GET_PRODUCTS_SELECT,
		})

		// 5. Trier selon l'ordre du cookie (plus recent en premier)
		const productsBySlug = new Map(products.map((p) => [p.slug, p]))
		const orderedProducts = slugsToFetch
			.map((slug) => productsBySlug.get(slug))
			.filter((p): p is Product => p !== undefined)

		return orderedProducts
	} catch {
		return []
	}
}
