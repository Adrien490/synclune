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
	"MC", // Monaco (tarif zone EU — cf. SHIPPING_RATES.EU)
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

/**
 * Nom français d'un pays à partir de son code ISO 3166-1 alpha-2.
 *
 * `Order.shippingCountry` est un `VarChar(2)` (défaut `"FR"`) : les surfaces qui
 * rendaient la colonne brute affichaient « 75002 Paris, FR » — emails de
 * confirmation et d'expédition, carte d'adresse de l'espace client. Le repli
 * `order.shippingCountry || "France"` des émetteurs d'emails ne se déclenchait
 * jamais, la colonne étant non-nulle.
 *
 * Les casts `COUNTRY_NAMES[code as ShippingCountry]` éparpillés renvoient
 * `undefined` — donc n'affichent rien — sur un code hors périmètre (ligne
 * historique, pays retiré de la liste) ; ce helper retombe sur le code lui-même,
 * ce qui reste lisible.
 */
export function formatCountryName(code: string | null | undefined): string {
	if (!code) return COUNTRY_NAMES.FR;
	// Record élargi plutôt qu'un `as ShippingCountry` : le cast affirmerait que
	// tout code est connu, ce qui masque le repli au type-checker.
	const names: Record<string, string | undefined> = COUNTRY_NAMES;
	return names[code] ?? code;
}

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
 * Liste des pays triée par nom pour l'affichage frontend
 * France et Monaco en premier, puis les autres par ordre alphabétique
 */
export const SORTED_SHIPPING_COUNTRIES = [
	"FR", // France toujours en premier
	"MC", // Monaco juste après
	// Autres pays UE triés alphabétiquement
	...SHIPPING_COUNTRIES.filter((c) => c !== "FR" && c !== "MC").sort((a, b) =>
		COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b], "fr"),
	),
] as const;

/**
 * Countries with purely numeric postal codes (most EU countries).
 * Used to set inputMode="numeric" on postal code fields.
 * IE, NL, MT use alphanumeric formats and are excluded.
 */
export const NUMERIC_POSTAL_CODE_COUNTRIES: ReadonlySet<string> = new Set([
	"FR",
	"MC",
	"DE",
	"ES",
	"IT",
	"PT",
	"AT",
	"FI",
	"SE",
	"DK",
	"GR",
	"BG",
	"HR",
	"CY",
	"CZ",
	"EE",
	"HU",
	"LV",
	"LT",
	"PL",
	"RO",
	"SK",
	"SI",
]);

/**
 * Message d'erreur pour pays non autorisé
 */
export const COUNTRY_ERROR_MESSAGE =
	"Nous ne livrons actuellement qu'en France et dans l'Union Européenne.";
