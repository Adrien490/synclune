import { type Prisma } from "@/app/generated/prisma/client";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import {
	GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE,
	GET_PRODUCT_VARIANTS_DEFAULT_SELECT,
	GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE,
} from "../constants/variant.constants";
import {
	type GetProductVariantsParams,
	type GetProductVariantsReturn,
} from "../types/variants.types";
import { buildWhereClause } from "@/modules/variants/services/build-where-clause";
import { getSortDirection } from "@/shared/utils/sort-direction";

/** Normalise un filtre `string | string[] | undefined` en tableau. */
function toArray(value: string | string[] | undefined): string[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

/**
 * Récupère la liste des VARIANTs de produits avec pagination, tri et filtrage
 * Admin uniquement
 */
export async function fetchProductVariants(
	params: GetProductVariantsParams,
): Promise<GetProductVariantsReturn> {
	"use cache";

	// Cache configuration for stock list (used in admin dashboard)
	cacheLife("user");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST, PRODUCTS_CACHE_TAGS.VARIANTS_LIST);

	// `VARIANTS(productId)` était invalidé par une dizaine de mutateurs et posé par
	// PERSONNE : son unique poseur, `cacheProductVariants`, n'avait aucun appelant en
	// production — une famille de tags entièrement décorative (audit cache
	// catalogue 2026-07-31). Pire, la régression STOCK-STALE-BASELINE-001 assertait
	// la couverture de ce lecteur fantôme, donc passait au vert sur rien.
	// Le poser ICI, sur le vrai lecteur par-produit, rend l'invalidation réelle et
	// plus fine que de buster `admin-stock-list` en entier à chaque geste VARIANT.
	// Le filtre accepte `string | string[]` : on tague chaque produit visé. Sans
	// filtre produit (liste globale), seuls les deux tags larges ci-dessus portent.
	for (const productId of toArray(params.filters?.productId)) {
		cacheTag(PRODUCTS_CACHE_TAGS.VARIANTS(productId));
	}

	// ⚠️ AUCUN try/catch ici : il était À L'INTÉRIEUR du scope `"use cache"`, donc une
	// panne DB transitoire mettait une liste VIDE en cache pour toute la fenêtre du
	// profil `user` (1 min revalidate / 2 min stale) — l'admin voyait « aucune
	// variante » plusieurs minutes après le rétablissement. Le repli appartient à
	// l'appelant, HORS du scope de cache (même pattern que `get-variant.ts`).
	const where = buildWhereClause(params);
	const direction = getSortDirection(params.sortBy);

	const sortFieldMap: Record<string, Prisma.ProductVariantOrderByWithRelationInput[]> = {
		"price-ascending": [{ priceCents: direction }, { id: "asc" }],
		"price-descending": [{ priceCents: direction }, { id: "asc" }],
		"stock-ascending": [{ stock: direction }, { id: "asc" }],
		"stock-descending": [{ stock: direction }, { id: "asc" }],
		// Plus de createdAt sur la variante lean : l'id cuid est croissant dans
		// le temps, il porte le tri chronologique.
		"created-ascending": [{ id: direction }],
		"created-descending": [{ id: direction }],
	};
	const orderBy: Prisma.ProductVariantOrderByWithRelationInput[] = sortFieldMap[params.sortBy] ?? [
		{ id: "desc" },
	];

	const take = Math.min(
		Math.max(1, params.perPage || GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE),
		GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE,
	);

	const cursorConfig = buildCursorPagination({
		cursor: params.cursor,
		direction: params.direction,
		take,
	});

	// Représentant du produit = première variante par id (le schéma lean n'a plus
	// de rang `position` sur la variante). N'a de sens que pour une liste bornée à
	// UN produit (le seul appelant en production).
	const productIds = toArray(params.filters?.productId);
	const representativePromise =
		productIds.length === 1
			? prisma.productVariant.findFirst({
					where: { productId: productIds[0] },
					orderBy: { id: "asc" },
					select: { id: true },
				})
			: Promise.resolve(null);

	const [productVariants, representative] = await Promise.all([
		prisma.productVariant.findMany({
			where,
			select: GET_PRODUCT_VARIANTS_DEFAULT_SELECT,
			orderBy,
			...cursorConfig,
		}),
		representativePromise,
	]);

	const { items, pagination } = processCursorResults(
		productVariants,
		take,
		params.direction,
		params.cursor,
	);

	return {
		productVariants: items,
		pagination,
		representativeVariantId: representative?.id ?? null,
	};
}
