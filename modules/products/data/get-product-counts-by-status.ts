import { PublicationStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

import type {
	GetProductCountsByStatusReturn,
	ProductCountsByStatus,
} from "../types/product-counts.types";

// Re-export pour compatibilité
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

	// Repli HORS du scope de cache : les compteurs à zéro d'une panne étaient mis en
	// cache comme un résultat légitime pour la fenêtre du profil `user`, et « 0
	// brouillon / 0 publié » est indiscernable d'un catalogue vide.
	try {
		return await fetchProductCountsByStatus();
	} catch (error) {
		logger.error("Failed to fetch product counts by status", error, {
			service: "getProductCountsByStatus",
		});
		return {
			[PublicationStatus.PUBLIC]: 0,
			[PublicationStatus.DRAFT]: 0,
			[PublicationStatus.ARCHIVED]: 0,
		};
	}
}

/**
 * Récupère les compteurs depuis la DB avec cache
 */
async function fetchProductCountsByStatus(): Promise<ProductCountsByStatus> {
	"use cache";
	cacheLife("user");
	cacheTag(PRODUCTS_CACHE_TAGS.COUNTS);

	const counts = await prisma.product.groupBy({
		by: ["status"],
		where: { ...notDeleted },
		_count: {
			id: true,
		},
	});

	const result: ProductCountsByStatus = {
		[PublicationStatus.PUBLIC]: 0,
		[PublicationStatus.DRAFT]: 0,
		[PublicationStatus.ARCHIVED]: 0,
	};

	counts.forEach((count) => {
		result[count.status as PublicationStatus] = count._count.id;
	});

	return result;
}
