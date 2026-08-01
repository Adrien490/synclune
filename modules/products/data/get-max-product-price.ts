import { logger } from "@/shared/lib/logger";
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
 * Cache : profil `reference` (durées dans next.config.ts — ne pas les recopier ici,
 * ce commentaire annonçait « 24h stale / 2h revalidate » alors que le profil vaut
 * 7j/24h/30j)
 */
export async function getMaxProductPrice(): Promise<number> {
	// Repli HORS du scope de cache. À l'intérieur, le `20000` de panne devenait un
	// résultat mis en cache sous le profil `reference` — soit un plafond de filtre
	// prix bloqué à 200 € pendant 24 h avant la moindre revalidation, indiscernable
	// d'un catalogue qui ne dépasserait effectivement pas 200 €.
	try {
		return await fetchMaxProductPrice();
	} catch (error) {
		logger.error("Failed to fetch max product price", error, {
			service: "getMaxProductPrice",
		});
		// Retourner une valeur par défaut en cas d'erreur
		return 20000; // 200€ par défaut (prix en centimes)
	}
}

async function fetchMaxProductPrice(): Promise<number> {
	"use cache";
	cacheLife("reference");
	cacheTag(PRODUCTS_CACHE_TAGS.MAX_PRICE);

	// Récupérer le prix maximum des SKUs actifs uniquement (utiliser priceInclTax)
	const maxSkuPrice = await prisma.productSku.aggregate({
		where: {
			isActive: true,
			product: {
				status: "PUBLIC",
				deletedAt: null,
			},
		},
		_max: {
			priceInclTax: true,
		},
	});

	const maxPrice = maxSkuPrice._max.priceInclTax ?? 0;

	// Retourner un minimum de 200€ si aucun prix n'est trouvé
	// et arrondir à la dizaine supérieure pour une meilleure UX
	const finalMaxPrice = maxPrice > 0 ? maxPrice : 20000; // 200€ par défaut
	return Math.ceil(finalMaxPrice / 1000) * 1000; // Arrondir aux 10€ supérieurs (prix en centimes)
}
