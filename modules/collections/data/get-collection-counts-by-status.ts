import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";
import type {
	GetCollectionCountsByStatusReturn,
	CollectionCountsByStatus,
} from "../types/collection-counts.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre de collections par statut (publiées / brouillons) —
 * schéma lean : le statut est le booléen `active`.
 *
 * Protection: Nécessite un compte ADMIN.
 */
export async function getCollectionCountsByStatus(): Promise<GetCollectionCountsByStatusReturn> {
	const admin = await requireAdmin();
	if ("error" in admin) {
		return { published: 0, draft: 0 };
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
		return { published: 0, draft: 0 };
	}
}

/**
 * Récupère les compteurs depuis la DB avec cache
 */
async function fetchCollectionCountsByStatus(): Promise<CollectionCountsByStatus> {
	"use cache";
	cacheLife("user");
	cacheTag(COLLECTIONS_CACHE_TAGS.COUNTS);

	const [published, draft] = await Promise.all([
		prisma.collection.count({ where: { active: true } }),
		prisma.collection.count({ where: { active: false } }),
	]);

	return { published, draft };
}
