import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type TopProductItem = {
	productId: string;
	productTitle: string;
	revenue: number;
	unitsSold: number;
};

export type GetTopProductsReturn = {
	products: TopProductItem[];
};

// Alias pour compatibilité avec les imports existants
export type GetDashboardTopProductsReturn = GetTopProductsReturn;

// Type interne pour la requête SQL raw
type TopProductRow = {
	productId: string;
	productTitle: string;
	revenue: bigint;
	unitsSold: bigint;
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer le top 5 des produits les plus vendus
 * Basé sur le CA total des 30 derniers jours
 */
export async function getTopProducts(): Promise<GetTopProductsReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return fetchDashboardTopProducts();
}

/**
 * Récupère le top 5 des produits les plus vendus depuis la DB avec cache
 * Utilise une requête SQL agrégée pour de meilleures performances
 */
export async function fetchDashboardTopProducts(): Promise<GetTopProductsReturn> {
	"use cache: remote";

	cacheDashboard();

	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Requête SQL agrégée - beaucoup plus performante que charger tous les items
	const rows = await prisma.$queryRaw<TopProductRow[]>`
		SELECT
			oi."productId" as "productId",
			oi."productTitle" as "productTitle",
			SUM(oi.price * oi.quantity) as revenue,
			SUM(oi.quantity) as "unitsSold"
		FROM "OrderItem" oi
		INNER JOIN "Order" o ON o.id = oi."orderId"
		WHERE
			o."createdAt" >= ${thirtyDaysAgo}
			AND o."paymentStatus" = 'PAID'
			AND o."deletedAt" IS NULL
			AND oi."productId" IS NOT NULL
		GROUP BY oi."productId", oi."productTitle"
		ORDER BY revenue DESC
		LIMIT 5
	`;

	// Convertir les bigint en number
	const products: TopProductItem[] = rows.map((row) => ({
		productId: row.productId,
		productTitle: row.productTitle,
		revenue: Number(row.revenue),
		unitsSold: Number(row.unitsSold),
	}));

	return { products };
}
