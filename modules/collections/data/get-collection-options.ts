import { prisma } from "@/shared/lib/prisma";
import { cacheCollections } from "../constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type CollectionOption = {
	id: string;
	name: string;
};

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
