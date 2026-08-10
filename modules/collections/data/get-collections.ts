import { logger } from "@/shared/lib/logger";
import { PublicationStatus, type Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { buildCursorPagination, processCursorResults } from "@/shared/lib/pagination";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
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
	// `isAdmin?: false` (littéral, pas `boolean`) : ce paramètre ne peut que baisser
	// le privilège — cf. la justification détaillée dans `products/data/get-products.ts`.
	options?: { isAdmin?: false },
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
					// `hasProducts` d'abord, à `undefined`, avant le spread : historiquement
					// le `.transform()` du schéma en faisait une propriété REQUISE (valeur
					// possiblement `undefined`), et un simple `{ ...filters, status }` omettait
					// la clé quand `filters` était absent. Le schéma est depuis passé à
					// `formBooleanSchema.optional()` (plus de transform), mais l'ordre reste
					// inoffensif et robuste à un retour en arrière du schéma.
					hasProducts: undefined,
					...validation.data.filters,
					status: PublicationStatus.PUBLIC,
				},
			};

	// Repli HORS du scope de cache. À l'intérieur, la page vide d'une panne était
	// mise en cache sous le profil `reference` (24 h revalidate / 7 j stale) : la
	// page /collections pouvait annoncer « aucune collection » jusqu'au lendemain,
	// sans rien qui la distingue d'une boutique réellement sans collection.
	try {
		return await fetchCollections(validatedParams);
	} catch (err) {
		// Lecture avortée à la clôture d'un prerender (build) : signal de contrôle
		// Next, le rendu est jeté — repli silencieux, pas un incident à logger.
		if (!isPrerenderInterrupt(err)) {
			logger.error("Failed to fetch collections", err, { service: "getCollections" });
		}

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

/**
 * Récupère les collections depuis la DB avec cache
 */
async function fetchCollections(params: GetCollectionsParams): Promise<GetCollectionsReturn> {
	"use cache";
	cacheCollections();

	// ⚠️ AUCUN try/catch ici : le repli appartient à `getCollections`, hors cache.
	{
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
	}
}
