import { Prisma, ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

import {
	FUZZY_MAX_RESULTS,
	FUZZY_SIMILARITY_THRESHOLD,
	FUZZY_TIMEOUT_MS,
	RELEVANCE_WEIGHTS,
} from "../constants/search.constants";
import { splitSearchTerms } from "../utils/search-helpers";
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
// INTERNAL HELPERS
// ============================================================================

/**
 * Build a WHERE fragment for a single word.
 * The word must match title OR description (via ILIKE or trigram similarity),
 * with immutable_unaccent() applied for accent-insensitive matching.
 */
function buildWordWhereFragment(word: string): Prisma.Sql {
	const like = `%${word}%`;
	return Prisma.sql`(
		immutable_unaccent(p.title) ILIKE immutable_unaccent(${like})
		OR immutable_unaccent(COALESCE(p.description, '')) ILIKE immutable_unaccent(${like})
		OR immutable_unaccent(p.title) % immutable_unaccent(${word})
		OR immutable_unaccent(COALESCE(p.description, '')) % immutable_unaccent(${word})
	)`;
}

/**
 * Build a relevance score fragment for a single word.
 * Returns the best score between title and description matches.
 */
function buildWordScoreFragment(word: string): Prisma.Sql {
	const like = `%${word}%`;
	return Prisma.sql`GREATEST(
		CASE WHEN immutable_unaccent(p.title) ILIKE immutable_unaccent(${like})
			THEN ${RELEVANCE_WEIGHTS.exactTitle}::float
			ELSE similarity(immutable_unaccent(p.title), immutable_unaccent(${word})) * ${RELEVANCE_WEIGHTS.fuzzyTitle}::float
		END,
		CASE WHEN immutable_unaccent(COALESCE(p.description, '')) ILIKE immutable_unaccent(${like})
			THEN ${RELEVANCE_WEIGHTS.exactDescription}::float
			ELSE COALESCE(similarity(immutable_unaccent(p.description), immutable_unaccent(${word})), 0) * ${RELEVANCE_WEIGHTS.fuzzyDescription}::float
		END
	)`;
}

// ============================================================================
// FUZZY SEARCH SERVICE
// ============================================================================

/**
 * Recherche fuzzy sur title et description avec PostgreSQL pg_trgm
 * Retourne les IDs de produits triés par pertinence (score décroissant)
 *
 * Fonctionnement:
 * 1. Le terme est splitté en mots individuels (AND logic)
 * 2. Match exact (ILIKE) a priorité maximale
 * 3. Match fuzzy (similarity) utilisé sinon
 * 4. immutable_unaccent() pour ignorer les accents
 * 5. Les poids de pertinence favorisent: titre exact > titre fuzzy > desc exact > desc fuzzy
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

	const words = splitSearchTerms(searchTerm);
	if (words.length === 0) return { ids: [], totalCount: 0 };

	try {
		// Build per-word WHERE fragments (AND: every word must match)
		const whereFragments = words.map(buildWordWhereFragment);
		const whereClause = Prisma.join(whereFragments, " AND ");

		// Build per-word SCORE fragments (sum of per-word best scores)
		const scoreFragments = words.map(buildWordScoreFragment);
		const scoreExpr =
			scoreFragments.length === 1
				? scoreFragments[0]
				: Prisma.sql`(${Prisma.join(scoreFragments, " + ")})`;

		// Transaction with SET LOCAL to isolate the similarity threshold
		const queryPromise = prisma.$transaction(async (tx) => {
			await setTrigramThreshold(tx, threshold);

			type ResultWithCount = FuzzySearchResult & { totalCount: bigint };
			return tx.$queryRaw<ResultWithCount[]>`
				WITH matched AS (
					SELECT
						p.id as "productId",
						${scoreExpr} as score
					FROM "Product" p
					WHERE
						p."deletedAt" IS NULL
						${status ? Prisma.sql`AND p.status = ${status}::"ProductStatus"` : Prisma.empty}
						AND ${whereClause}
				)
				SELECT "productId", score, (SELECT COUNT(*) FROM matched) as "totalCount"
				FROM matched
				ORDER BY score DESC
				LIMIT ${limit}
			`;
		});

		// Timeout to avoid long-running queries
		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("Fuzzy search timeout")), FUZZY_TIMEOUT_MS)
		);

		const results = await Promise.race([queryPromise, timeoutPromise]);

		return {
			ids: results.map((r) => r.productId),
			totalCount: results.length > 0 ? Number(results[0].totalCount) : 0,
		};
	} catch (error) {
		console.warn("[fuzzySearch] Failed:", error instanceof Error ? error.message : error);
		return { ids: [], totalCount: 0 };
	}
}
