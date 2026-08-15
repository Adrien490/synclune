import { z } from "zod";
import { SHIPPING_COUNTRIES } from "@/shared/constants/countries";

/**
 * Entrée de `createCheckoutSession` : uniquement le pays de livraison, choisi
 * sur la page /paiement. Il fixe les frais de port ET verrouille
 * `shipping_address_collection.allowed_countries` sur la session Stripe — le
 * client ne peut pas payer un port France puis livrer en Allemagne.
 */
export const createCheckoutSessionSchema = z.object({
	country: z.enum(SHIPPING_COUNTRIES),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
