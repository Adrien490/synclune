import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { connection } from "next/server";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Periode de calcul des meilleures ventes en jours */
const BESTSELLERS_DAYS = 30;

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
 * @param limit - Nombre max de produits (defaut: 200)
 * @returns Liste d'IDs de produits tries par ventes, vide si aucune vente
 */
export async function getBestsellerIds(limit: number = 200): Promise<string[]> {
	await connection();
	// Calcul UTC explicite pour éviter les incohérences timezone avec PostgreSQL
	const thirtyDaysAgo = new Date(Date.now() - BESTSELLERS_DAYS * 24 * 60 * 60 * 1000);

	const results = await prisma.$queryRaw<BestsellerAggregation[]>`
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
		LIMIT ${limit}
	`;

	return results.map((r) => r.productId);
}
