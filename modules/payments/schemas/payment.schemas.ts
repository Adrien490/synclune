import { z } from "zod";

// ============================================================================
// CHECKOUT SCHEMA
// ============================================================================

// Regex pour téléphone français
// Formats acceptés: 06 12 34 56 78, 0612345678, +33 6 12 34 56 78, +33612345678
const FRENCH_PHONE_REGEX = /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;

import {
	SHIPPING_COUNTRIES,
	COUNTRY_ERROR_MESSAGE,
} from "@/shared/constants/countries";

/**
 * Schéma de validation pour le formulaire de checkout
 * Gère à la fois les utilisateurs connectés et les guests
 * Livraison France + UE uniquement (pas de douanes)
 */
export const checkoutSchema = z
	.object({
		// Email requis pour les guests, pré-rempli pour les utilisateurs connectés
		email: z
			.string()
			.max(100, { message: "L'email ne peut pas dépasser 100 caractères" })
			.trim()
			.toLowerCase()
			.optional(),

		// Adresse de livraison (obligatoire)
		shipping: z.object({
			firstName: z
				.string({ message: "Le prénom est requis" })
				.min(2, { message: "Le prénom doit contenir au moins 2 caractères" })
				.max(100, { message: "Le prénom est trop long" })
				.trim(),

			lastName: z
				.string({ message: "Le nom est requis" })
				.min(2, { message: "Le nom doit contenir au moins 2 caractères" })
				.max(100, { message: "Le nom est trop long" })
				.trim(),

			addressLine1: z
				.string({ message: "L'adresse est requise" })
				.min(5, {
					message: "L'adresse doit contenir au moins 5 caractères",
				})
				.max(200, { message: "L'adresse est trop longue" })
				.trim(),

			addressLine2: z
				.string()
				.max(200, {
					message: "L'adresse complémentaire est trop longue",
				})
				.optional()
				.or(z.literal("")),

			city: z
				.string({ message: "La ville est requise" })
				.min(2, {
					message: "Le nom de ville doit contenir au moins 2 caractères",
				})
				.max(100, { message: "Le nom de ville est trop long" })
				.trim(),

			postalCode: z
				.string({ message: "Le code postal est requis" })
				.min(1, { message: "Le code postal est requis" })
				.max(20, { message: "Code postal invalide" }),

			country: z.enum(SHIPPING_COUNTRIES, {
				message: COUNTRY_ERROR_MESSAGE,
			}),

			phoneNumber: z
				.string({ message: "Le numéro de téléphone est requis" })
				.regex(FRENCH_PHONE_REGEX, {
					message:
						"Numéro de téléphone invalide (format: 06 12 34 56 78 ou +33 6 12 34 56 78)",
				}),
		}),

		// Consentements
		termsAccepted: z.boolean().refine((val) => val === true, {
			message:
				"Tu dois accepter les conditions générales de vente pour continuer",
		}),

		// Enregistrer l'adresse (utilisateurs connectés uniquement)
		saveAddress: z.boolean().default(false),
	});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
