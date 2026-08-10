import { PublicationStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";
import type {
	GetCollectionCountsByStatusReturn,
	CollectionCountsByStatus,
} from "../types/collection-counts.types";

// Re-export pour compatibilité
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre de collections par statut
 * Optimisé avec une seule requête groupBy
 *
 * Protection: Nécessite un compte ADMIN (vérifié en DB via requireAdmin)
 */
export async function getCollectionCountsByStatus(): Promise<GetCollectionCountsByStatusReturn> {
	const admin = await requireAdmin();
	if ("error" in admin) {
		return {
			[PublicationStatus.PUBLIC]: 0,
			[PublicationStatus.DRAFT]: 0,
			[PublicationStatus.ARCHIVED]: 0,
		};
	}

	// Repli HORS du scope de cache : les compteurs à zéro d'une panne y étaient mis
	// en cache comme un résultat légitime, indiscernables d'une boutique sans
	// aucune collection.
	try {
		return await fetchCollectionCountsByStatus();
	} catch (error) {
		logger.error("Failed to fetch collection counts by status", error, {
			service: "getCollectionCountsByStatus",
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
async function fetchCollectionCountsByStatus(): Promise<CollectionCountsByStatus> {
	"use cache";
	cacheLife("user");
	cacheTag(COLLECTIONS_CACHE_TAGS.COUNTS);

	const counts = await prisma.collection.groupBy({
		by: ["status"],
		_count: {
			id: true,
		},
	});

	const result: CollectionCountsByStatus = {
		[PublicationStatus.PUBLIC]: 0,
		[PublicationStatus.DRAFT]: 0,
		[PublicationStatus.ARCHIVED]: 0,
	};

	counts.forEach((count) => {
		result[count.status as PublicationStatus] = count._count.id;
	});

	return result;
}
