import { CollectionStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";
import type {
	GetCollectionCountsByStatusReturn,
	CollectionCountsByStatus,
} from "../types/collection-counts.types";

// Re-export pour compatibilité
export type {
	GetCollectionCountsByStatusReturn,
	CollectionCountsByStatus,
} from "../types/collection-counts.types";

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
			[CollectionStatus.PUBLIC]: 0,
			[CollectionStatus.DRAFT]: 0,
			[CollectionStatus.ARCHIVED]: 0,
		};
	}

	return fetchCollectionCountsByStatus();
}

/**
 * Récupère les compteurs depuis la DB avec cache
 */
async function fetchCollectionCountsByStatus(): Promise<CollectionCountsByStatus> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(COLLECTIONS_CACHE_TAGS.COUNTS);

	try {
		const counts = await prisma.collection.groupBy({
			by: ["status"],
			_count: {
				id: true,
			},
		});

		const result: CollectionCountsByStatus = {
			[CollectionStatus.PUBLIC]: 0,
			[CollectionStatus.DRAFT]: 0,
			[CollectionStatus.ARCHIVED]: 0,
		};

		counts.forEach((count) => {
			result[count.status as CollectionStatus] = count._count.id;
		});

		return result;
	} catch {
		return {
			[CollectionStatus.PUBLIC]: 0,
			[CollectionStatus.DRAFT]: 0,
			[CollectionStatus.ARCHIVED]: 0,
		};
	}
}
