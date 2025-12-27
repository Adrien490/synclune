import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { connection } from "next/server";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Periode de calcul de la popularite en jours */
const POPULARITY_DAYS = 30;

/** Poids des ventes dans le score de popularite */
const SALES_WEIGHT = 3;

/** Poids des avis dans le score de popularite */
const REVIEWS_WEIGHT = 2;

/** Limite par defaut de produits populaires */
const DEFAULT_POPULARITY_LIMIT = 200;

/** Limite maximale de produits populaires */
const MAX_POPULARITY_LIMIT = 1000;

/** Timeout de la requete en millisecondes */
const QUERY_TIMEOUT_MS = 5000;

// ============================================================================
// TYPES
// ============================================================================

type PopularityAggregation = {
	productId: string;
	popularityScore: number;
};

// ============================================================================
// POPULARITY QUERY SERVICE
// ============================================================================

/**
 * Recupere les IDs des produits tries par score de popularite
 *
 * Score de popularite = (ventes 30j * SALES_WEIGHT) + (note moyenne * nombre d'avis * REVIEWS_WEIGHT)
 *
 * Ce score combine:
 * - Les ventes recentes (30 derniers jours) - indicateur de demande actuelle
 * - Les avis (note * quantite) - indicateur de satisfaction client
 *
 * Difference avec best-selling:
 * - best-selling = tri uniquement par ventes
 * - popular = tri par score combine (ventes + avis)
 *
 * @param limit - Nombre max de produits (1-1000, defaut: 200)
 * @returns Liste d'IDs de produits tries par popularite, ou [] en cas d'erreur
 */
export async function getPopularProductIds(
	limit: number = DEFAULT_POPULARITY_LIMIT
): Promise<string[]> {
	try {
		await connection();

		// Valider et normaliser le parametre limit
		const safeLimit = Math.min(
			Math.max(Math.floor(Number(limit)) || DEFAULT_POPULARITY_LIMIT, 1),
			MAX_POPULARITY_LIMIT
		);

		const thirtyDaysAgo = new Date(Date.now() - POPULARITY_DAYS * 24 * 60 * 60 * 1000);

		// Requete SQL qui combine les ventes et les avis en un score de popularite
		// LEFT JOIN pour inclure les produits sans ventes mais avec des avis (et vice versa)
		// Timeout de 5s pour eviter les requetes bloquantes
		const results = await Promise.race([
			prisma.$queryRaw<PopularityAggregation[]>`
				WITH sales AS (
					SELECT
						oi."productId",
						COALESCE(SUM(oi.quantity), 0)::float AS "totalSales"
					FROM "OrderItem" oi
					INNER JOIN "Order" o ON oi."orderId" = o.id
					WHERE
						o."paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
						AND o."deletedAt" IS NULL
						AND o."paidAt" >= ${thirtyDaysAgo}
						AND oi."productId" IS NOT NULL
					GROUP BY oi."productId"
				),
				reviews AS (
					SELECT
						rs."productId",
						COALESCE(rs."averageRating"::float * rs."totalCount"::float, 0)::float AS "reviewScore"
					FROM "ProductReviewStats" rs
					WHERE rs."totalCount" > 0
				)
				SELECT
					p.id AS "productId",
					(
						COALESCE(s."totalSales", 0) * ${SALES_WEIGHT} +
						COALESCE(r."reviewScore", 0) * ${REVIEWS_WEIGHT}
					) AS "popularityScore"
				FROM "Product" p
				LEFT JOIN sales s ON p.id = s."productId"
				LEFT JOIN reviews r ON p.id = r."productId"
				WHERE
					p."deletedAt" IS NULL
					AND p.status = 'PUBLIC'
					AND (s."totalSales" > 0 OR r."reviewScore" > 0)
				ORDER BY "popularityScore" DESC
				LIMIT ${safeLimit}
			`,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Popularity query timeout")), QUERY_TIMEOUT_MS)
			),
		]);

		return results.map((r) => r.productId);
	} catch (error) {
		console.error("[popularity-query] Error fetching popular products:", error);
		// Retourne un tableau vide pour fallback sur le tri par defaut
		return [];
	}
}
