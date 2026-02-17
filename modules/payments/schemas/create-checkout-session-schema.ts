import { z } from "zod";
import {
	SHIPPING_COUNTRIES,
	COUNTRY_ERROR_MESSAGE,
} from "@/shared/constants/countries";
import { emailOptionalSchema } from "@/shared/schemas/email.schemas";
import { phoneSchema } from "@/shared/schemas/phone.schemas";
import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";
import { discountCodeSchema } from "@/modules/discounts/schemas/discount.schemas";

// Schema d'adresse avec validation du pays
// Note: fullName est parse en firstName/lastName cote serveur via parseFullName utils
const addressSchema = z.object({
	fullName: z.string().min(2, "Le nom complet doit contenir au moins 2 caracteres"),
	addressLine1: z.string().min(1),
	addressLine2: z.string().optional(),
	city: z.string().min(1),
	postalCode: z.string().min(1).max(20), // Codes postaux UE varient en longueur
	country: z.enum(SHIPPING_COUNTRIES, {
		message: COUNTRY_ERROR_MESSAGE,
	}),
	phoneNumber: phoneSchema,
});

// Schema de validation pour la creation de session Stripe Checkout
export const createCheckoutSessionSchema = z.object({
	cartItems: z
		.array(
			z.object({
				skuId: z.string(),
				quantity: z.number().int().positive().max(MAX_QUANTITY_PER_ORDER, `Maximum ${MAX_QUANTITY_PER_ORDER} unités par article`),
				priceAtAdd: z.number().int().positive(),
			})
		)
		.min(1, "Le panier doit contenir au moins un article"),
	shippingAddress: addressSchema,
	email: emailOptionalSchema, // Requis si guest
	discountCode: discountCodeSchema.optional(), // Code promo optionnel (trim + uppercase + regex validated)
});

