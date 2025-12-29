import { z } from "zod";
import { RECENT_SEARCHES_MIN_LENGTH } from "../constants/recent-searches";

// ============================================================================
// RECENT SEARCHES SCHEMAS
// ============================================================================

/**
 * Schema pour ajouter une recherche recente
 */
export const addRecentSearchSchema = z.object({
	term: z
		.string()
		.trim()
		.toLowerCase()
		.min(RECENT_SEARCHES_MIN_LENGTH, "Terme de recherche trop court"),
});

export type AddRecentSearchInput = z.infer<typeof addRecentSearchSchema>;

/**
 * Schema pour supprimer une recherche recente
 */
export const removeRecentSearchSchema = z.object({
	term: z.string().trim().toLowerCase().min(1, "Terme manquant"),
});

export type RemoveRecentSearchInput = z.infer<typeof removeRecentSearchSchema>;
