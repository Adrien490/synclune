import { logger } from "@/shared/lib/logger";
import { CollectionStatus, type Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";
import { getSortDirection } from "@/shared/utils/sort-direction";

import { cacheCollections } from "../utils/cache.utils";

import {
	GET_COLLECTIONS_DEFAULT_PER_PAGE,
	GET_COLLECTIONS_MAX_RESULTS_PER_PAGE,
	GET_COLLECTIONS_SELECT,
} from "../constants/collection.constants";
import { getCollectionsSchema } from "../schemas/collection.schemas";
import type { GetCollectionsParams, GetCollectionsReturn } from "../types/collection.types";
import { buildCollectionWhereClause } from "../services/collection-query-builder";

// Re-export pour compatibilité
export { GET_COLLECTIONS_DEFAULT_PER_PAGE } from "../constants/collection.constants";
export type { GetCollectionsParams, GetCollectionsReturn } from "../types/collection.types";

// Aliases pour compatibilité
export { COLLECTIONS_SORT_LABELS as SORT_LABELS } from "../constants/collection.constants";
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la liste des collections avec pagination.
 *
 * Sécurité : le statut est forcé à PUBLIC pour tout appelant non-admin, comme le fait
 * `getProducts`. Avant ça, la visibilité reposait entièrement sur la discipline des
 * appelants — les 6 appelants publics passaient bien `status: PUBLIC`, mais un septième
 * qui l'oublie publie les noms des collections DRAFT, et rien ne l'en empêchait.
 *
 * `options.isAdmin` permet à un appelant qui exécute déjà dans un scope `"use cache"`
 * (ex: `getNavbarMenuData`) de fournir le statut admin sans appeler `isAdmin()` ici —
 * `isAdmin()` lit `headers()`, une source dynamique interdite dans un scope cache.
 */
export async function getCollections(
	params: GetCollectionsParams,
	options?: { isAdmin?: boolean },
): Promise<GetCollectionsReturn> {
	const validation = getCollectionsSchema.safeParse(params);

	if (!validation.success) {
		return {
			collections: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
		};
	}

	const admin = options?.isAdmin ?? (await isAdmin());
	const validatedParams: GetCollectionsParams = admin
		? validation.data
		: {
				...validation.data,
				filters: {
					// `hasProducts` d'abord, à `undefined` : le `.transform()` du schéma en fait
					// une propriété REQUISE dont la valeur peut être `undefined`, pas une
					// propriété optionnelle. Un simple `{ ...filters, status }` omet donc la clé
					// quand `filters` est absent, et le type ne passe plus. Le spread qui suit
					// la réécrit dès qu'elle existe, et tout champ ajouté au schéma plus tard est
					// repris automatiquement.
					hasProducts: undefined,
					...validation.data.filters,
					status: CollectionStatus.PUBLIC,
				},
			};

	return fetchCollections(validatedParams);
}

/**
 * Récupère les collections depuis la DB avec cache
 */
async function fetchCollections(params: GetCollectionsParams): Promise<GetCollectionsReturn> {
	"use cache";
	cacheCollections();

	try {
		const where = buildCollectionWhereClause(params);
		const direction = getSortDirection(params.sortBy);

		const orderBy: Prisma.CollectionOrderByWithRelationInput[] = params.sortBy.startsWith("name-")
			? [{ name: direction }, { id: "asc" }]
			: params.sortBy.startsWith("created-")
				? [{ createdAt: direction }, { id: "asc" }]
				: params.sortBy.startsWith("products-")
					? [{ products: { _count: direction } }, { id: "asc" }]
					: [{ name: "asc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_COLLECTIONS_DEFAULT_PER_PAGE),
			GET_COLLECTIONS_MAX_RESULTS_PER_PAGE,
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const [collections, totalCount] = await Promise.all([
			prisma.collection.findMany({
				where,
				select: GET_COLLECTIONS_SELECT,
				orderBy,
				...cursorConfig,
			}),
			prisma.collection.count({ where }),
		]);

		const { items, pagination } = processCursorResults(
			collections,
			take,
			params.direction,
			params.cursor,
		);

		return { collections: items, pagination, totalCount };
	} catch (err) {
		logger.error("Failed to fetch collections", err, { service: "fetchCollections" });

		return {
			collections: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 0,
		};
	}
}
