import { Prisma, ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

import {
	MAX_SEARCH_LENGTH,
	SPELL_SUGGESTION_TIMEOUT_MS,
} from "../constants/search.constants";
import { setStatementTimeout, setTrigramThreshold } from "../utils/trigram-helpers";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Minimum similarity threshold for suggesting a correction.
 * Lower = broader suggestions, higher = stricter suggestions.
 */
const SUGGESTION_MIN_SIMILARITY = 0.2;

/**
 * Minimum number of results before suggesting a correction.
 * If we have more results than this, no suggestion needed.
 */
export const SUGGESTION_THRESHOLD_RESULTS = 3;

// ============================================================================
// TYPES
// ============================================================================

type SpellSuggestion = {
	/** The suggested term */
	term: string;
	/** Similarity score (0-1) */
	similarity: number;
	/** Source of the suggestion */
	source: "product" | "collection" | "color" | "material";
};

type SuggestionOptions = {
	/** Product status to consider */
	status?: ProductStatus;
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Find a spell correction suggestion for a search term.
 *
 * Uses pg_trgm to find the most similar term among:
 * - Product titles
 * - Collection names
 * - Color names
 * - Material names
 *
 * Uses immutable_unaccent() for accent-insensitive matching.
 *
 * @param searchTerm - Original search term
 * @param options - Filter options
 * @returns Best suggestion or null if none found
 */
export async function getSpellSuggestion(
	searchTerm: string,
	options: SuggestionOptions = {}
): Promise<SpellSuggestion | null> {
	const { status } = options;
	const term = searchTerm.trim().toLowerCase();

	// Validations
	if (!term || term.length < 2) return null;
	if (term.length > MAX_SEARCH_LENGTH) return null;

	try {
		// Build status condition
		const statusCondition = status
			? Prisma.sql`AND p.status = ${status}::"ProductStatus"`
			: Prisma.empty;

		// Transaction with SET LOCAL to isolate the similarity threshold
		// and statement_timeout to cancel runaway queries server-side.
		// SET LOCAL scopes the change to the current transaction,
		// avoiding interference with other queries via connection pooling.
		const queryPromise = prisma.$transaction(async (tx) => {
			await setTrigramThreshold(tx, SUGGESTION_MIN_SIMILARITY);
			await setStatementTimeout(tx, SPELL_SUGGESTION_TIMEOUT_MS);

			// Unified search across all sources with UNION ALL.
			// Returns the most similar term with its source.
			return tx.$queryRaw<SpellSuggestion[]>`
				WITH suggestions AS (
					-- Product titles
					SELECT DISTINCT
						p.title as term,
						similarity(immutable_unaccent(LOWER(p.title)), immutable_unaccent(${term})) as similarity,
						'product'::text as source
					FROM "Product" p
					WHERE
						p."deletedAt" IS NULL
						${statusCondition}
						AND immutable_unaccent(LOWER(p.title)) % immutable_unaccent(${term})
						AND immutable_unaccent(LOWER(p.title)) != immutable_unaccent(${term})

					UNION ALL

					-- Collection names
					SELECT DISTINCT
						c.name as term,
						similarity(immutable_unaccent(LOWER(c.name)), immutable_unaccent(${term})) as similarity,
						'collection'::text as source
					FROM "Collection" c
					WHERE
						c.status = 'PUBLIC'
						AND immutable_unaccent(LOWER(c.name)) % immutable_unaccent(${term})
						AND immutable_unaccent(LOWER(c.name)) != immutable_unaccent(${term})

					UNION ALL

					-- Color names
					SELECT DISTINCT
						col.name as term,
						similarity(immutable_unaccent(LOWER(col.name)), immutable_unaccent(${term})) as similarity,
						'color'::text as source
					FROM "Color" col
					WHERE
						col."isActive" = true
						AND immutable_unaccent(LOWER(col.name)) % immutable_unaccent(${term})
						AND immutable_unaccent(LOWER(col.name)) != immutable_unaccent(${term})

					UNION ALL

					-- Material names
					SELECT DISTINCT
						m.name as term,
						similarity(immutable_unaccent(LOWER(m.name)), immutable_unaccent(${term})) as similarity,
						'material'::text as source
					FROM "Material" m
					WHERE
						m."isActive" = true
						AND immutable_unaccent(LOWER(m.name)) % immutable_unaccent(${term})
						AND immutable_unaccent(LOWER(m.name)) != immutable_unaccent(${term})
				)
				SELECT term, similarity, source
				FROM suggestions
				ORDER BY similarity DESC
				LIMIT 1
			`;
		});

		// Timeout to avoid long-running queries
		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error("Spell suggestion timeout")),
				SPELL_SUGGESTION_TIMEOUT_MS
			)
		);

		const results = await Promise.race([queryPromise, timeoutPromise]);

		if (results.length === 0) return null;

		const best = results[0];

		// Ensure suggestion is sufficiently different.
		// Avoid suggesting the same word with different casing.
		if (best.term.toLowerCase() === term) return null;

		return {
			term: best.term,
			similarity: Number(best.similarity),
			source: best.source as SpellSuggestion["source"],
		};
	} catch (error) {
		console.warn("[spellSuggestion] Failed:", error instanceof Error ? error.message : error);
		return null;
	}
}
