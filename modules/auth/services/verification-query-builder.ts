import { Prisma } from "@/app/generated/prisma/client";

// Types locaux pour éviter les dépendances circulaires
type VerificationFilters = {
	identifier?: string | string[];
	expiresBefore?: Date;
	expiresAfter?: Date;
	isExpired?: boolean;
	isActive?: boolean;
	createdAfter?: Date;
	createdBefore?: Date;
	updatedAfter?: Date;
	updatedBefore?: Date;
};

type GetVerificationsParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	filters?: VerificationFilters;
};

// ============================================================================
// VERIFICATION QUERY BUILDER UTILS
// ============================================================================

export function buildVerificationFilterConditions(
	filters: VerificationFilters
): Prisma.VerificationWhereInput[] {
	const conditions: Prisma.VerificationWhereInput[] = [];

	if (!filters) {
		return conditions;
	}

	if (filters.identifier !== undefined) {
		const identifiers = Array.isArray(filters.identifier)
			? filters.identifier
			: [filters.identifier];
		if (identifiers.length === 1) {
			conditions.push({
				identifier: {
					contains: identifiers[0],
					mode: Prisma.QueryMode.insensitive,
				},
			});
		} else if (identifiers.length > 1) {
			conditions.push({
				OR: identifiers.map((identifier) => ({
					identifier: {
						contains: identifier,
						mode: Prisma.QueryMode.insensitive,
					},
				})),
			});
		}
	}

	if (filters.expiresBefore instanceof Date) {
		conditions.push({
			expiresAt: {
				lte: filters.expiresBefore,
			},
		});
	}

	if (filters.expiresAfter instanceof Date) {
		conditions.push({
			expiresAt: {
				gte: filters.expiresAfter,
			},
		});
	}

	if (filters.isExpired === true) {
		conditions.push({
			expiresAt: {
				lt: new Date(),
			},
		});
	} else if (filters.isExpired === false) {
		conditions.push({
			expiresAt: {
				gte: new Date(),
			},
		});
	}

	if (filters.isActive === true) {
		conditions.push({
			expiresAt: {
				gt: new Date(),
			},
		});
	} else if (filters.isActive === false) {
		conditions.push({
			expiresAt: {
				lte: new Date(),
			},
		});
	}

	if (filters.createdAfter instanceof Date) {
		conditions.push({
			createdAt: {
				gte: filters.createdAfter,
			},
		});
	}

	if (filters.createdBefore instanceof Date) {
		conditions.push({
			createdAt: {
				lte: filters.createdBefore,
			},
		});
	}

	if (filters.updatedAfter instanceof Date) {
		conditions.push({
			updatedAt: {
				gte: filters.updatedAfter,
			},
		});
	}

	if (filters.updatedBefore instanceof Date) {
		conditions.push({
			updatedAt: {
				lte: filters.updatedBefore,
			},
		});
	}

	return conditions;
}

export function buildVerificationWhereClause(
	params: GetVerificationsParams
): Prisma.VerificationWhereInput {
	const whereClause: Prisma.VerificationWhereInput = {};
	const andConditions: Prisma.VerificationWhereInput[] = [];
	const filters = params.filters ?? {};

	const filterConditions = buildVerificationFilterConditions(filters);
	if (filterConditions.length > 0) {
		andConditions.push(...filterConditions);
	}

	if (andConditions.length > 0) {
		whereClause.AND = andConditions;
	}

	return whereClause;
}
