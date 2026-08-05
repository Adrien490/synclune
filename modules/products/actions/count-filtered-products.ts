"use server";

import { z } from "zod";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { logger } from "@/shared/lib/logger";
import { PRODUCT_FILTER_COUNT_LIMIT } from "@/shared/lib/rate-limit-config";
import { PRICE_LIMITS } from "@/shared/constants/validation-limits";

import { countPublicProducts } from "../data/count-products";
import {
	filterFormDataToProductFilters,
	resetFilterGroup,
	type FilterFormData,
	type FilterSectionId,
} from "../services/product-filter-params.service";

const MAX_PRICE_EUROS = PRICE_LIMITS.FILTER_MAX_CENTS / 100;

const priceEurosSchema = z.number().int().nonnegative().max(MAX_PRICE_EUROS);

const countFilteredProductsSchema = z.object({
	colors: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
	materials: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
	productTypes: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
	priceRange: z.tuple([priceEurosSchema, priceEurosSchema]),
	/** Borne haute du catalogue — définit la plage « par défaut » (= pas de filtre prix). */
	maxPriceInEuros: priceEurosSchema,
	inStockOnly: z.boolean().default(false),
	onSale: z.boolean().default(false),
	/** Terme de recherche actif dans l'URL — le count doit le voir aussi. */
	search: z.string().trim().max(100).optional(),
	/**
	 * Dernier groupe modifié côté client : à count = 0, on recompte une fois
	 * SANS lui pour proposer une sortie chiffrée (« Retire la couleur pour en
	 * voir 24 »).
	 */
	lastChangedGroup: z.enum(["types", "price", "colors", "materials", "availability"]).optional(),
});

export type CountFilteredProductsResult =
	| {
			kind: "success";
			count: number;
			/** Présent seulement si count = 0 ET qu'un recomptage relaxé rend > 0. */
			relaxed?: { group: FilterSectionId; count: number };
	  }
	| { kind: "rate-limited" }
	| { kind: "error" };

/**
 * Compte les pièces correspondant aux valeurs EN ATTENTE du panneau de filtres
 * (pas l'URL) — alimente le bouton « Voir les N pièces » et l'état vide.
 *
 * Action de LECTURE à retour custom (même pattern que `quick-search`) :
 * `input: unknown` parsé en tête, rate limit nommé, aucune invalidation.
 */
export async function countFilteredProducts(input: unknown): Promise<CountFilteredProductsResult> {
	try {
		const parsed = countFilteredProductsSchema.safeParse(input);
		if (!parsed.success) return { kind: "error" };

		const rateCheck = await enforceRateLimitForCurrentUser(PRODUCT_FILTER_COUNT_LIMIT);
		if ("error" in rateCheck) return { kind: "rate-limited" };

		const { maxPriceInEuros, search, lastChangedGroup, ...values } = parsed.data;
		const defaultPriceRange: [number, number] = [0, maxPriceInEuros];
		const formData: FilterFormData = values;

		const count = await countPublicProducts({
			filters: filterFormDataToProductFilters(formData, defaultPriceRange),
			search: search === "" ? undefined : search,
		});

		if (count === 0 && lastChangedGroup) {
			const relaxedValues = resetFilterGroup(formData, lastChangedGroup, defaultPriceRange);
			const relaxedCount = await countPublicProducts({
				filters: filterFormDataToProductFilters(relaxedValues, defaultPriceRange),
				search: search === "" ? undefined : search,
			});
			if (relaxedCount > 0) {
				return {
					kind: "success",
					count,
					relaxed: { group: lastChangedGroup, count: relaxedCount },
				};
			}
		}

		return { kind: "success", count };
	} catch (error) {
		logger.error("Filter count failed", error, { action: "count-filtered-products" });
		return { kind: "error" };
	}
}
