// ==============================================================================
// LISTE OFFICIELLE DES PAYS DE L'UE (+ MONACO + DOM-TOM) POUR LIVRAISON
// Cette liste exclut Suisse (CH) et Royaume-Uni (GB) pour éviter les douanes.
// ==============================================================================

/**
 * Liste des pays autorisés pour la livraison
 * Source de vérité unique pour :
 * - Stripe shipping_address_collection
 * - Validation Zod backend
 * - Select frontend
 *
 * UE + Monaco + DOM-TOM uniquement pour éviter les déclarations en douane (CN23)
 */
export const SHIPPING_COUNTRIES = [
	"FR", // France métropolitaine
	"MC", // Monaco (Traité comme France par les transporteurs)
	// --- DOM-TOM (Tarifs spécifiques Outre-Mer) ---
	"GP", // Guadeloupe
	"MQ", // Martinique
	"GF", // Guyane française
	"RE", // Réunion
	"YT", // Mayotte
	"PM", // Saint-Pierre-et-Miquelon
	"BL", // Saint-Barthélemy
	"MF", // Saint-Martin (partie française)
	"WF", // Wallis-et-Futuna
	"PF", // Polynésie française
	"NC", // Nouvelle-Calédonie
	// --- Pays de l'UE ---
	"BE", // Belgique
	"DE", // Allemagne
	"NL", // Pays-Bas
	"LU", // Luxembourg
	"IT", // Italie
	"ES", // Espagne
	"PT", // Portugal
	"AT", // Autriche
	"IE", // Irlande
	"FI", // Finlande
	"SE", // Suède
	"DK", // Danemark
	"GR", // Grèce
	// --- Pays de l'Est UE ---
	"BG", // Bulgarie
	"HR", // Croatie
	"CY", // Chypre
	"CZ", // Tchéquie
	"EE", // Estonie
	"HU", // Hongrie
	"LV", // Lettonie
	"LT", // Lituanie
	"MT", // Malte
	"PL", // Pologne
	"RO", // Roumanie
	"SK", // Slovaquie
	"SI", // Slovénie
] as const;

// Type dérivé pour TypeScript (ex: "FR" | "BE" | ...)
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number];

// ==============================================================================
// NOMS D'AFFICHAGE (Pour le menu déroulant Frontend)
// ==============================================================================

export const COUNTRY_NAMES: Record<ShippingCountry, string> = {
	FR: "France",
	MC: "Monaco",
	// DOM-TOM
	GP: "Guadeloupe",
	MQ: "Martinique",
	GF: "Guyane française",
	RE: "Réunion",
	YT: "Mayotte",
	PM: "Saint-Pierre-et-Miquelon",
	BL: "Saint-Barthélemy",
	MF: "Saint-Martin",
	WF: "Wallis-et-Futuna",
	PF: "Polynésie française",
	NC: "Nouvelle-Calédonie",
	// UE
	BE: "Belgique",
	DE: "Allemagne",
	NL: "Pays-Bas",
	LU: "Luxembourg",
	IT: "Italie",
	ES: "Espagne",
	PT: "Portugal",
	AT: "Autriche",
	IE: "Irlande",
	FI: "Finlande",
	SE: "Suède",
	DK: "Danemark",
	GR: "Grèce",
	BG: "Bulgarie",
	HR: "Croatie",
	CY: "Chypre",
	CZ: "Tchéquie",
	EE: "Estonie",
	HU: "Hongrie",
	LV: "Lettonie",
	LT: "Lituanie",
	MT: "Malte",
	PL: "Pologne",
	RO: "Roumanie",
	SK: "Slovaquie",
	SI: "Slovénie",
};

// ==============================================================================
// HELPERS
// ==============================================================================

/**
 * Vérifie si un code pays est autorisé pour la livraison
 */
export function isValidShippingCountry(
	country: string
): country is ShippingCountry {
	return SHIPPING_COUNTRIES.includes(country as ShippingCountry);
}

/**
 * Récupère le nom d'affichage d'un pays
 */
export function getCountryName(country: ShippingCountry): string {
	return COUNTRY_NAMES[country];
}

/**
 * DOM-TOM codes pour identification
 */
export const DOM_TOM_COUNTRIES = [
	"GP",
	"MQ",
	"GF",
	"RE",
	"YT",
	"PM",
	"BL",
	"MF",
	"WF",
	"PF",
	"NC",
] as const;

export type DomTomCountry = (typeof DOM_TOM_COUNTRIES)[number];

/**
 * Vérifie si un pays est un DOM-TOM
 */
export function isDomTom(country: string): country is DomTomCountry {
	return DOM_TOM_COUNTRIES.includes(country as DomTomCountry);
}

/**
 * Liste des pays triée par nom pour l'affichage frontend
 * France en premier, DOM-TOM ensuite, puis les autres par ordre alphabétique
 */
export const SORTED_SHIPPING_COUNTRIES = [
	"FR", // France toujours en premier
	"MC", // Monaco juste après (traité comme France)
	// DOM-TOM triés alphabétiquement
	...DOM_TOM_COUNTRIES.slice().sort((a, b) =>
		COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b], "fr")
	),
	// Autres pays UE triés alphabétiquement
	...SHIPPING_COUNTRIES.filter(
		(c) => c !== "FR" && c !== "MC" && !DOM_TOM_COUNTRIES.includes(c as DomTomCountry)
	).sort((a, b) => COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b], "fr")),
] as const;

/**
 * Message d'erreur pour pays non autorisé
 */
export const COUNTRY_ERROR_MESSAGE =
	"Nous ne livrons actuellement qu'en France et dans l'Union Européenne.";
