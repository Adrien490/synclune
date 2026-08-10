import { logger } from "@/shared/lib/logger";
import { PublicationStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { cacheCollectionDetail } from "../utils/cache.utils";

import {
	GET_COLLECTION_SELECT,
	GET_COLLECTION_STOREFRONT_SELECT,
} from "../constants/collection.constants";
import { getCollectionSchema } from "../schemas/collection.schemas";
import type {
	GetCollectionParams,
	GetCollectionReturn,
	GetCollectionStorefrontReturn,
} from "../types/collection.types";

// Re-export pour compatibilité
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère une collection par son slug — variante ADMIN : tous statuts confondus.
 *
 * Gardée par `isAdmin()`, comme `getCollectionOptions` et `getCollectionCountsByStatus`
 * du même module. Sans cette garde, cette fonction et sa quasi-homonyme
 * `getStorefrontCollectionBySlug` (qui filtre `status: PUBLIC` dans son `where`) étaient
 * interchangeables à la lecture, alors qu'une seule des deux est sûre côté public.
 */
export async function getCollectionBySlug(
	params: Partial<GetCollectionParams>,
): Promise<GetCollectionReturn | null> {
	if (!(await isAdmin())) {
		return null;
	}

	const validation = getCollectionSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	return fetchCollection(validation.data);
}

/**
 * Récupère la collection depuis la DB avec cache
 * Utilise findUnique pour exploiter l'index unique sur slug
 */
async function fetchCollection(params: GetCollectionParams): Promise<GetCollectionReturn | null> {
	"use cache";
	cacheCollectionDetail(params.slug);

	try {
		const collection = await prisma.collection.findUnique({
			where: { slug: params.slug },
			select: GET_COLLECTION_SELECT,
		});

		return collection;
	} catch (err) {
		logger.error("Failed to fetch collection", err, { service: "fetchCollection" });
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
	params: Partial<GetCollectionParams>,
): Promise<GetCollectionStorefrontReturn | null> {
	const validation = getCollectionSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	return fetchStorefrontCollection(validation.data);
}

async function fetchStorefrontCollection(
	params: GetCollectionParams,
): Promise<GetCollectionStorefrontReturn | null> {
	"use cache";
	cacheCollectionDetail(params.slug);

	try {
		const collection = await prisma.collection.findUnique({
			where: { slug: params.slug, status: PublicationStatus.PUBLIC },
			select: GET_COLLECTION_STOREFRONT_SELECT,
		});

		return collection;
	} catch (err) {
		logger.error("Failed to fetch storefront collection", err, {
			service: "fetchStorefrontCollection",
		});
		return null;
	}
}
