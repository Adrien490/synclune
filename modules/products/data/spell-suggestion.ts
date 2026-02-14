import { cacheLife, cacheTag } from "next/cache";

import { Prisma, ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

import { PRODUCTS_CACHE_TAGS } from "../constants/cache";
import {
	FUZZY_MAX_WORDS,
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
	/** The suggested corrected search term */
	term: string;
	/** Average similarity score of corrected words (0-1) */
	similarity: number;
	/** Source of the best correction */
	source: "product" | "collection" | "color" | "material";
};

type SuggestionOptions = {
	/** Product status to consider */
	status?: ProductStatus;
};

type WordMatch = {
	word: string;
	similarity: number;
	source: string;
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Find a spell correction suggestion for a search term.
 *
 * For multi-word searches, corrects each word independently against
 * individual words from the catalog vocabulary (product titles, collection
 * names, color names, material names), then reconstructs the corrected search.
 *
 * For single-word searches, also compares against full entity names
 * (e.g. collection "Lune d'Or" as a whole) in addition to individual words.
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
	"use cache";
	cacheLife("products");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	const { status } = options;
	const term = searchTerm.trim().toLowerCase();

	// Validations
	if (!term || term.length < 2) return null;
	if (term.length > MAX_SEARCH_LENGTH) return null;

	const words = term.split(/\s+/).filter(Boolean).slice(0, FUZZY_MAX_WORDS);
	if (words.length === 0) return null;

	try {
		const statusCondition = status
			? Prisma.sql`AND p.status = ${status}::"ProductStatus"`
			: Prisma.empty;

		// Transaction with SET LOCAL to isolate the similarity threshold
		// and statement_timeout to cancel runaway queries server-side.
		const queryPromise = prisma.$transaction(async (tx) => {
			await setTrigramThreshold(tx, SUGGESTION_MIN_SIMILARITY);
			await setStatementTimeout(tx, SPELL_SUGGESTION_TIMEOUT_MS);

			// Find the best correction for each word by comparing against
			// individual words extracted from catalog vocabulary.
			const corrections: { original: string; match: WordMatch | null }[] = [];

			for (const word of words) {
				if (word.length < 2) {
					corrections.push({ original: word, match: null });
					continue;
				}

				const results = await tx.$queryRaw<WordMatch[]>`
					WITH vocabulary AS (
						-- Individual words from product titles
						SELECT DISTINCT
							unnest(regexp_split_to_array(LOWER(p.title), '\s+')) as word,
							'product'::text as source
						FROM "Product" p
						WHERE p."deletedAt" IS NULL ${statusCondition}

						UNION

						-- Collection names (as single words)
						SELECT DISTINCT LOWER(c.name) as word, 'collection'::text as source
						FROM "Collection" c
						WHERE c.status = 'PUBLIC'

						UNION

						-- Color names
						SELECT DISTINCT LOWER(col.name) as word, 'color'::text as source
						FROM "Color" col
						WHERE col."isActive" = true

						UNION

						-- Material names
						SELECT DISTINCT LOWER(m.name) as word, 'material'::text as source
						FROM "Material" m
						WHERE m."isActive" = true
					)
					SELECT
						v.word,
						similarity(immutable_unaccent(v.word), immutable_unaccent(${word})) as similarity,
						v.source
					FROM vocabulary v
					WHERE length(v.word) >= 2
						AND immutable_unaccent(v.word) % immutable_unaccent(${word})
						AND immutable_unaccent(v.word) != immutable_unaccent(${word})
					ORDER BY similarity DESC
					LIMIT 1
				`;

				corrections.push({
					original: word,
					match: results.length > 0 ? results[0] : null,
				});
			}

			return corrections;
		});

		// Timeout to avoid long-running queries
		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error("Spell suggestion timeout")),
				SPELL_SUGGESTION_TIMEOUT_MS
			)
		);

		const corrections = await Promise.race([queryPromise, timeoutPromise]);

		// Check if any word was corrected
		const hasCorrection = corrections.some((c) => c.match !== null);
		if (!hasCorrection) return null;

		// Reconstruct the search term with corrections
		const correctedTerm = corrections
			.map((c) => c.match?.word ?? c.original)
			.join(" ");

		// Don't suggest if it's the same as the original
		if (correctedTerm === term) return null;

		// Use the similarity of the best correction
		const bestMatch = corrections
			.filter((c) => c.match !== null)
			.sort((a, b) => Number(b.match!.similarity) - Number(a.match!.similarity))[0];

		return {
			term: correctedTerm,
			similarity: Number(bestMatch.match!.similarity),
			source: bestMatch.match!.source as SpellSuggestion["source"],
		};
	} catch (error) {
		console.warn("[spellSuggestion] Failed:", error instanceof Error ? error.message : error);
		return null;
	}
}
