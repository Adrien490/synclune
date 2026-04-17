import { z } from "zod";

export const MAX_INSPIRATION_PRODUCTS = 10;

export const updateInspirationProductsSchema = z.object({
	requestId: z.cuid2("ID invalide"),
	productIds: z
		.array(z.cuid2("ID produit invalide"))
		.max(MAX_INSPIRATION_PRODUCTS, `Maximum ${MAX_INSPIRATION_PRODUCTS} produits inspirants`),
});

export type UpdateInspirationProductsInput = z.infer<typeof updateInspirationProductsSchema>;
