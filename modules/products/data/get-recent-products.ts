import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { PRODUCT_CAROUSEL_SELECT } from "../constants/product.constants";
import type { ProductCarouselItem } from "../types/product.types";
import { serializeProducts } from "../utils/serialize-product";
import { getRecentProductSlugs } from "./get-recent-product-slugs";
import { RECENT_PRODUCTS_DISPLAY_LIMIT } from "../constants/recent-products";
import { RECENT_PRODUCTS_CACHE_TAGS } from "../constants/cache";

interface GetRecentProductsOptions {
	/** Slug du produit courant a exclure */
	excludeSlug?: string;
	/** Nombre maximum de produits a retourner */
	limit?: number;
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
	options?: GetRecentProductsOptions,
): Promise<ProductCarouselItem[]> {
	const { excludeSlug, limit = RECENT_PRODUCTS_DISPLAY_LIMIT } = options ?? {};

	// 1. Recuperer les slugs depuis le cookie (acces runtime)
	const slugs = await getRecentProductSlugs();

	if (slugs.length === 0) {
		return [];
	}

	// 2. Filtrer le produit courant
	const filteredSlugs = excludeSlug ? slugs.filter((s) => s !== excludeSlug) : slugs;

	if (filteredSlugs.length === 0) {
		return [];
	}

	// 3. Limiter avant la requete DB
	const slugsToFetch = filteredSlugs.slice(0, limit);

	// 4. Deleguer a la fonction cachee
	return fetchProductsBySlugs(slugsToFetch);
}

/**
 * Fonction cachee qui recupere les produits par slugs
 *
 * Cache: private (isole par utilisateur - la cle de cache inclut les slugs
 * derives du cookie utilisateur, donc pas de fuite inter-utilisateurs).
 *
 * Note: Le tag `RECENT_PRODUCTS_CACHE_TAGS.LIST` est volontairement global.
 * Il permet un bust simultane pour tous les users quand le catalogue change
 * (produit supprime/archivee). Acceptable car les visites sont peu frequentes
 * et chaque user a un cache independant (keyed par slugs).
 *
 * Invalide par: updateTag("recent-products-list") lors de mutations produits.
 */
async function fetchProductsBySlugs(slugs: string[]): Promise<ProductCarouselItem[]> {
	"use cache: private";
	cacheLife("catalog"); // 30m stale, 10m revalidate, 3h expire
	cacheTag(RECENT_PRODUCTS_CACHE_TAGS.LIST);

	try {
		const products = await prisma.product.findMany({
			where: {
				slug: { in: slugs },
				status: "PUBLIC",
				...notDeleted,
				skus: {
					some: {
						isActive: true,
					},
				},
			},
			select: PRODUCT_CAROUSEL_SELECT,
		});

		// Trier selon l'ordre des slugs (plus recent en premier)
		const productsBySlug = new Map(products.map((p) => [p.slug, p]));
		const orderedProducts = slugs
			.map((slug) => productsBySlug.get(slug))
			.filter((p): p is ProductCarouselItem => p !== undefined);

		return serializeProducts(orderedProducts);
	} catch (e) {
		logger.error("Failed to fetch recent products from DB", e, { service: "fetchProductsBySlugs" });
		return [];
	}
}
