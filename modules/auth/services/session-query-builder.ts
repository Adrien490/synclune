import { Prisma } from "@/app/generated/prisma/client";
import type { GetSessionsParams, SessionFilters } from "../types/session.types";

// ============================================================================
// SESSION QUERY BUILDER UTILS
// ============================================================================

export function buildSessionFilterConditions(
	filters: SessionFilters
): Prisma.SessionWhereInput[] {
	const conditions: Prisma.SessionWhereInput[] = [];

	if (!filters) {
		return conditions;
	}

	if (filters.userId !== undefined) {
		const userIds = Array.isArray(filters.userId)
			? filters.userId
			: [filters.userId];
		if (userIds.length === 1) {
			conditions.push({ userId: userIds[0] });
		} else if (userIds.length > 1) {
			conditions.push({ userId: { in: userIds } });
		}
	}

	if (filters.ipAddress !== undefined) {
		const ipAddresses = Array.isArray(filters.ipAddress)
			? filters.ipAddress
			: [filters.ipAddress];
		if (ipAddresses.length === 1) {
			conditions.push({
				ipAddress: {
					contains: ipAddresses[0],
					mode: Prisma.QueryMode.insensitive,
				},
			});
		} else if (ipAddresses.length > 1) {
			conditions.push({
				OR: ipAddresses.map((ip) => ({
					ipAddress: {
						contains: ip,
						mode: Prisma.QueryMode.insensitive,
					},
				})),
			});
		}
	}

	if (filters.hasIpAddress === true) {
		conditions.push({ ipAddress: { not: null } });
	} else if (filters.hasIpAddress === false) {
		conditions.push({ ipAddress: null });
	}

	if (filters.hasUserAgent === true) {
		conditions.push({ userAgent: { not: null } });
	} else if (filters.hasUserAgent === false) {
		conditions.push({ userAgent: null });
	}

	if (filters.expiresAfter instanceof Date) {
		conditions.push({ expiresAt: { gte: filters.expiresAfter } });
	}

	if (filters.expiresBefore instanceof Date) {
		conditions.push({ expiresAt: { lte: filters.expiresBefore } });
	}

	if (filters.isExpired === true) {
		conditions.push({ expiresAt: { lt: new Date() } });
	} else if (filters.isExpired === false) {
		conditions.push({ expiresAt: { gte: new Date() } });
	}

	if (filters.isActive === true) {
		conditions.push({ expiresAt: { gt: new Date() } });
	} else if (filters.isActive === false) {
		conditions.push({ expiresAt: { lte: new Date() } });
	}

	if (filters.createdAfter instanceof Date) {
		conditions.push({ createdAt: { gte: filters.createdAfter } });
	}

	if (filters.createdBefore instanceof Date) {
		conditions.push({ createdAt: { lte: filters.createdBefore } });
	}

	if (filters.updatedAfter instanceof Date) {
		conditions.push({ updatedAt: { gte: filters.updatedAfter } });
	}

	if (filters.updatedBefore instanceof Date) {
		conditions.push({ updatedAt: { lte: filters.updatedBefore } });
	}

	return conditions;
}

export function buildSessionWhereClause(
	params: GetSessionsParams
): Prisma.SessionWhereInput {
	const whereClause: Prisma.SessionWhereInput = {};
	const andConditions: Prisma.SessionWhereInput[] = [];
	const filters = params.filters ?? {};

	const filterConditions = buildSessionFilterConditions(filters);
	if (filterConditions.length > 0) {
		andConditions.push(...filterConditions);
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
