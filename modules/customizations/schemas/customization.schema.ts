import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

// ============================================================================
// CUSTOMIZATION FORM SCHEMA
// ============================================================================

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

		email: z
			.string({ message: "L'adresse email est requise" })
			.email({ message: "Vérifie le format de ton email (ex: nom@domaine.com)" })
			.max(100, { message: "L'email ne peut pas dépasser 100 caractères" })
			.trim()
			.toLowerCase(),

		phone: z
			.string()
			.refine((val) => !val || isValidPhoneNumber(val), {
				message: "Numéro de téléphone invalide",
			})
			.optional()
			.or(z.literal("")),

		// Type de produit (optionnel)
		productTypeLabel: z.string().optional().default(""),

		// Détails de la personnalisation
		details: z
			.string({ message: "Les détails de ton projet sont requis" })
			.min(20, { message: "Les détails doivent contenir au moins 20 caractères" })
			.max(2000, { message: "Les détails ne peuvent pas dépasser 2000 caractères" })
			.trim(),

		// Consentements
		rgpdConsent: z
			.boolean({ message: "Tu dois accepter la politique de confidentialité" })
			.refine((val) => val === true, {
				message: "Tu dois accepter la politique de confidentialité pour continuer",
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
