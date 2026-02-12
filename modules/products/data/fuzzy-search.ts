import { Prisma, ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

import {
	FUZZY_MAX_RESULTS,
	FUZZY_SIMILARITY_THRESHOLD,
	FUZZY_TIMEOUT_MS,
	MAX_SEARCH_LENGTH,
	RELEVANCE_WEIGHTS,
} from "../constants/search.constants";
import { setTrigramThreshold } from "../utils/trigram-helpers";

// ============================================================================
// TYPES
// ============================================================================

type FuzzySearchOptions = {
	/** Seuil de similarité (défaut: FUZZY_SIMILARITY_THRESHOLD) */
	threshold?: number;
	/** Nombre max de résultats (défaut: FUZZY_MAX_RESULTS) */
	limit?: number;
	/** Filtrer par statut du produit */
	status?: ProductStatus;
};

type FuzzySearchResult = {
	productId: string;
	score: number;
};

type FuzzySearchReturn = {
	ids: string[];
	totalCount: number;
};

// ============================================================================
// FUZZY SEARCH SERVICE
// ============================================================================

/**
 * Recherche fuzzy sur title et description avec PostgreSQL pg_trgm
 * Retourne les IDs de produits triés par pertinence (score décroissant)
 *
 * Fonctionnement:
 * 1. Match exact (ILIKE) a priorité maximale
 * 2. Match fuzzy (similarity) utilisé sinon
 * 3. Les poids de pertinence favorisent: titre exact > titre fuzzy > desc exact > desc fuzzy
 *
 * @param searchTerm - Terme de recherche (min 3 caractères recommandé)
 * @param options - Options de recherche
 * @returns Liste d'IDs de produits triés par pertinence
 */
export async function fuzzySearchProductIds(
	searchTerm: string,
	options: FuzzySearchOptions = {}
): Promise<FuzzySearchReturn> {
	const {
		threshold = FUZZY_SIMILARITY_THRESHOLD,
		limit = FUZZY_MAX_RESULTS,
		status,
	} = options;

	const term = searchTerm.trim();
	if (!term) return { ids: [], totalCount: 0 };
	if (term.length > MAX_SEARCH_LENGTH) return { ids: [], totalCount: 0 };

	try {
		// Construire les paramètres de recherche
		const likeTerm = `%${term}%`;

		// Transaction avec SET LOCAL pour isoler le seuil de similarité
		// SET LOCAL scope le changement à la transaction courante,
		// évitant d'affecter d'autres requêtes avec le connection pooling
		const queryPromise = prisma.$transaction(async (tx) => {
			await setTrigramThreshold(tx, threshold);

			// CTE to compute total count before applying LIMIT
			type ResultWithCount = FuzzySearchResult & { totalCount: bigint };
			return tx.$queryRaw<ResultWithCount[]>`
				WITH matched AS (
					SELECT
						p.id as "productId",
						GREATEST(
							CASE WHEN p.title ILIKE ${likeTerm}
								THEN ${RELEVANCE_WEIGHTS.exactTitle}::float
								ELSE similarity(p.title, ${term}) * ${RELEVANCE_WEIGHTS.fuzzyTitle}::float
							END,
							CASE WHEN COALESCE(p.description, '') ILIKE ${likeTerm}
								THEN ${RELEVANCE_WEIGHTS.exactDescription}::float
								ELSE COALESCE(similarity(p.description, ${term}), 0) * ${RELEVANCE_WEIGHTS.fuzzyDescription}::float
							END
						) as score
					FROM "Product" p
					WHERE
						p."deletedAt" IS NULL
						${status ? Prisma.sql`AND p.status = ${status}::"ProductStatus"` : Prisma.empty}
						AND (
							p.title ILIKE ${likeTerm}
							OR COALESCE(p.description, '') ILIKE ${likeTerm}
							OR p.title % ${term}
							OR COALESCE(p.description, '') % ${term}
						)
				)
				SELECT "productId", score, (SELECT COUNT(*) FROM matched) as "totalCount"
				FROM matched
				ORDER BY score DESC
				LIMIT ${limit}
			`;
		});

		// Timeout pour éviter les requêtes longues
		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("Fuzzy search timeout")), FUZZY_TIMEOUT_MS)
		);

		const results = await Promise.race([queryPromise, timeoutPromise]);

		return {
			ids: results.map((r) => r.productId),
			totalCount: results.length > 0 ? Number(results[0].totalCount) : 0,
		};
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("[fuzzySearch] Failed:", error instanceof Error ? error.message : error);
		}
		return { ids: [], totalCount: 0 };
	}
}
