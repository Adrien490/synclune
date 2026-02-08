import { isAdmin } from "@/modules/auth/utils/guards";
import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { prisma } from "@/shared/lib/prisma";
import { z } from "zod";

import {
	GET_USERS_SELECT,
	GET_USERS_DEFAULT_PER_PAGE,
	GET_USERS_MAX_RESULTS_PER_PAGE,
	GET_USERS_DEFAULT_SORT_BY,
	GET_USERS_DEFAULT_SORT_ORDER,
	GET_USERS_ADMIN_FALLBACK_SORT_BY,
	GET_USERS_SORT_FIELDS,
} from "../constants/user.constants";
import {
	getUsersSchema,
	userFiltersSchema,
	userSortBySchema,
} from "../schemas/user.schemas";
import type { GetUsersParams, GetUsersReturn, User } from "../types/user.types";
import { buildUserWhereClause } from "../services/user-query-builder";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les utilisateurs (admin uniquement)
 */
export async function getUsers(
	params: GetUsersParams
): Promise<GetUsersReturn> {
	try {
		const admin = await isAdmin();

		if (!admin) {
			throw new Error("Admin access required");
		}

		const validation = getUsersSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters");
		}

		let validatedParams = validation.data;

		if (
			validatedParams.sortBy === GET_USERS_DEFAULT_SORT_BY &&
			!params?.sortBy
		) {
			validatedParams = {
				...validatedParams,
				sortBy: GET_USERS_ADMIN_FALLBACK_SORT_BY,
			};
		}

		return await fetchUsers(validatedParams);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}

/**
 * Récupère la liste des utilisateurs avec pagination, tri et filtrage
 * Accès admin uniquement
 */
async function fetchUsers(
	params: GetUsersParams
): Promise<GetUsersReturn> {
	"use cache";
	cacheDashboard(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);

	const sortOrder = (params.sortOrder ||
		GET_USERS_DEFAULT_SORT_ORDER) as Prisma.SortOrder;

	try {
		const where = buildUserWhereClause(params);

		const orderBy: Prisma.UserOrderByWithRelationInput[] = [
			{
				[params.sortBy]: sortOrder,
			} as Prisma.UserOrderByWithRelationInput,
			{ id: "asc" },
		];

		const take = Math.min(
			Math.max(1, params.perPage || GET_USERS_DEFAULT_PER_PAGE),
			GET_USERS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const users = await prisma.user.findMany({
			where,
			select: GET_USERS_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			users,
			take,
			params.direction,
			params.cursor
		);

		return {
			users: items,
			pagination,
		};
	} catch (error) {
		const baseReturn = {
			users: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			error:
				process.env.NODE_ENV === "development"
					? error instanceof Error
						? error.message
						: "Unknown error"
					: "Failed to fetch users",
		};

		return baseReturn as GetUsersReturn & { error: string };
	}
}
