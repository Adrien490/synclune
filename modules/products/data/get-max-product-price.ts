"use cache";

import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

/**
 * Récupère le prix maximum parmi tous les produits publics
 * Prend en compte à la fois les prix de base et les prix des SKUs
 *
 * Utilise "use cache" avec cacheLife pour un profil de cache long car :
 * - Les prix changent rarement (ajout de produits peu fréquent)
 * - Requête DB d'agrégation coûteuse
 * - Partagée entre tous les utilisateurs
 *
 * Cache : 24h stale, 2h revalidate, 30j expire (profil reference)
 */
export async function getMaxProductPrice(): Promise<number> {
	// Cache reference : données quasi-statiques qui changent très rarement
	cacheLife("reference"); // 24h stale, 2h revalidate, 30j expire
	cacheTag(PRODUCTS_CACHE_TAGS.MAX_PRICE);

	try {
		// Récupérer le prix maximum des SKUs actifs uniquement (utiliser priceInclTax)
		const maxSkuPrice = await prisma.productSku.aggregate({
			where: {
				isActive: true,
				product: {
					status: "PUBLIC",
				},
			},
			_max: {
				priceInclTax: true,
			},
		});

		const maxPrice = maxSkuPrice._max.priceInclTax || 0;

		// Retourner un minimum de 200€ si aucun prix n'est trouvé
		// et arrondir à la dizaine supérieure pour une meilleure UX
		const finalMaxPrice = maxPrice > 0 ? maxPrice : 20000; // 200€ par défaut
		return Math.ceil(finalMaxPrice / 1000) * 1000; // Arrondir aux 10€ supérieurs (prix en centimes)
	} catch (error) {
		// Retourner une valeur par défaut en cas d'erreur
		return 20000; // 200€ par défaut (prix en centimes)
	}
}
