import { ProductStatus } from "@/app/generated/prisma";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

import type {
	GetProductCountsByStatusReturn,
	ProductCountsByStatus,
} from "../types/product-counts.types";

// Re-export pour compatibilité
export type {
	GetProductCountsByStatusReturn,
	ProductCountsByStatus,
} from "../types/product-counts.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre de produits par statut
 * Optimisé avec une seule requête groupBy
 *
 * Protection: Nécessite un compte ADMIN
 */
export async function getProductCountsByStatus(): Promise<GetProductCountsByStatusReturn> {
	const admin = await isAdmin();
	if (!admin) {
		throw new Error("Accès non autorisé. Droits administrateur requis.");
	}

	return fetchProductCountsByStatus();
}

/**
 * Récupère les compteurs depuis la DB avec cache
 */
async function fetchProductCountsByStatus(): Promise<ProductCountsByStatus> {
	"use cache: remote";
	cacheLife("dashboard");
	cacheTag("product-counts");

	try {
		const counts = await prisma.product.groupBy({
			by: ["status"],
			_count: {
				id: true,
			},
		});

		const result: ProductCountsByStatus = {
			[ProductStatus.PUBLIC]: 0,
			[ProductStatus.DRAFT]: 0,
			[ProductStatus.ARCHIVED]: 0,
		};

		counts.forEach((count) => {
			result[count.status as ProductStatus] = count._count.id;
		});

		return result;
	} catch {
		return {
			[ProductStatus.PUBLIC]: 0,
			[ProductStatus.DRAFT]: 0,
			[ProductStatus.ARCHIVED]: 0,
		};
	}
}
