import { Prisma } from "@/app/generated/prisma/client";
import type { GetUsersParams, UserFilters } from "../types/user.types";

// ============================================================================
// USER QUERY BUILDER UTILS
// ============================================================================

export function buildUserFilterConditions(
	filters: UserFilters
): Prisma.UserWhereInput[] {
	const conditions: Prisma.UserWhereInput[] = [];

	if (!filters) {
		return conditions;
	}

	if (filters.name !== undefined) {
		const names = Array.isArray(filters.name) ? filters.name : [filters.name];
		if (names.length === 1) {
			conditions.push({
				name: {
					contains: names[0],
					mode: Prisma.QueryMode.insensitive,
				},
			});
		} else if (names.length > 1) {
			conditions.push({
				OR: names.map((name) => ({
					name: {
						contains: name,
						mode: Prisma.QueryMode.insensitive,
					},
				})),
			});
		}
	}

	if (filters.email !== undefined) {
		const emails = Array.isArray(filters.email)
			? filters.email
			: [filters.email];
		if (emails.length === 1) {
			conditions.push({
				email: {
					contains: emails[0],
					mode: Prisma.QueryMode.insensitive,
				},
			});
		} else if (emails.length > 1) {
			conditions.push({
				OR: emails.map((email) => ({
					email: {
						contains: email,
						mode: Prisma.QueryMode.insensitive,
					},
				})),
			});
		}
	}

	if (filters.role !== undefined) {
		const roles = Array.isArray(filters.role) ? filters.role : [filters.role];
		if (roles.length === 1) {
			conditions.push({ role: roles[0] });
		} else if (roles.length > 1) {
			conditions.push({ role: { in: roles } });
		}
	}

	if (typeof filters.emailVerified === "boolean") {
		conditions.push({ emailVerified: filters.emailVerified });
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

	if (filters.hasOrders === true) {
		conditions.push({ orders: { some: {} } });
	} else if (filters.hasOrders === false) {
		conditions.push({ orders: { none: {} } });
	}

	if (filters.hasSessions === true) {
		conditions.push({ sessions: { some: {} } });
	} else if (filters.hasSessions === false) {
		conditions.push({ sessions: { none: {} } });
	}

	return conditions;
}

export function buildUserWhereClause(
	params: GetUsersParams
): Prisma.UserWhereInput {
	const whereClause: Prisma.UserWhereInput = {};
	const andConditions: Prisma.UserWhereInput[] = [];
	const filters = params.filters ?? {};

	if (typeof params.search === "string" && params.search.trim()) {
		const searchTerm = params.search.trim();
		whereClause.OR = [
			{
				name: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
			{
				email: {
					contains: searchTerm,
					mode: Prisma.QueryMode.insensitive,
				},
			},
		];
	}

	const filterConditions = buildUserFilterConditions(filters);
	if (filterConditions.length > 0) {
		andConditions.push(...filterConditions);
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
