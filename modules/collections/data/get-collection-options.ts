import { logger } from "@/shared/lib/logger";
import { PublicationStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { COLLECTIONS_CACHE_TAGS } from "../constants/cache";
import type { CollectionOption } from "../types/collection.types";

/** Statuts de collection actifs (non archivées) */
const COLLECTION_ACTIVE_STATUSES = [PublicationStatus.DRAFT, PublicationStatus.PUBLIC] as const;

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

	// Repli HORS du scope de cache : à l'intérieur, une liste vide de panne était
	// mise en cache et le select « Collections » du formulaire produit apparaissait
	// vide, ce qui se lit comme « aucune collection n'existe ».
	try {
		return await fetchCollectionOptions();
	} catch (err) {
		logger.error("Failed to fetch collection options", err, { service: "getCollectionOptions" });
		return [];
	}
}

/**
 * Récupère les collections pour les selects depuis la DB avec cache.
 *
 * Profil `user` et non `reference` : c'est un picker ADMIN, qui liste les DRAFT.
 * Sous `reference` (7 j stale / 24 h revalidate) une collection tout juste créée
 * n'apparaissait pas dans le formulaire produit avant le lendemain — alors que
 * l'autre lecteur admin du module (`getCollectionCountsByStatus`) était déjà en
 * `user`. Les tags posés restent ceux de `cacheCollections`, donc une mutation de
 * collection continue de rafraîchir immédiatement.
 */
async function fetchCollectionOptions(): Promise<CollectionOption[]> {
	"use cache";
	cacheLife("user");
	cacheTag(COLLECTIONS_CACHE_TAGS.LIST);

	return prisma.collection.findMany({
		where: { status: { in: [...COLLECTION_ACTIVE_STATUSES] } },
		select: {
			id: true,
			name: true,
		},
		orderBy: { name: "asc" },
	});
}
