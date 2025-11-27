import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type StockAlertItem = {
	skuId: string;
	sku: string;
	productTitle: string;
	inventory: number;
	alertType: "out_of_stock" | "low_stock";
};

export type GetStockAlertsReturn = {
	alerts: StockAlertItem[];
};

// Alias pour compatibilité avec les imports existants
export type GetDashboardStockAlertsReturn = GetStockAlertsReturn;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les 10 alertes stock
 * Ruptures (inventory = 0) + faible stock (inventory <= 5)
 */
export async function getStockAlerts(): Promise<GetStockAlertsReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return fetchDashboardStockAlerts();
}

/**
 * Récupère les 10 alertes stock depuis la DB avec cache
 */
export async function fetchDashboardStockAlerts(): Promise<GetStockAlertsReturn> {
	"use cache: remote";

	cacheDashboard();

	const LOW_STOCK_THRESHOLD = 5;

	const skus = await prisma.productSku.findMany({
		where: {
			isActive: true,
			inventory: {
				lte: LOW_STOCK_THRESHOLD,
			},
		},
		take: 10,
		orderBy: [{ inventory: "asc" }, { updatedAt: "desc" }],
		select: {
			id: true,
			sku: true,
			inventory: true,
			product: {
				select: {
					title: true,
				},
			},
		},
	});

	const alerts = skus.map((sku) => ({
		skuId: sku.id,
		sku: sku.sku,
		productTitle: sku.product.title,
		inventory: sku.inventory,
		alertType: (sku.inventory === 0 ? "out_of_stock" : "low_stock") as
			| "out_of_stock"
			| "low_stock",
	}));

	return { alerts };
}
