import { z } from "zod";
import { searchAddressSchema } from "../schemas";

/**
 * Type représentant un résultat StreetAddress de l'API d'autocomplétion
 */
export type CompletionStreetAddress = {
	country: "StreetAddress";
	city: string;
	oldcity?: string;
	x: number; // longitude
	y: number; // latitude
	zipcode: string;
	street: string;
	metropole?: boolean;
	classification: number;
	kind: string;
	fulltext: string;
};

/**
 * Type représentant un résultat PositionOfInterest de l'API d'autocomplétion
 */
export type CompletionPositionOfInterest = {
	country: "PositionOfInterest";
	names: string[];
	zipcode?: string;
	zipcodes: string[];
	metropole?: boolean;
	city: string;
	street: string;
	poiType: string[];
	kind: string;
	fulltext: string;
	classification: number;
	x: number; // longitude
	y: number; // latitude
};

/**
 * Type union des résultats possibles
 */
export type CompletionResult =
	| CompletionStreetAddress
	| CompletionPositionOfInterest;

/**
 * Type représentant la réponse complète de l'API d'autocomplétion
 */
export type CompletionApiResponse = {
	status: "OK";
	results: CompletionResult[];
};

/**
 * Type des paramètres d'entrée pour la recherche d'adresse
 * Les champs avec .default() sont optionnels dans l'input
 */
export type SearchAddressParams = Omit<
	z.infer<typeof searchAddressSchema>,
	"type" | "maximumResponses"
> & {
	type?: string;
	maximumResponses?: number;
};

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
};
