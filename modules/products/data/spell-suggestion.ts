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

type BatchResult = {
	inputWord: string;
	position: number;
	matchWord: string | null;
	similarity: number | null;
	source: string | null;
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
 * Uses a single batched query with LATERAL JOIN to find the best correction
 * for all words at once (vocabulary CTE is scanned only once).
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

	// Separate eligible words (>= 2 chars) from short ones that are kept as-is
	const wordEntries = words.map((word, index) => ({
		word,
		index,
		eligible: word.length >= 2,
	}));
	const eligibleWords = wordEntries.filter((e) => e.eligible);

	// No words eligible for correction
	if (eligibleWords.length === 0) return null;

	try {
		const statusCondition = status
			? Prisma.sql`AND p.status = ${status}::"ProductStatus"`
			: Prisma.empty;

		// Build VALUES clause for all eligible words at once
		const valuesFragments = eligibleWords.map((e) =>
			Prisma.sql`(${e.word}, ${e.index})`
		);
		const valuesClause = Prisma.join(valuesFragments, ", ");

		// Transaction with SET LOCAL to isolate the similarity threshold
		// and statement_timeout to cancel runaway queries server-side.
		const queryPromise = prisma.$transaction(async (tx) => {
			await setTrigramThreshold(tx, SUGGESTION_MIN_SIMILARITY);
			await setStatementTimeout(tx, SPELL_SUGGESTION_TIMEOUT_MS);

			// Single batched query: vocabulary CTE built once, LATERAL JOIN
			// finds the best match for each input word in one pass.
			return tx.$queryRaw<BatchResult[]>`
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
				),
				input_words(word, position) AS (
					VALUES ${valuesClause}
				)
				SELECT
					iw.word as "inputWord",
					iw.position,
					best.word as "matchWord",
					best.similarity,
					best.source
				FROM input_words iw
				LEFT JOIN LATERAL (
					SELECT
						v.word,
						similarity(immutable_unaccent(v.word), immutable_unaccent(iw.word)) as similarity,
						v.source
					FROM vocabulary v
					WHERE length(v.word) >= 2
						AND immutable_unaccent(v.word) % immutable_unaccent(iw.word)
						AND immutable_unaccent(v.word) != immutable_unaccent(iw.word)
					ORDER BY similarity DESC
					LIMIT 1
				) best ON true
				ORDER BY iw.position
			`;
		});

		// Client-side timeout (complements server-side SET LOCAL statement_timeout)
		let timeoutId: ReturnType<typeof setTimeout>;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(
				() => reject(new Error("Spell suggestion timeout")),
				SPELL_SUGGESTION_TIMEOUT_MS
			);
		});

		const batchResults = await Promise.race([queryPromise, timeoutPromise]).finally(() => {
			clearTimeout(timeoutId);
		});

		// Merge batch results back with the full word list (including short words)
		const matchByIndex = new Map(
			batchResults.map((r) => [
				r.position,
				r.matchWord
					? { word: r.matchWord, similarity: Number(r.similarity), source: r.source! }
					: null,
			])
		);

		const corrections = wordEntries.map((entry) => ({
			original: entry.word,
			match: entry.eligible ? (matchByIndex.get(entry.index) ?? null) : null,
		}));

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
