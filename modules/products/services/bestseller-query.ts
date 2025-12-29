import { cacheLife, cacheTag } from "next/cache";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";
import { QUERY_TIMEOUTS, BESTSELLER_CONFIG } from "../constants/query.constants";

// ============================================================================
// TYPES
// ============================================================================

type BestsellerAggregation = {
	productId: string;
	totalQuantity: bigint;
};

// ============================================================================
// BESTSELLER QUERY SERVICE
// ============================================================================

/**
 * Recupere les IDs des produits tries par volume de ventes (30 derniers jours)
 * Utilise une requete SQL brute pour l'agregation GROUP BY + SUM
 *
 * Fonctionnement:
 * 1. Agregation des OrderItem.quantity par productId
 * 2. Filtre: commandes payees (PAID) sur les 30 derniers jours
 * 3. Tri par quantite totale decroissante
 *
 * Cache:
 * - Les resultats sont caches avec le tag "bestsellers"
 * - Invalide apres chaque paiement reussi (webhook stripe)
 * - Utilise NOW() cote SQL pour que le cache soit coherent
 *
 * @param limit - Nombre max de produits (1-1000, defaut: 200)
 * @returns Liste d'IDs de produits tries par ventes, ou [] en cas d'erreur
 */
export async function getBestsellerIds(
	limit: number = BESTSELLER_CONFIG.DEFAULT_LIMIT
): Promise<string[]> {
	// Valider et normaliser le parametre limit
	const safeLimit = Math.min(
		Math.max(Math.floor(Number(limit)) || BESTSELLER_CONFIG.DEFAULT_LIMIT, 1),
		BESTSELLER_CONFIG.MAX_LIMIT
	);

	return fetchBestsellerIds(safeLimit);
}

/**
 * Fonction interne cachee pour recuperer les bestsellers
 */
async function fetchBestsellerIds(limit: number): Promise<string[]> {
	"use cache";
	cacheLife("products");
	cacheTag(PRODUCTS_CACHE_TAGS.BESTSELLERS);

	try {
		// Requete avec timeout (5 secondes)
		// Le calcul de date utilise NOW() cote SQL pour coherence du cache
		const results = await Promise.race([
			prisma.$queryRaw<BestsellerAggregation[]>`
				SELECT
					oi."productId",
					SUM(oi.quantity) as "totalQuantity"
				FROM "OrderItem" oi
				INNER JOIN "Order" o ON oi."orderId" = o.id
				WHERE
					o."paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
					AND o."deletedAt" IS NULL
					AND o."paidAt" >= NOW() - make_interval(days => ${BESTSELLER_CONFIG.DAYS})
					AND oi."productId" IS NOT NULL
				GROUP BY oi."productId"
				ORDER BY "totalQuantity" DESC
				LIMIT ${limit}
			`,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Bestseller query timeout")), QUERY_TIMEOUTS.BESTSELLER_MS)
			),
		]);

		return results.map((r) => r.productId);
	} catch (error) {
		console.error("[bestseller-query] Error fetching bestseller products:", error);
		// Retourne un tableau vide pour fallback sur le tri par defaut
		return [];
	}
}
