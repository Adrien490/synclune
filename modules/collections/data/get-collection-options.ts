import { logger } from "@/shared/lib/logger";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheCollections } from "../utils/cache.utils";
import type { CollectionOption } from "../types/collection.types";

/** Statuts de collection actifs (non archivées) */
const COLLECTION_ACTIVE_STATUSES = [CollectionStatus.DRAFT, CollectionStatus.PUBLIC] as const;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère toutes les collections actives (non archivées) pour les selects/filtres
 * Version simplifiée sans pagination
 *
 * Protection: Nécessite un compte ADMIN — `isAdmin()` re-vérifie le rôle en DB
 * (pas de confiance au rôle du cookie de session, stale ~5 min).
 */
export async function getCollectionOptions(): Promise<CollectionOption[]> {
	const admin = await isAdmin();
	if (!admin) return [];

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
	} catch (err) {
		logger.error("Failed to fetch collection options", err, { service: "fetchCollectionOptions" });
		return [];
	}
}
