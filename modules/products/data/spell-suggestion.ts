import { Prisma, ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

import {
	MAX_SEARCH_LENGTH,
	SPELL_SUGGESTION_TIMEOUT_MS,
} from "../constants/search.constants";
import { setTrigramThreshold } from "../utils/trigram-helpers";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Seuil minimum de similarité pour proposer une suggestion
 * Plus bas = suggestions plus larges, plus haut = suggestions plus strictes
 */
const SUGGESTION_MIN_SIMILARITY = 0.2;

/**
 * Nombre minimum de résultats avant de proposer une suggestion
 * Si on a plus de ce nombre de résultats, pas besoin de suggérer
 */
export const SUGGESTION_THRESHOLD_RESULTS = 3;

// ============================================================================
// TYPES
// ============================================================================

type SpellSuggestion = {
	/** Le terme suggéré */
	term: string;
	/** Score de similarité (0-1) */
	similarity: number;
	/** Source de la suggestion */
	source: "product" | "collection" | "color" | "material";
};

type SuggestionOptions = {
	/** Statut des produits à considérer */
	status?: ProductStatus;
};

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Trouve une suggestion de correction orthographique pour un terme de recherche
 *
 * Utilise pg_trgm pour trouver le terme le plus similaire parmi:
 * - Titres de produits
 * - Noms de collections
 * - Noms de couleurs
 * - Noms de matériaux
 *
 * Uses immutable_unaccent() for accent-insensitive matching.
 *
 * @param searchTerm - Terme de recherche original
 * @param options - Options de filtrage
 * @returns La meilleure suggestion ou null si aucune trouvée
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
		// Construire la condition de statut
		const statusCondition = status
			? Prisma.sql`AND p.status = ${status}::"ProductStatus"`
			: Prisma.empty;

		// Transaction avec SET LOCAL pour isoler le seuil de similarité
		// SET LOCAL scope le changement à la transaction courante,
		// évitant d'affecter d'autres requêtes avec le connection pooling
		const queryPromise = prisma.$transaction(async (tx) => {
			await setTrigramThreshold(tx, SUGGESTION_MIN_SIMILARITY);

			// Recherche unifiée dans toutes les sources avec UNION ALL
			// Retourne le terme le plus similaire avec sa source
			return tx.$queryRaw<SpellSuggestion[]>`
				WITH suggestions AS (
					-- Titres de produits
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

					-- Noms de collections
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

					-- Noms de couleurs
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

					-- Noms de matériaux
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

		// Timeout pour éviter les requêtes longues
		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error("Spell suggestion timeout")),
				SPELL_SUGGESTION_TIMEOUT_MS
			)
		);

		const results = await Promise.race([queryPromise, timeoutPromise]);

		if (results.length === 0) return null;

		const best = results[0];

		// Vérifier que la suggestion est suffisamment différente mais pas trop
		// Éviter de suggérer le même mot avec une casse différente
		if (best.term.toLowerCase() === term) return null;

		return {
			term: best.term,
			similarity: Number(best.similarity),
			source: best.source as SpellSuggestion["source"],
		};
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("[spellSuggestion] Failed:", error instanceof Error ? error.message : error);
		}
		return null;
	}
}
