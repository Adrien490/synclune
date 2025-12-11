import { z } from "zod";

// ============================================================================
// CUSTOMIZATION FORM SCHEMA
// ============================================================================

/**
 * Regex pour validation téléphone français
 */
const FRENCH_PHONE_REGEX = /^(\+33|0)[1-9](\d{2}){4}$/;

/**
 * Regex pour validation CUID
 */
const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Schema du formulaire de personnalisation
 * Formulaire dédié aux demandes de personnalisation et gravure uniquement
 */
export const customizationSchema = z
	.object({
		// Informations personnelles
		firstName: z
			.string({ message: "Le prénom est requis" })
			.min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
			.max(50, { message: "Le prénom ne peut pas dépasser 50 caractères" })
			.trim(),

		lastName: z
			.string({ message: "Le nom est requis" })
			.min(2, { message: "Le nom doit contenir au moins 2 caractères" })
			.max(50, { message: "Le nom ne peut pas dépasser 50 caractères" })
			.trim(),

		email: z
			.string({ message: "L'adresse email est requise" })
			.email({ message: "Veuillez entrer une adresse email valide" })
			.max(100, { message: "L'email ne peut pas dépasser 100 caractères" })
			.trim()
			.toLowerCase(),

		phone: z
			.string()
			.regex(FRENCH_PHONE_REGEX, {
				message:
					"Le numéro de téléphone doit être au format français valide (ex: 06 12 34 56 78 ou +33 6 12 34 56 78)",
			})
			.optional()
			.or(z.literal("")),

		// Type de produit (optionnel)
		productTypeLabel: z.string().optional().default(""),

		// Inspirations (produits existants comme référence)
		inspirationProductIds: z
			.array(z.string().regex(CUID_REGEX, { message: "ID de produit invalide" }))
			.max(5, { message: "Vous pouvez sélectionner au maximum 5 produits" })
			.optional()
			.default([]),

		// Préférences de couleurs
		preferredColorIds: z
			.array(z.string().regex(CUID_REGEX, { message: "ID de couleur invalide" }))
			.max(10, { message: "Vous pouvez sélectionner au maximum 10 couleurs" })
			.optional()
			.default([]),

		// Préférences de matériaux
		preferredMaterialIds: z
			.array(z.string().regex(CUID_REGEX, { message: "ID de matériau invalide" }))
			.max(5, { message: "Vous pouvez sélectionner au maximum 5 matériaux" })
			.optional()
			.default([]),

		// Détails de la personnalisation
		details: z
			.string({ message: "Les détails de votre projet sont requis" })
			.min(20, { message: "Les détails doivent contenir au moins 20 caractères" })
			.max(2000, { message: "Les détails ne peuvent pas dépasser 2000 caractères" })
			.trim(),

		// Consentements
		rgpdConsent: z
			.boolean({ message: "Vous devez accepter la politique de confidentialité" })
			.refine((val) => val === true, {
				message: "Vous devez accepter la politique de confidentialité pour continuer",
			}),

		// Anti-spam (honeypot)
		website: z.string().optional().or(z.literal("")),
	})
	// Validation du honeypot (anti-spam)
	.refine((data) => !data.website || data.website === "", {
		message: "Champ invalide détecté",
		path: ["website"],
	});

export type CustomizationFormData = z.infer<typeof customizationSchema>;
