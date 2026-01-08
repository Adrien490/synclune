import { CollectionStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheCollections } from "../utils/cache.utils";
import type { CollectionOption } from "../types/collection.types";

export type { CollectionOption };

/** Statuts de collection actifs (non archivées) */
const COLLECTION_ACTIVE_STATUSES = [CollectionStatus.DRAFT, CollectionStatus.PUBLIC] as const;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère toutes les collections actives (non archivées) pour les selects/filtres
 * Version simplifiée sans pagination
 */
export async function getCollectionOptions(): Promise<CollectionOption[]> {
	return fetchCollectionOptions();
}

/**
 * Récupère les collections pour les selects depuis la DB avec cache
 */
async function fetchCollectionOptions(): Promise<CollectionOption[]> {
	"use cache";
	cacheCollections();

	try {
		const collections = await prisma.collection.findMany({
			where: { status: { in: [...COLLECTION_ACTIVE_STATUSES] } },
			select: {
				id: true,
				name: true,
			},
			orderBy: { name: "asc" },
		});

		return collections;
	} catch {
		return [];
	}
}
