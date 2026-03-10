import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";
import { isAllowedMediaDomain } from "@/shared/lib/media-validation";

// ============================================================================
// CUSTOMIZATION FORM SCHEMA
// ============================================================================

/**
 * Schema du formulaire de personnalisation
 * Formulaire dédié aux demandes de personnalisation et gravure uniquement
 */
export const customizationSchema = z.object({
	// Informations personnelles
	firstName: z
		.string({ message: "Le prénom est requis" })
		.min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
		.max(50, { message: "Le prénom ne peut pas dépasser 50 caractères" })
		.trim(),

	email: z
		.string({ message: "L'adresse email est requise" })
		.email({ message: "Vérifiez le format de votre email (ex: nom@domaine.com)" })
		.max(100, { message: "L'email ne peut pas dépasser 100 caractères" })
		.trim()
		.toLowerCase(),

	phone: z
		.string()
		.refine((val) => !val || isValidPhoneNumber(val), {
			message: "Numéro de téléphone invalide",
		})
		.optional()
		.default(""),

	// Type de produit (optionnel)
	productTypeLabel: z
		.string()
		.max(100, { message: "Le type de produit ne peut pas dépasser 100 caractères" })
		.optional()
		.default(""),

	// Détails de la personnalisation
	details: z
		.string({ message: "Les détails de votre projet sont requis" })
		.min(10, { message: "Les détails doivent contenir au moins 10 caractères" })
		.max(2000, { message: "Les détails ne peuvent pas dépasser 2000 caractères" })
		.trim(),

	// Images d'inspiration (objets média uploadés via UploadThing)
	inspirationMedias: z
		.array(
			z.object({
				url: z.string().url().refine(isAllowedMediaDomain, {
					message: "L'URL de l'image provient d'un domaine non autorisé",
				}),
				blurDataUrl: z
					.string()
					.regex(/^data:image\/(png|jpeg|webp|gif);/, {
						message: "Format d'image non autorise (PNG, JPEG, WebP, GIF uniquement)",
					})
					.max(5000)
					.optional(),
				altText: z.string().max(255).optional(),
			}),
		)
		.max(5, { message: "Maximum 5 images d'inspiration" })
		.optional()
		.default([]),

	// Consentements
	rgpdConsent: z
		.boolean({ message: "Vous devez accepter la politique de confidentialité" })
		.refine((val) => val === true, {
			message: "Vous devez accepter la politique de confidentialité pour continuer",
		}),

	// Anti-spam (honeypot)
	website: z.string().optional().or(z.literal("")),
});

export type CustomizationFormData = z.infer<typeof customizationSchema>;

/**
 * Partial schema for validating localStorage draft data
 * Only validates the saveable fields (excludes rgpdConsent, website, inspirationMedias)
 */
export const customizationDraftSchema = z
	.object({
		firstName: z.string().max(50).optional(),
		email: z.string().max(100).optional(),
		phone: z.string().optional(),
		productTypeLabel: z.string().max(100).optional(),
		details: z.string().max(2000).optional(),
	})
	.passthrough();
