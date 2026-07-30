import { z } from "zod";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";

import {
	SKU_FILTERS_MIN_DATE,
	SKU_FILTERS_MAX_INVENTORY,
	SKU_FILTERS_MAX_PRICE_CENTS,
} from "../constants/sku.constants";

export const productSkuFiltersSchema = z
	.object({
		// Filtres recommandés
		productId: optionalStringOrStringArraySchema, // Fortement recommandé
		colorId: optionalStringOrStringArraySchema,
		materialId: optionalStringOrStringArraySchema, // Filtre par ID de matériau
		material: optionalStringOrStringArraySchema, // Filtre par nom de matériau (legacy)

		// Filtres de base
		sku: optionalStringOrStringArraySchema, // Pour recherche de préfixe
		isActive: z.boolean().optional(),
		isDefault: z.boolean().optional(),

		// Filtres de prix (en centimes) - aligné avec max 999999.99€ = 99999999 centimes
		priceMin: z.number().int().nonnegative().max(SKU_FILTERS_MAX_PRICE_CENTS).optional(),
		priceMax: z.number().int().nonnegative().max(SKU_FILTERS_MAX_PRICE_CENTS).optional(),

		// Filtres de stock
		inventoryMin: z.number().int().nonnegative().max(SKU_FILTERS_MAX_INVENTORY).optional(),
		inventoryMax: z.number().int().nonnegative().max(SKU_FILTERS_MAX_INVENTORY).optional(),
		inStock: z.boolean().optional(), // inventory > 0
		outOfStock: z.boolean().optional(), // inventory = 0
		stockStatus: z.enum(["all", "in_stock", "low_stock", "out_of_stock"]).optional(),

		// Filtres de taille
		size: optionalStringOrStringArraySchema,

		// Filtres temporels
		createdAfter: z.coerce
			.date()
			.min(SKU_FILTERS_MIN_DATE, "Date trop ancienne")
			.refine((d) => d <= new Date(), "La date ne peut pas être dans le futur")
			.optional(),
		createdBefore: z.coerce
			.date()
			.min(SKU_FILTERS_MIN_DATE, "Date trop ancienne")
			.refine((d) => d <= new Date(), "La date ne peut pas être dans le futur")
			.optional(),
		updatedAfter: z.coerce
			.date()
			.min(SKU_FILTERS_MIN_DATE, "Date trop ancienne")
			.refine((d) => d <= new Date(), "La date ne peut pas être dans le futur")
			.optional(),
		updatedBefore: z.coerce
			.date()
			.min(SKU_FILTERS_MIN_DATE, "Date trop ancienne")
			.refine((d) => d <= new Date(), "La date ne peut pas être dans le futur")
			.optional(),

		// Filtres sur les relations
		hasImages: z.boolean().optional(),
		hasOrders: z.boolean().optional(),
	})
	.refine((data) => {
		// `!== undefined` (et non truthy) pour ne pas sauter la vérif quand une borne
		// vaut 0 — aligné sur productFiltersSchema (audit filtres K1).
		if (data.priceMin !== undefined && data.priceMax !== undefined) {
			return data.priceMin <= data.priceMax;
		}
		return true;
	}, "Le prix minimum doit être inférieur ou égal au prix maximum")
	.refine((data) => {
		if (data.inventoryMin !== undefined && data.inventoryMax !== undefined) {
			return data.inventoryMin <= data.inventoryMax;
		}
		return true;
	}, "Le stock minimum doit être inférieur ou égal au stock maximum")
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	}, "La date de début doit être antérieure ou égale à la date de fin")
	.refine((data) => {
		if (data.updatedAfter && data.updatedBefore) {
			return data.updatedAfter <= data.updatedBefore;
		}
		return true;
	}, "La date de début doit être antérieure ou égale à la date de fin")
	// Filtres de stock mutuellement exclusifs. `buildFilterConditions` empile chaque
	// filtre dans le même `AND` : demander à la fois « en stock » et « épuisé »
	// poussait `inventory > 0` ET `inventory <= 0`, soit un jeu de résultats
	// VIDE GARANTI — sans message, l'admin concluait « aucune variante ».
	.refine(
		(data) => !(data.inStock === true && data.outOfStock === true),
		"« En stock » et « Épuisé » ne peuvent pas être demandés en même temps",
	)
	.refine((data) => {
		if (data.inStock !== true) return true;
		return data.stockStatus !== "out_of_stock";
	}, "« En stock » est incompatible avec le statut « Épuisé »")
	.refine((data) => {
		if (data.outOfStock !== true) return true;
		return data.stockStatus !== "in_stock" && data.stockStatus !== "low_stock";
	}, "« Épuisé » est incompatible avec un statut de stock non nul");

export type ProductSkuFilters = z.infer<typeof productSkuFiltersSchema>;
