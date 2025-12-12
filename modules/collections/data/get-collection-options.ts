import { prisma } from "@/shared/lib/prisma";
import { cacheCollections } from "../utils/cache.utils";
import type { CollectionOption } from "../types/collection.types";

export type { CollectionOption };

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
			where: { status: { in: ["DRAFT", "PUBLIC"] } },
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
