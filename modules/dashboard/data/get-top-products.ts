import { isAdmin } from "@/modules/auth/utils/guards";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

import {
	aggregateTopProducts,
	type TopProductStats,
} from "../services/aggregate-top-products";

// ============================================================================
// TYPES
// ============================================================================

export type TopProductItem = TopProductStats;

export type GetTopProductsReturn = {
	products: TopProductItem[];
};

// Alias pour compatibilité avec les imports existants
export type GetDashboardTopProductsReturn = GetTopProductsReturn;

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
 */
export async function fetchDashboardTopProducts(): Promise<GetTopProductsReturn> {
	"use cache: remote";

	cacheDashboard();

	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const orderItems = await prisma.orderItem.findMany({
		where: {
			order: {
				createdAt: { gte: thirtyDaysAgo },
				paymentStatus: PaymentStatus.PAID,
			},
			productId: { not: null },
		},
		select: {
			quantity: true,
			price: true,
			productId: true,
			productTitle: true,
		},
	});

	// Délégation de l'agrégation au service
	const products = aggregateTopProducts(orderItems, 5);

	return { products };
}
