import { prisma } from "@/shared/lib/prisma";

import { cacheCollectionDetail } from "../utils/cache.utils";

import { GET_COLLECTION_SELECT } from "../constants/collection.constants";
import { getCollectionSchema } from "../schemas/collection.schemas";
import type {
	GetCollectionParams,
	GetCollectionReturn,
} from "../types/collection.types";

// Re-export pour compatibilité
export type { GetCollectionParams, GetCollectionReturn } from "../types/collection.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère une collection par son slug
 */
export async function getCollectionBySlug(
	params: Partial<GetCollectionParams>
): Promise<GetCollectionReturn | null> {
	const validation = getCollectionSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	return fetchCollection(validation.data);
}

/**
 * Récupère la collection depuis la DB avec cache
 * Utilise findUnique pour exploiter l'index unique sur slug
 */
async function fetchCollection(
	params: GetCollectionParams
): Promise<GetCollectionReturn | null> {
	"use cache";
	cacheCollectionDetail(params.slug);

	try {
		const collection = await prisma.collection.findUnique({
			where: { slug: params.slug },
			select: GET_COLLECTION_SELECT,
		});

		return collection;
	} catch {
		return null;
	}
}
