import { Prisma } from "@/app/generated/prisma/client";
import type {
	AccountFilters,
	GetAccountsInput,
} from "../schemas/accounts.schemas";

// ============================================================================
// ACCOUNTS QUERY BUILDER UTILS
// ============================================================================

export function buildAccountsFilterConditions(
	filters: AccountFilters
): Prisma.AccountWhereInput[] {
	const conditions: Prisma.AccountWhereInput[] = [];
	if (!filters) return conditions;

	if (filters.userId !== undefined) {
		const userIds = Array.isArray(filters.userId)
			? filters.userId
			: [filters.userId];
		conditions.push(
			userIds.length === 1
				? { userId: userIds[0] }
				: { userId: { in: userIds } }
		);
	}

	if (filters.providerId !== undefined) {
		const providerIds = Array.isArray(filters.providerId)
			? filters.providerId
			: [filters.providerId];
		conditions.push(
			providerIds.length === 1
				? { providerId: providerIds[0] }
				: { providerId: { in: providerIds } }
		);
	}

	if (filters.accountId !== undefined) {
		const accountIds = Array.isArray(filters.accountId)
			? filters.accountId
			: [filters.accountId];
		if (accountIds.length === 1) {
			conditions.push({
				accountId: {
					contains: accountIds[0],
					mode: Prisma.QueryMode.insensitive,
				},
			});
		} else {
			conditions.push({
				OR: accountIds.map((id) => ({
					accountId: { contains: id, mode: Prisma.QueryMode.insensitive },
				})),
			});
		}
	}

	if (filters.scope !== undefined) {
		const scopes = Array.isArray(filters.scope)
			? filters.scope
			: [filters.scope];
		if (scopes.length === 1) {
			conditions.push({
				scope: { contains: scopes[0], mode: Prisma.QueryMode.insensitive },
			});
		} else {
			conditions.push({
				OR: scopes.map((s) => ({
					scope: { contains: s, mode: Prisma.QueryMode.insensitive },
				})),
			});
		}
	}

	if (filters.hasAccessToken === true)
		conditions.push({ accessToken: { not: null } });
	else if (filters.hasAccessToken === false)
		conditions.push({ accessToken: null });

	if (filters.hasRefreshToken === true)
		conditions.push({ refreshToken: { not: null } });
	else if (filters.hasRefreshToken === false)
		conditions.push({ refreshToken: null });

	if (filters.hasPassword === true) conditions.push({ password: { not: null } });
	else if (filters.hasPassword === false) conditions.push({ password: null });

	if (filters.accessTokenExpiresBefore instanceof Date)
		conditions.push({
			accessTokenExpiresAt: { lte: filters.accessTokenExpiresBefore },
		});
	if (filters.accessTokenExpiresAfter instanceof Date)
		conditions.push({
			accessTokenExpiresAt: { gte: filters.accessTokenExpiresAfter },
		});
	if (filters.refreshTokenExpiresBefore instanceof Date)
		conditions.push({
			refreshTokenExpiresAt: { lte: filters.refreshTokenExpiresBefore },
		});
	if (filters.refreshTokenExpiresAfter instanceof Date)
		conditions.push({
			refreshTokenExpiresAt: { gte: filters.refreshTokenExpiresAfter },
		});
	if (filters.createdAfter instanceof Date)
		conditions.push({ createdAt: { gte: filters.createdAfter } });
	if (filters.createdBefore instanceof Date)
		conditions.push({ createdAt: { lte: filters.createdBefore } });
	if (filters.updatedAfter instanceof Date)
		conditions.push({ updatedAt: { gte: filters.updatedAfter } });
	if (filters.updatedBefore instanceof Date)
		conditions.push({ updatedAt: { lte: filters.updatedBefore } });

	return conditions;
}

export function buildAccountsWhereClause(
	params: GetAccountsInput
): Prisma.AccountWhereInput {
	const whereClause: Prisma.AccountWhereInput = {};
	const filterConditions = buildAccountsFilterConditions(params.filters ?? {});

	if (filterConditions.length > 0) {
		whereClause.AND = filterConditions;
	}

	return whereClause;
}
