import { prisma } from "@/shared/lib/prisma";

import { cacheCollectionDetail } from "../utils/cache.utils";

import { GET_COLLECTION_SELECT, GET_COLLECTION_STOREFRONT_SELECT } from "../constants/collection.constants";
import { getCollectionSchema } from "../schemas/collection.schemas";
import type {
	GetCollectionParams,
	GetCollectionReturn,
	GetCollectionStorefrontReturn,
} from "../types/collection.types";

// Re-export pour compatibilité
export type { GetCollectionParams, GetCollectionReturn, GetCollectionStorefrontReturn } from "../types/collection.types";

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

// ============================================================================
// STOREFRONT (lightweight)
// ============================================================================

/**
 * Récupère une collection avec un select léger pour le storefront
 * (metadata, OG image, structured data). Évite le over-fetching de
 * GET_COLLECTION_SELECT qui charge tous les SKUs et images.
 */
export async function getStorefrontCollectionBySlug(
	params: Partial<GetCollectionParams>
): Promise<GetCollectionStorefrontReturn | null> {
	const validation = getCollectionSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	return fetchStorefrontCollection(validation.data);
}

async function fetchStorefrontCollection(
	params: GetCollectionParams
): Promise<GetCollectionStorefrontReturn | null> {
	"use cache";
	cacheCollectionDetail(params.slug);

	try {
		const collection = await prisma.collection.findUnique({
			where: { slug: params.slug },
			select: GET_COLLECTION_STOREFRONT_SELECT,
		});

		return collection;
	} catch {
		return null;
	}
}
