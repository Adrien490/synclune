// ==============================================================================
// LISTE DES PAYS AUTORISÉS POUR LA LIVRAISON
// France + Monaco + Union Européenne (sans DOM-TOM)
// ==============================================================================

/**
 * Liste des pays autorisés pour la livraison
 * Source de vérité unique pour :
 * - Stripe shipping_address_collection
 * - Validation Zod backend
 * - Select frontend
 *
 * France + Monaco + UE uniquement (pas de DOM-TOM)
 */
export const SHIPPING_COUNTRIES = [
	"FR", // France métropolitaine
	"MC", // Monaco (tarif Europe : 15€)
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
 * Liste des pays triée par nom pour l'affichage frontend
 * France et Monaco en premier, puis les autres par ordre alphabétique
 */
export const SORTED_SHIPPING_COUNTRIES = [
	"FR", // France toujours en premier
	"MC", // Monaco juste après
	// Autres pays UE triés alphabétiquement
	...SHIPPING_COUNTRIES.filter(
		(c) => c !== "FR" && c !== "MC"
	).sort((a, b) => COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b], "fr")),
] as const;

/**
 * Message d'erreur pour pays non autorisé
 */
export const COUNTRY_ERROR_MESSAGE =
	"Nous ne livrons actuellement qu'en France et dans l'Union Européenne.";
