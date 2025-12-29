import { Prisma, PaymentStatus } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import {
	GET_USER_ORDERS_DEFAULT_PER_PAGE,
	GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
	GET_USER_ORDERS_SELECT,
} from "../constants/user-orders.constants";
import type { GetUserOrdersParams, GetUserOrdersReturn } from "../types/user-orders.types";

const getSortDirection = (sortBy: string): "asc" | "desc" => {
	if (sortBy.endsWith("-ascending")) return "asc";
	if (sortBy.endsWith("-descending")) return "desc";
	return "desc";
};

/**
 * Recupere les commandes d'un utilisateur depuis la DB avec use cache
 *
 * Utilise "use cache" pour:
 * - Isoler les donnees par utilisateur (pas de fuite)
 * - Permettre le prefetching runtime (stale >= 30s)
 * - Stockage cote client uniquement (securite)
 * - Invalidation lors de nouvelles commandes
 *
 * @param userId - ID de l'utilisateur
 * @param params - Parametres de pagination et tri
 * @returns Liste des commandes avec pagination
 */
export async function fetchUserOrders(
	userId: string,
	params: GetUserOrdersParams
): Promise<GetUserOrdersReturn> {
	"use cache: private";
	cacheLife("userOrders");
	cacheTag(`orders-user-${userId}`);

	try {
		const direction = getSortDirection(params.sortBy);

		// Construire le where clause avec le userId
		// UX CRITIQUE : N'afficher QUE les commandes payees aux clients
		// Les commandes PENDING/FAILED/CANCELLED sont des artefacts techniques
		// (reservations de stock) et ne doivent pas apparaitre dans "Mes commandes"
		const where: Prisma.OrderWhereInput = {
			userId,
			paymentStatus: PaymentStatus.PAID, // Seulement les commandes confirmees et payees
			deletedAt: null, // Soft delete: exclure les commandes supprimees
		};

		// Construire l'orderBy
		const orderBy: Prisma.OrderOrderByWithRelationInput[] =
			params.sortBy.startsWith("created-")
				? [{ createdAt: direction }, { id: "asc" }]
				: params.sortBy.startsWith("total-")
					? [{ total: direction }, { id: "asc" }]
					: [{ createdAt: "desc" }, { id: "asc" }];

		const take = Math.min(
			Math.max(1, params.perPage || GET_USER_ORDERS_DEFAULT_PER_PAGE),
			GET_USER_ORDERS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const orders = await prisma.order.findMany({
			where,
			select: GET_USER_ORDERS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			orders,
			take,
			params.direction,
			params.cursor
		);

		return {
			orders: items,
			pagination,
		};
	} catch {
		// En cas d'erreur, retourner un resultat vide
		return {
			orders: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}
}
