import { z } from "zod";

const stringOrStringArray = z
	.union([
		z.string().min(1).max(100),
		z.array(z.string().min(1).max(100)).max(50),
	])
	.optional();

export const productSkuFiltersSchema = z
	.object({
		// Filtres recommandés
		productId: stringOrStringArray, // Fortement recommandé
		colorId: stringOrStringArray,
		material: stringOrStringArray, // Material is now a string field

		// Filtres de base
		sku: stringOrStringArray, // Pour recherche de préfixe
		isActive: z.boolean().optional(),
		isDefault: z.boolean().optional(),

		// Filtres de prix (en centimes)
		priceMin: z.number().int().nonnegative().max(10000000).optional(),
		priceMax: z.number().int().nonnegative().max(10000000).optional(),

		// Filtres de stock
		inventoryMin: z.number().int().nonnegative().max(100000).optional(),
		inventoryMax: z.number().int().nonnegative().max(100000).optional(),
		inStock: z.boolean().optional(), // inventory > 0
		outOfStock: z.boolean().optional(), // inventory = 0
		stockStatus: z.enum(["all", "in_stock", "low_stock", "out_of_stock"]).optional(),

		// Filtres de taille
		size: stringOrStringArray,

		// Filtres temporels
		createdAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		createdBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		updatedAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		updatedBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),

		// Filtres sur les relations
		hasImages: z.boolean().optional(),
		hasOrders: z.boolean().optional(),
		hasReservations: z.boolean().optional(),
	})
	.refine((data) => {
		if (data.priceMin && data.priceMax) {
			return data.priceMin <= data.priceMax;
		}
		return true;
	}, "priceMin must be less than or equal to priceMax")
	.refine((data) => {
		if (data.inventoryMin && data.inventoryMax) {
			return data.inventoryMin <= data.inventoryMax;
		}
		return true;
	}, "inventoryMin must be less than or equal to inventoryMax")
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	}, "createdAfter must be before or equal to createdBefore")
	.refine((data) => {
		if (data.updatedAfter && data.updatedBefore) {
			return data.updatedAfter <= data.updatedBefore;
		}
		return true;
	}, "updatedAfter must be before or equal to updatedBefore");

export type ProductSkuFilters = z.infer<typeof productSkuFiltersSchema>;
