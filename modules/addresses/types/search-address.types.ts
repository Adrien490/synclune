import { type z } from "zod";
import { type banResultSchema } from "../schemas/geo-response.schema";
import { type searchAddressSchema } from "../schemas/search-address.schema";

// ============================================================================
// TYPES - BAN API (Base Adresse Nationale)
// ============================================================================

/**
 * Résultat de l'API d'autocomplétion (StreetAddress | PositionOfInterest),
 * validé au runtime par geo-response.schema
 */
export type CompletionResult = z.infer<typeof banResultSchema>;

/*
 * ⚠️ `SearchAddressParams` a été retiré le 2026-08-07 : plus aucun appelant.
 * `search-address.ts` déclare volontairement `params: unknown` et parse en tête
 * — `"use server"` publie un endpoint RPC, le type d'un paramètre est effacé à
 * l'exécution. Le type décrivait donc une garantie que rien ne rendait.
 */

/**
 * Type des paramètres validés avec les valeurs par défaut appliquées
 * Utilisé en interne après validation Zod
 */
export type ValidatedSearchAddressParams = z.infer<typeof searchAddressSchema>;

/**
 * Type de retour simplifié pour l'application
 */
export type SearchAddressResult = {
	fulltext: string; // Texte complet formaté
	street: string; // Rue ou nom du POI
	zipcode: string; // Code postal
	city: string; // Ville
	coordinates: {
		longitude: number;
		latitude: number;
	};
	classification: number; // Score de pertinence
	kind: string; // Type spécifique (ex: "lieu-dit habité")
	type: "StreetAddress" | "PositionOfInterest"; // Type général
	// Propriétés compatibles avec l'Autocomplete component
	label: string; // Alias pour fulltext
	postcode: string; // Alias pour zipcode
	housenumber?: string; // Numéro de rue (non fourni par l'API Completion)
};

/**
 * Type de retour de la fonction searchAddress
 */
export type SearchAddressReturn = {
	addresses: SearchAddressResult[];
	query: string;
	limit: number;
	error?: boolean;
};
