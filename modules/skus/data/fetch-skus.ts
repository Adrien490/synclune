import { type Prisma } from "@/app/generated/prisma/client";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import {
	GET_PRODUCT_SKUS_DEFAULT_PER_PAGE,
	GET_PRODUCT_SKUS_DEFAULT_SELECT,
	GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
} from "../constants/sku.constants";
import { type GetProductSkusParams, type GetProductSkusReturn } from "../types/skus.types";
import { buildWhereClause } from "@/modules/skus/services/build-where-clause";
import { getSortDirection } from "@/shared/utils/sort-direction";

/** Normalise un filtre `string | string[] | undefined` en tableau. */
function toArray(value: string | string[] | undefined): string[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

/**
 * Récupère la liste des SKUs de produits avec pagination, tri et filtrage
 * Admin uniquement
 */
export async function fetchProductSkus(
	params: GetProductSkusParams,
): Promise<GetProductSkusReturn> {
	"use cache";

	// Cache configuration for inventory list (used in admin dashboard)
	cacheLife("user");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST, PRODUCTS_CACHE_TAGS.SKUS_LIST);

	// `SKUS(productId)` était invalidé par une dizaine de mutateurs et posé par
	// PERSONNE : son unique poseur, `cacheProductSkus`, n'avait aucun appelant en
	// production — une famille de tags entièrement décorative (audit cache
	// catalogue 2026-07-31). Pire, la régression STOCK-STALE-BASELINE-001 assertait
	// la couverture de ce lecteur fantôme, donc passait au vert sur rien.
	// Le poser ICI, sur le vrai lecteur par-produit, rend l'invalidation réelle et
	// plus fine que de buster `admin-inventory-list` en entier à chaque geste SKU.
	// Le filtre accepte `string | string[]` : on tague chaque produit visé. Sans
	// filtre produit (liste globale), seuls les deux tags larges ci-dessus portent.
	for (const productId of toArray(params.filters?.productId)) {
		cacheTag(PRODUCTS_CACHE_TAGS.SKUS(productId));
	}

	// ⚠️ AUCUN try/catch ici : il était À L'INTÉRIEUR du scope `"use cache"`, donc une
	// panne DB transitoire mettait une liste VIDE en cache pour toute la fenêtre du
	// profil `user` (1 min revalidate / 2 min stale) — l'admin voyait « aucune
	// variante » plusieurs minutes après le rétablissement. Le repli appartient à
	// l'appelant, HORS du scope de cache (même pattern que `get-sku.ts`).
	const where = buildWhereClause(params);
	const direction = getSortDirection(params.sortBy);

	const sortFieldMap: Record<string, Prisma.ProductSkuOrderByWithRelationInput[]> = {
		"sku-ascending": [{ sku: direction }, { id: "asc" }],
		"sku-descending": [{ sku: direction }, { id: "asc" }],
		"price-ascending": [{ priceInclTax: direction }, { id: "asc" }],
		"price-descending": [{ priceInclTax: direction }, { id: "asc" }],
		"stock-ascending": [{ inventory: direction }, { id: "asc" }],
		"stock-descending": [{ inventory: direction }, { id: "asc" }],
		"created-ascending": [{ createdAt: direction }, { id: "asc" }],
		"created-descending": [{ createdAt: direction }, { id: "asc" }],
	};
	// Le représentant n'est plus épinglé en tête de liste : l'ancien
	// `{ isDefault: "desc" }` reposait sur une colonne disparue (audit schéma V5,
	// lot A2), et son équivalent `{ position: "asc" }` rendrait le tri utilisateur
	// inopérant (les rangs sont uniques par produit). Le représentant est signalé
	// par badge via `representativeSkuId` ci-dessous.
	const orderBy: Prisma.ProductSkuOrderByWithRelationInput[] = sortFieldMap[params.sortBy] ?? [
		{ createdAt: "desc" },
		{ id: "asc" },
	];

	const take = Math.min(
		Math.max(1, params.perPage || GET_PRODUCT_SKUS_DEFAULT_PER_PAGE),
		GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE,
	);

	const cursorConfig = buildCursorPagination({
		cursor: params.cursor,
		direction: params.direction,
		take,
	});

	// Représentant du produit = rang 0 de (position asc, id asc) parmi les
	// variantes non supprimées (remplace `isDefault`, audit schéma V5, lot A2).
	// Calculé par une requête dédiée — pas depuis la page chargée : sous filtre ou
	// pagination, le rang 0 peut ne pas figurer dans les lignes retournées, et le
	// badge « Par défaut » se poserait alors sur la mauvaise ligne. N'a de sens que
	// pour une liste bornée à UN produit (le seul appelant en production).
	const productIds = toArray(params.filters?.productId);
	const representativePromise =
		productIds.length === 1
			? prisma.productSku.findFirst({
					where: { productId: productIds[0], deletedAt: null },
					orderBy: [{ position: "asc" }, { id: "asc" }],
					select: { id: true },
				})
			: Promise.resolve(null);

	const [productSkus, representative] = await Promise.all([
		prisma.productSku.findMany({
			where,
			select: GET_PRODUCT_SKUS_DEFAULT_SELECT,
			orderBy,
			...cursorConfig,
		}),
		representativePromise,
	]);

	const { items, pagination } = processCursorResults(
		productSkus,
		take,
		params.direction,
		params.cursor,
	);

	return {
		productSkus: items,
		pagination,
		representativeSkuId: representative?.id ?? null,
	};
}
