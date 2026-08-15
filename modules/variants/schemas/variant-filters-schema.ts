import { z } from "zod";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";

import {
	VARIANT_FILTERS_MAX_STOCK,
	VARIANT_FILTERS_MAX_PRICE_CENTS,
} from "../constants/variant.constants";

export const productVariantFiltersSchema = z
	.object({
		// Filtres recommandés
		productId: optionalStringOrStringArraySchema, // Fortement recommandé
		colorId: optionalStringOrStringArraySchema,
		materialId: optionalStringOrStringArraySchema, // Filtre par ID de matériau
		material: optionalStringOrStringArraySchema, // Filtre par nom de matériau (legacy)

		// Filtres de base
		active: z.boolean().optional(),
		// Plus de filtre `isDefault` : la colonne a disparu (audit schéma V5, lot A2)
		// et le filtre n'avait aucune surface UI — le représentant (rang 0 de
		// position) est signalé par badge dans la liste, pas par un filtre.

		// Filtres de prix (en centimes) - aligné avec max 999999.99€ = 99999999 centimes
		priceMin: z.number().int().nonnegative().max(VARIANT_FILTERS_MAX_PRICE_CENTS).optional(),
		priceMax: z.number().int().nonnegative().max(VARIANT_FILTERS_MAX_PRICE_CENTS).optional(),

		// Filtres de stock
		stockMin: z.number().int().nonnegative().max(VARIANT_FILTERS_MAX_STOCK).optional(),
		stockMax: z.number().int().nonnegative().max(VARIANT_FILTERS_MAX_STOCK).optional(),
		inStock: z.boolean().optional(), // stock > 0
		outOfStock: z.boolean().optional(), // stock = 0
		stockStatus: z.enum(["all", "in_stock", "low_stock", "out_of_stock"]).optional(),

		// Filtres de taille
		size: optionalStringOrStringArraySchema,

		// Filtres sur les relations
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
		if (data.stockMin !== undefined && data.stockMax !== undefined) {
			return data.stockMin <= data.stockMax;
		}
		return true;
	}, "Le stock minimum doit être inférieur ou égal au stock maximum")
	// Filtres de stock mutuellement exclusifs. `buildFilterConditions` empile chaque
	// filtre dans le même `AND` : demander à la fois « en stock » et « épuisé »
	// poussait `stock > 0` ET `stock <= 0`, soit un jeu de résultats
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

export type ProductVariantFilters = z.infer<typeof productVariantFiltersSchema>;
