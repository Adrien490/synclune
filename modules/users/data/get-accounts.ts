import { isAdmin } from "@/modules/auth/utils/guards";
import { Prisma } from "@/app/generated/prisma";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { cacheTag } from "next/cache";
import { z } from "zod";

import {
	GET_ACCOUNTS_DEFAULT_SELECT,
	GET_ACCOUNTS_DEFAULT_PER_PAGE,
	GET_ACCOUNTS_MAX_RESULTS_PER_PAGE,
	GET_ACCOUNTS_DEFAULT_SORT_ORDER,
	GET_ACCOUNTS_SORT_FIELDS,
} from "../constants/accounts.constants";
import {
	getAccountsSchema,
	accountFiltersSchema,
	accountSortBySchema,
} from "../schemas/accounts.schemas";
import type {
	GetAccountsReturn,
	GetAccountsParams,
} from "../types/accounts.types";
import { buildAccountsWhereClause } from "../utils/accounts-query-builder";

// Re-export pour compatibilité
export {
	GET_ACCOUNTS_DEFAULT_SELECT,
	GET_ACCOUNTS_DEFAULT_PER_PAGE,
	GET_ACCOUNTS_MAX_RESULTS_PER_PAGE,
	GET_ACCOUNTS_SORT_FIELDS,
} from "../constants/accounts.constants";
export {
	getAccountsSchema,
	accountFiltersSchema,
	accountSortBySchema,
} from "../schemas/accounts.schemas";
export type {
	GetAccountsReturn,
	GetAccountsParams,
} from "../types/accounts.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les comptes (admin uniquement)
 * SÉCURITÉ : tokens JAMAIS exposés, même en admin
 */
export async function getAccounts(
	params: GetAccountsParams
): Promise<GetAccountsReturn> {
	try {
		const admin = await isAdmin();

		if (!admin) {
			throw new Error("Admin access required");
		}

		const validation = getAccountsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters");
		}

		return await fetchAccounts(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}

/**
 * Récupère la liste des comptes avec pagination, tri et filtrage
 * Admin uniquement avec sécurité renforcée
 */
export async function fetchAccounts(
	params: GetAccountsParams
): Promise<GetAccountsReturn> {
	"use cache";
	cacheDashboard();
	cacheTag("accounts-list");

	const sortOrder = (params.sortOrder ||
		GET_ACCOUNTS_DEFAULT_SORT_ORDER) as Prisma.SortOrder;

	const take = Math.min(
		Math.max(1, params.perPage || GET_ACCOUNTS_DEFAULT_PER_PAGE),
		GET_ACCOUNTS_MAX_RESULTS_PER_PAGE
	);

	try {
		const where = buildAccountsWhereClause(params);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const orderBy: Prisma.AccountOrderByWithRelationInput[] = [
			{
				[params.sortBy]: sortOrder,
			} as Prisma.AccountOrderByWithRelationInput,
			...(params.sortBy !== "createdAt"
				? [{ createdAt: "desc" as const }]
				: []),
			{ id: "asc" },
		];

		const accountsRaw = await prisma.account.findMany({
			where,
			select: {
				...GET_ACCOUNTS_DEFAULT_SELECT,
				accessToken: true,
				refreshToken: true,
			},
			orderBy,
			...cursorConfig,
		});

		const now = new Date();
		const accountsWithSecurityFields = accountsRaw.map(
			(account: Prisma.AccountGetPayload<{
				select: typeof GET_ACCOUNTS_DEFAULT_SELECT & {
					accessToken: true;
					refreshToken: true;
				};
			}>) => {
				const { accessToken, refreshToken, ...accountWithoutTokens } = account;

				return {
					...accountWithoutTokens,
					hasAccessToken: !!accessToken,
					hasRefreshToken: !!refreshToken,
					isAccessTokenExpired: account.accessTokenExpiresAt
						? account.accessTokenExpiresAt < now
						: false,
					isRefreshTokenExpired: account.refreshTokenExpiresAt
						? account.refreshTokenExpiresAt < now
						: false,
				};
			}
		);

		const { items: accounts, pagination } = processCursorResults(
			accountsWithSecurityFields,
			take,
			params.direction,
			params.cursor
		);

		return {
			accounts: accounts as GetAccountsReturn["accounts"],
			pagination,
		};
	} catch (error) {
		const baseReturn = {
			accounts: [],
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
					: "Failed to fetch accounts",
		};

		return baseReturn as GetAccountsReturn & { error: string };
	}
}
