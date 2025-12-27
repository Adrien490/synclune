import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import {
	SHIPPING_COUNTRIES,
	COUNTRY_ERROR_MESSAGE,
} from "@/shared/constants/countries";

// Schéma d'adresse avec validation du pays
// Note: fullName est parsé en firstName/lastName côté serveur via parseFullName utils
const addressSchema = z.object({
	fullName: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères"),
	addressLine1: z.string().min(1),
	addressLine2: z.string().optional(),
	city: z.string().min(1),
	postalCode: z.string().min(1).max(20), // Codes postaux UE varient en longueur
	country: z.enum(SHIPPING_COUNTRIES, {
		message: COUNTRY_ERROR_MESSAGE,
	}),
	phoneNumber: z
		.string()
		.min(1, "Le numéro de téléphone est requis")
		.refine(isValidPhoneNumber, { message: "Numéro de téléphone invalide" }),
});

// Schéma de validation pour la création de session Stripe Checkout
export const createCheckoutSessionSchema = z.object({
	cartItems: z
		.array(
			z.object({
				skuId: z.string(),
				quantity: z.number().int().positive(),
			})
		)
		.min(1, "Le panier doit contenir au moins un article"),
	shippingAddress: addressSchema,
	email: z.email("Vérifie le format de ton email (ex: nom@domaine.com)").optional(), // Requis si guest
	discountCode: z.string().max(30).optional(), // Code promo optionnel
});

