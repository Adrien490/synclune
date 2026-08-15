import { prisma } from "@/shared/lib/prisma";

import { getProductsSchema } from "../schemas/product.schemas";
import { resolveTaxonomyFilterSlugs } from "./resolve-filter-slugs";
import {
	buildProductWhereClause,
	buildSearchConditions,
	type SearchResult,
} from "../services/product-query-builder";
import { cacheProducts } from "../utils/cache.utils";
import type { GetProductsParams, ProductFilters } from "../types/product.types";

/**
 * Compte les produits PUBLIC correspondant à un jeu de filtres — le chiffre du
 * bouton « Voir les N pièces » du panneau de filtres.
 *
 * Parité stricte avec `getProducts` : même `buildSearchConditions` (fuzzy) si
 * une recherche est active, même `buildProductWhereClause`, statut PUBLIC
 * forcé. `fetchProducts` n'applique aucun filtrage JS après son `where` (tri +
 * pagination seulement), donc ce `count` SQL vaut exactement son `totalCount`.
 *
 * Public par construction : pas de paramètre admin, pas de session — la clé de
 * cache ne dépend que des filtres (l'appelant trie les tableaux pour maximiser
 * les hits).
 */
export async function countPublicProducts(params: {
	filters: ProductFilters;
	search?: string;
}): Promise<number> {
	"use cache";
	cacheProducts();

	// Normalisation par le MÊME schéma que getProducts (défauts, bornes).
	const validated = getProductsSchema.parse({
		filters: { ...params.filters, active: true },
		search: params.search,
		active: true,
		includeDeleted: false,
	}) as GetProductsParams;

	// Ici la recherche s'exécute DANS le scope cache (contrairement à
	// getProducts, qui la sort pour keyer sur les ids trouvés) : la clé est le
	// terme lui-même, et un count n'a pas besoin de l'ordre de pertinence.
	let searchResult: SearchResult | undefined;
	if (validated.search) {
		searchResult = await buildSearchConditions(validated.search, { activeOnly: true });
	}

	const filters = (await resolveTaxonomyFilterSlugs(validated.filters)) ?? validated.filters;
	const where = buildProductWhereClause({ ...validated, filters }, searchResult);
	return prisma.product.count({ where });
}
