import { Prisma } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { cacheLife, cacheTag } from "next/cache";

import { logger } from "@/shared/lib/logger";
import { isPgTrgmAvailable } from "@/shared/lib/pg-trgm-availability";
import { prisma } from "@/shared/lib/prisma";

import { PRODUCTS_CACHE_TAGS } from "../constants/cache";
import {
	FUZZY_MAX_RESULTS,
	FUZZY_SIMILARITY_THRESHOLD,
	FUZZY_TIMEOUT_MS,
	RELEVANCE_WEIGHTS,
} from "../constants/search.constants";
import { SEARCH_SYNONYMS } from "../constants/search-synonyms";
import { escapeLikePattern, sanitizeForLog, splitSearchTerms } from "../utils/search-helpers";
import { setStatementTimeout, setTrigramThreshold } from "../utils/trigram-helpers";

// ============================================================================
// TYPES
// ============================================================================

type FuzzySearchOptions = {
	/** Similarity threshold (default: FUZZY_SIMILARITY_THRESHOLD) */
	threshold?: number;
	/** Max results (default: FUZZY_MAX_RESULTS) */
	limit?: number;
	/** Ne retourner que les produits actifs (storefront). */
	activeOnly?: boolean;
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
 *
 * Uses % (similarity) for title and <% (word_similarity) for description.
 * word_similarity checks if any substring of the long text is similar to the
 * search term, which is much more effective for long description text.
 */
function buildWordWhereFragment(word: string): Prisma.Sql {
	const like = `%${escapeLikePattern(word)}%`;
	return Prisma.sql`(
		immutable_unaccent(p.name) ILIKE immutable_unaccent(${like})
		OR immutable_unaccent(COALESCE(p.description, '')) ILIKE immutable_unaccent(${like})
		OR immutable_unaccent(p.name) % immutable_unaccent(${word})
		OR immutable_unaccent(${word}) <% immutable_unaccent(COALESCE(p.description, ''))
	)`;
}

/**
 * Build a WHERE fragment for a word and its synonyms (OR between variants).
 * Each variant is checked via ILIKE + trigram similarity.
 */
function buildWordGroupWhereFragment(word: string): Prisma.Sql {
	const synonyms = SEARCH_SYNONYMS.get(word.toLowerCase());
	if (!synonyms || synonyms.length === 0) {
		return buildWordWhereFragment(word);
	}

	const variants = [word, ...synonyms];
	const fragments = variants.map(buildWordWhereFragment);
	return Prisma.sql`(${Prisma.join(fragments, " OR ")})`;
}

/**
 * Build a relevance score fragment for a single word.
 * Returns the best score between title and description matches.
 *
 * Uses similarity() for title (good for short text vs short query)
 * and word_similarity() for description (compares query against best
 * matching substring of the long text, much more effective).
 */
function buildWordScoreFragment(word: string): Prisma.Sql {
	const like = `%${escapeLikePattern(word)}%`;
	return Prisma.sql`GREATEST(
		CASE WHEN immutable_unaccent(p.name) ILIKE immutable_unaccent(${like})
			THEN ${RELEVANCE_WEIGHTS.exactTitle}::float
			ELSE similarity(immutable_unaccent(p.name), immutable_unaccent(${word})) * ${RELEVANCE_WEIGHTS.fuzzyTitle}::float
		END,
		CASE WHEN immutable_unaccent(COALESCE(p.description, '')) ILIKE immutable_unaccent(${like})
			THEN ${RELEVANCE_WEIGHTS.exactDescription}::float
			ELSE COALESCE(word_similarity(immutable_unaccent(${word}), immutable_unaccent(COALESCE(p.description, ''))), 0) * ${RELEVANCE_WEIGHTS.fuzzyDescription}::float
		END
	)`;
}

/**
 * Build a relevance score fragment for a word and its synonyms.
 * Returns the best score across all variants.
 */
function buildWordGroupScoreFragment(word: string): Prisma.Sql {
	const synonyms = SEARCH_SYNONYMS.get(word.toLowerCase());
	if (!synonyms || synonyms.length === 0) {
		return buildWordScoreFragment(word);
	}

	const variants = [word, ...synonyms];
	const fragments = variants.map(buildWordScoreFragment);
	return Prisma.sql`GREATEST(${Prisma.join(fragments, ", ")})`;
}

// ============================================================================
// FUZZY SEARCH SERVICE
// ============================================================================

/**
 * Fuzzy search on title and description using PostgreSQL pg_trgm.
 * Returns product IDs sorted by relevance (descending score).
 *
 * How it works:
 * 1. Search term is split into individual words (AND logic)
 * 2. Exact match (ILIKE) gets maximum priority
 * 3. Fuzzy match (similarity) used otherwise
 * 4. immutable_unaccent() for accent-insensitive matching
 * 5. Relevance weights favor: exact title > fuzzy title > exact desc > fuzzy desc
 *
 * @param searchTerm - Search term (min 3 characters recommended)
 * @param options - Search options
 * @returns Product IDs sorted by relevance
 */
export async function fuzzySearchProductIds(
	searchTerm: string,
	options: FuzzySearchOptions = {},
): Promise<FuzzySearchReturn> {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	const { threshold = FUZZY_SIMILARITY_THRESHOLD, limit = FUZZY_MAX_RESULTS, activeOnly } = options;

	const words = splitSearchTerms(searchTerm);
	if (words.length === 0) return { ids: [], totalCount: 0 };

	if (!(await isPgTrgmAvailable())) {
		return fuzzySearchProductIdsIlikeFallback(words, activeOnly, limit);
	}

	const startTime = performance.now();

	return Sentry.startSpan(
		{ name: "fuzzy-search.products", op: "db.query" },
		async (span): Promise<FuzzySearchReturn> => {
			span.setAttribute("search.word_count", words.length);
			span.setAttribute("search.has_status_filter", Boolean(activeOnly));

			try {
				// Build per-word WHERE fragments (AND: every word must match)
				// Each word is expanded with synonyms (OR between variants)
				const whereFragments = words.map(buildWordGroupWhereFragment);
				const whereClause = Prisma.join(whereFragments, " AND ");

				// Build per-word SCORE fragments (sum of per-word best scores)
				const scoreFragments = words.map(buildWordGroupScoreFragment);
				const scoreExpr =
					scoreFragments.length === 1
						? scoreFragments[0]
						: Prisma.sql`(${Prisma.join(scoreFragments, " + ")})`;

				// Transaction with SET LOCAL to isolate the similarity threshold
				// and statement_timeout to cancel runaway queries server-side
				const queryPromise = prisma.$transaction(async (tx) => {
					await setTrigramThreshold(tx, threshold);
					await setStatementTimeout(tx, FUZZY_TIMEOUT_MS);

					type ResultWithCount = FuzzySearchResult & { totalCount: bigint };
					return tx.$queryRaw<ResultWithCount[]>`
						WITH matched AS (
							SELECT
								p.id as "productId",
								${scoreExpr} as score
							FROM "Product" p
							WHERE
								TRUE
								${activeOnly ? Prisma.sql`AND p.active = true` : Prisma.empty}
								AND ${whereClause}
						)
						SELECT "productId", score, COUNT(*) OVER() as "totalCount"
						FROM matched
						ORDER BY score DESC
						LIMIT ${limit}
					`;
				});

				// Client-side timeout (complements server-side SET LOCAL statement_timeout)
				let timeoutId: ReturnType<typeof setTimeout>;
				const timeoutPromise = new Promise<never>((_, reject) => {
					timeoutId = setTimeout(() => reject(new Error("Fuzzy search timeout")), FUZZY_TIMEOUT_MS);
				});

				const results = await Promise.race([queryPromise, timeoutPromise]).finally(() => {
					clearTimeout(timeoutId);
				});
				const durationMs = Math.round(performance.now() - startTime);
				const totalCount = results.length > 0 ? Number(results[0]!.totalCount) : 0;

				span.setAttribute("search.result_count", totalCount);
				span.setAttribute("search.duration_ms", durationMs);

				if (durationMs > 500) {
					logger.warn(
						`Slow fuzzy search | term="${sanitizeForLog(searchTerm)}" | results=${totalCount} | duration=${durationMs}ms`,
						{ service: "fuzzySearchProductIds" },
					);
				}

				return {
					ids: results.map((r) => r.productId),
					totalCount,
				};
			} catch (error) {
				const durationMs = Math.round(performance.now() - startTime);
				logger.error(
					`Fuzzy search error | term="${sanitizeForLog(searchTerm)}" | duration=${durationMs}ms`,
					error,
					{ service: "fuzzySearchProductIds", durationMs },
				);
				// ⚠️ RETHROW, pas de retour vide : cette fonction s'exécute dans un
				// scope `"use cache"` — retourner `{ids: []}` mettait un ZÉRO-RÉSULTAT
				// de panne en cache pour ce terme (profil `catalog`, jusqu'à 15 min).
				// Une erreur jetée, elle, n'est jamais mise en cache. Les appelants
				// dégradent hors cache : `buildSearchConditions` → recherche exacte
				// complète, `quickSearchProducts` → `{kind:"error"}` non caché.
				// Audit recherche 2026-08-01, P1-3.
				throw error;
			}
		},
	);
}

/**
 * Degraded fallback used when pg_trgm is not installed.
 * AND across words, ILIKE on title and description, no relevance scoring,
 * no synonyms, no accent folding (immutable_unaccent depends on the unaccent
 * extension which often ships alongside pg_trgm in our migrations).
 */
async function fuzzySearchProductIdsIlikeFallback(
	words: string[],
	activeOnly: boolean | undefined,
	limit: number,
): Promise<FuzzySearchReturn> {
	const startTime = performance.now();

	try {
		const whereFragments = words.map((word) => {
			const like = `%${escapeLikePattern(word)}%`;
			return Prisma.sql`(
				LOWER(p.name) LIKE LOWER(${like})
				OR LOWER(COALESCE(p.description, '')) LIKE LOWER(${like})
			)`;
		});
		const whereClause = Prisma.join(whereFragments, " AND ");

		type FallbackRow = { productId: string; totalCount: bigint };
		const results = await prisma.$queryRaw<FallbackRow[]>`
			WITH matched AS (
				SELECT p.id as "productId"
				FROM "Product" p
				WHERE
					TRUE
					${activeOnly ? Prisma.sql`AND p.active = true` : Prisma.empty}
					AND ${whereClause}
			)
			SELECT "productId", COUNT(*) OVER() as "totalCount"
			FROM matched
			LIMIT ${limit}
		`;

		const durationMs = Math.round(performance.now() - startTime);
		const totalCount = results.length > 0 ? Number(results[0]!.totalCount) : 0;

		if (durationMs > 500) {
			logger.warn(`Slow fuzzy fallback | results=${totalCount} | duration=${durationMs}ms`, {
				service: "fuzzySearchProductIds.fallback",
			});
		}

		return {
			ids: results.map((r) => r.productId),
			totalCount,
		};
	} catch (error) {
		const durationMs = Math.round(performance.now() - startTime);
		logger.error(`Fuzzy fallback error | duration=${durationMs}ms`, error, {
			service: "fuzzySearchProductIds.fallback",
			durationMs,
		});
		// Rethrow : même règle que le chemin pg_trgm ci-dessus (scope "use cache").
		throw error;
	}
}
