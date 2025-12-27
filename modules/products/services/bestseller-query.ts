import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { connection } from "next/server";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Periode de calcul des meilleures ventes en jours */
const BESTSELLERS_DAYS = 30;

/** Limite par defaut de bestsellers */
const DEFAULT_BESTSELLER_LIMIT = 200;

/** Limite maximale de bestsellers */
const MAX_BESTSELLER_LIMIT = 1000;

/** Timeout de la requete en millisecondes */
const QUERY_TIMEOUT_MS = 5000;

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
 * @param limit - Nombre max de produits (1-1000, defaut: 200)
 * @returns Liste d'IDs de produits tries par ventes, ou [] en cas d'erreur
 */
export async function getBestsellerIds(
	limit: number = DEFAULT_BESTSELLER_LIMIT
): Promise<string[]> {
	try {
		await connection();

		// Valider et normaliser le parametre limit
		const safeLimit = Math.min(
			Math.max(Math.floor(Number(limit)) || DEFAULT_BESTSELLER_LIMIT, 1),
			MAX_BESTSELLER_LIMIT
		);

		// Calcul UTC explicite pour éviter les incohérences timezone avec PostgreSQL
		const thirtyDaysAgo = new Date(Date.now() - BESTSELLERS_DAYS * 24 * 60 * 60 * 1000);

		// Requete avec timeout (5 secondes)
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
					AND o."paidAt" >= ${thirtyDaysAgo}
					AND oi."productId" IS NOT NULL
				GROUP BY oi."productId"
				ORDER BY "totalQuantity" DESC
				LIMIT ${safeLimit}
			`,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Bestseller query timeout")), QUERY_TIMEOUT_MS)
			),
		]);

		return results.map((r) => r.productId);
	} catch (error) {
		console.error("[bestseller-query] Error fetching bestseller products:", error);
		// Retourne un tableau vide pour fallback sur le tri par defaut
		return [];
	}
}
