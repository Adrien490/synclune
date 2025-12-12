import { z } from "zod";
import {
	SEARCH_ADDRESS_DEFAULT_LIMIT,
	SEARCH_ADDRESS_DEFAULT_TYPE,
	SEARCH_ADDRESS_MAX_LIMIT,
} from "../constants/ban-api.constants";

/**
 * Schéma de validation pour les paramètres de l'API d'autocomplétion
 * Basé sur l'API d'autocomplétion 2.0.1 de l'IGN (Base Adresse Nationale)
 */
export const searchAddressSchema = z.object({
	// Texte de recherche (requis)
	text: z
		.string()
		.min(1, "Le texte de recherche est requis")
		.max(200, "La recherche ne peut pas dépasser 200 caractères"),

	// Filtre territorial (optionnel)
	// Peut être: METROPOLE, DOMTOM, ou un code département (ex: 75, 2A, 2B, 971, etc.)
	terr: z.string().max(10).optional(),

	// Type de POI (optionnel) - filtre sur les types de points d'intérêt
	poiType: z.string().max(100).optional(),

	// Coordonnées pour favoriser les résultats proches (optionnel)
	// Format: "lon,lat" (ex: "2.37,48.357")
	lonlat: z
		.string()
		.regex(
			/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
			"Format invalide. Utiliser: lon,lat (ex: 2.37,48.357)"
		)
		.optional(),

	// Type de localisant (optionnel)
	// PositionOfInterest, StreetAddress, ou les deux séparés par une virgule
	type: z
		.string()
		.regex(
			/^(PositionOfInterest|StreetAddress)(,(PositionOfInterest|StreetAddress))?$/,
			"Type invalide. Valeurs autorisées: PositionOfInterest, StreetAddress, ou les deux séparés par une virgule"
		)
		.optional()
		.default(SEARCH_ADDRESS_DEFAULT_TYPE),

	// Nombre maximum de résultats (optionnel)
	maximumResponses: z.coerce
		.number()
		.int({ message: "maximumResponses doit être un entier" })
		.min(1, { message: "maximumResponses doit être au moins 1" })
		.max(
			SEARCH_ADDRESS_MAX_LIMIT,
			`maximumResponses ne peut pas dépasser ${SEARCH_ADDRESS_MAX_LIMIT}`
		)
		.optional()
		.default(SEARCH_ADDRESS_DEFAULT_LIMIT),

	// Boîte englobante (optionnel)
	// Format: "left,bottom,right,top" (ex: "-1.54,43.17,5.89,51.12")
	bbox: z
		.string()
		.regex(
			/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
			"Format invalide. Utiliser: left,bottom,right,top"
		)
		.optional(),
});

/**
 * Type inféré du schéma de recherche
 */
export type SearchAddressInput = z.infer<typeof searchAddressSchema>;
