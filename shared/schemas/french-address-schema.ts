import { z } from "zod";

/**
 * Validation stricte pour les adresses françaises
 * Contexte: Boutique France uniquement (Nantes)
 */

// Regex pour téléphone français
// Formats acceptés: 06 12 34 56 78, 0612345678, +33 6 12 34 56 78, +33612345678
export const FRENCH_PHONE_REGEX =
	/^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;

// Regex pour code postal français (5 chiffres)
export const FRENCH_POSTAL_CODE_REGEX = /^[0-9]{5}$/;

/**
 * Normalise un numéro de téléphone français
 * @param phone Numéro de téléphone brut
 * @returns Numéro formaté ou null si invalide
 */
export function normalizeFrenchPhone(phone: string): string | null {
	// Supprimer tous les espaces, tirets, points
	const cleaned = phone.replace(/[\s.\-()]/g, "");

	// Vérifier le format
	if (!FRENCH_PHONE_REGEX.test(cleaned)) {
		return null;
	}

	// Convertir au format international si nécessaire
	if (cleaned.startsWith("0")) {
		return `+33${cleaned.slice(1)}`;
	}

	if (cleaned.startsWith("33")) {
		return `+${cleaned}`;
	}

	return cleaned;
}

/**
 * Schéma Zod pour adresse française
 * Field names match Prisma Order model structure
 */
export const FrenchAddressSchema = z.object({
	firstName: z
		.string()
		.min(1, { error: "Le prénom est requis" })
		.max(100, { error: "Le prénom est trop long" }),
	lastName: z
		.string()
		.min(1, { error: "Le nom est requis" })
		.max(100, { error: "Le nom est trop long" }),
	addressLine1: z
		.string()
		.min(5, { error: "L'adresse doit contenir au moins 5 caractères" })
		.max(200, { error: "L'adresse est trop longue" }),
	addressLine2: z
		.string()
		.max(200, { error: "L'adresse complémentaire est trop longue" })
		.optional(),
	city: z
		.string()
		.min(1, { error: "La ville est requise" })
		.max(100, { error: "Le nom de ville est trop long" }),
	postalCode: z
		.string()
		.regex(FRENCH_POSTAL_CODE_REGEX, {
			error: "Code postal invalide (format: 12345)",
		}),
	country: z.literal("FR").refine((val) => val === "FR", {
		error: "Seules les adresses françaises sont acceptées",
	}),
	phoneNumber: z
		.string()
		.regex(FRENCH_PHONE_REGEX, {
			error:
				"Numéro de téléphone invalide (format: 06 12 34 56 78 ou +33 6 12 34 56 78)",
		})
		.optional()
		.transform((val) => {
			if (!val) return undefined;
			return normalizeFrenchPhone(val) || undefined;
		}),
});

export type FrenchAddress = z.infer<typeof FrenchAddressSchema>;

/**
 * Schéma pour adresse de facturation (optionnelle dans sa totalité)
 */
export const OptionalFrenchAddressSchema = FrenchAddressSchema.partial().refine(
	(data) => {
		// Si un champ est rempli, tous les champs obligatoires doivent l'être
		const hasAnyField = Object.values(data).some((val) => val !== undefined && val !== "");
		if (!hasAnyField) return true; // Tout vide = OK

		// Si au moins un champ est rempli, vérifier que les champs obligatoires le sont aussi
		return Boolean(
			data.firstName &&
				data.lastName &&
				data.addressLine1 &&
				data.city &&
				data.postalCode &&
				data.country
		);
	},
	{
		error:
			"Si vous renseignez une adresse de facturation, tous les champs obligatoires doivent être remplis",
	}
);

/**
 * Départements français pour validation avancée
 */
export const FRENCH_DEPARTMENTS = {
	METROPOLITAN: [
		"01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
		"11", "12", "13", "14", "15", "16", "17", "18", "19", "21",
		"22", "23", "24", "25", "26", "27", "28", "29", "2A", "2B",
		"30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
		"40", "41", "42", "43", "44", "45", "46", "47", "48", "49",
		"50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
		"60", "61", "62", "63", "64", "65", "66", "67", "68", "69",
		"70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
		"80", "81", "82", "83", "84", "85", "86", "87", "88", "89",
		"90", "91", "92", "93", "94", "95",
	],
	CORSE: ["2A", "2B"],
	DOM: ["97"], // Tous les DOM commencent par 97
	TOM: ["98"], // Tous les TOM commencent par 98
} as const;

/**
 * Détermine le type de zone géographique à partir du code postal
 */
export function getShippingZoneFromPostalCode(postalCode: string): {
	zone: "METROPOLITAN" | "CORSE" | "DOM" | "TOM" | "UNKNOWN";
	department: string;
} {
	const department = postalCode.substring(0, 2);

	if (department === "2A" || department === "2B") {
		return { zone: "CORSE", department };
	}

	if (department === "97") {
		return { zone: "DOM", department: postalCode.substring(0, 3) };
	}

	if (department === "98") {
		return { zone: "TOM", department: postalCode.substring(0, 3) };
	}

	if (
		FRENCH_DEPARTMENTS.METROPOLITAN.includes(
			department as (typeof FRENCH_DEPARTMENTS.METROPOLITAN)[number]
		)
	) {
		return { zone: "METROPOLITAN", department };
	}

	return { zone: "UNKNOWN", department };
}

/**
 * Validation de cohérence ville/code postal
 * Liste des grandes villes pour validation basique
 */
export const MAJOR_FRENCH_CITIES: Record<string, string[]> = {
	"75": ["Paris"],
	"44": ["Nantes"], // Ville de la créatrice
	"69": ["Lyon"],
	"13": ["Marseille", "Aix-en-Provence"],
	"31": ["Toulouse"],
	"33": ["Bordeaux"],
	"59": ["Lille"],
	"67": ["Strasbourg"],
	"34": ["Montpellier"],
	"35": ["Rennes"],
	// Ajoutez plus selon vos besoins
};
