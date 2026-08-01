import { cacheLife, cacheTag } from "next/cache";

import { CollectionStatus } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";
import { buildCollectionFilterConditions } from "../services/collection-query-builder";

/**
 * Compte les collections publiques ayant au moins un produit PUBLIC —
 * miroir exact du filtre de CollectionsSection (home). Utilisé par les
 * stats atelier. Where construit via le query builder SSOT du module.
 */
export async function getPublicCollectionCount(): Promise<number> {
	// Repli HORS du scope de cache : à l'intérieur, un `0` de panne était mis en
	// cache comme un résultat légitime (cf. `get-public-product-count.ts`).
	try {
		return await fetchPublicCollectionCount();
	} catch (error) {
		logger.error("Failed to count public collections", error, {
			service: "getPublicCollectionCount",
		});
		return 0;
	}
}

async function fetchPublicCollectionCount(): Promise<number> {
	"use cache";

	cacheLife("catalog");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	return prisma.collection.count({
		where: buildCollectionFilterConditions({
			hasProducts: true,
			status: CollectionStatus.PUBLIC,
		}),
	});
}
