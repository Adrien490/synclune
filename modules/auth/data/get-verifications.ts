import { isAdmin } from "@/shared/lib/guards";
import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
	PaginationInfo,
} from "@/shared/components/cursor-pagination/pagination";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { z } from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

const GET_VERIFICATIONS_DEFAULT_SELECT = {
	id: true,
	identifier: true,
	expiresAt: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.VerificationSelect;

const GET_VERIFICATIONS_DEFAULT_PER_PAGE = 50;
const GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE = 200;
const GET_VERIFICATIONS_DEFAULT_SORT_BY = "createdAt";
const GET_VERIFICATIONS_DEFAULT_SORT_ORDER = "desc";

export const GET_VERIFICATIONS_SORT_FIELDS = [
	"createdAt",
	"updatedAt",
	"expiresAt",
] as const;

const GET_VERIFICATIONS_DEFAULT_CACHE = {
	revalidate: 60 * 2,
	stale: 60 * 5,
	expire: 60 * 10,
} as const;

// ============================================================================
// SCHEMAS
// ============================================================================

const stringOrStringArray = z
	.union([
		z.string().min(1).max(100),
		z.array(z.string().min(1).max(100)).max(50),
	])
	.optional();

export const verificationFiltersSchema = z
	.object({
		identifier: stringOrStringArray,
		expiresBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		expiresAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		isExpired: z.boolean().optional(),
		isActive: z.boolean().optional(),
		createdAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		createdBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		updatedAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		updatedBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
	})
	.refine((data) => {
		if (data.expiresAfter && data.expiresBefore) {
			return data.expiresAfter <= data.expiresBefore;
		}
		return true;
	}, "expiresAfter must be before or equal to expiresBefore")
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	}, "createdAfter must be before or equal to createdBefore")
	.refine((data) => {
		if (data.updatedAfter && data.updatedBefore) {
			return data.updatedAfter <= data.updatedBefore;
		}
		return true;
	}, "updatedAfter must be before or equal to updatedBefore");

export const verificationSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_VERIFICATIONS_SORT_FIELDS.includes(
			value as (typeof GET_VERIFICATIONS_SORT_FIELDS)[number]
		)
		? value
		: GET_VERIFICATIONS_DEFAULT_SORT_BY;
}, z.enum(GET_VERIFICATIONS_SORT_FIELDS));

export const getVerificationsSchema = z.object({
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int({ message: "PerPage must be an integer" })
		.min(1, { message: "PerPage must be at least 1" })
		.max(
			GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE,
			`PerPage cannot exceed ${GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE}`
		)
		.default(GET_VERIFICATIONS_DEFAULT_PER_PAGE),
	sortBy: verificationSortBySchema.default(GET_VERIFICATIONS_DEFAULT_SORT_BY),
	sortOrder: z
		.enum(["asc", "desc"])
		.default(GET_VERIFICATIONS_DEFAULT_SORT_ORDER),
	filters: verificationFiltersSchema.default({}),
});

// ============================================================================
// TYPES
// ============================================================================

export type GetVerificationsReturn = {
	verifications: Array<
		Prisma.VerificationGetPayload<{
			select: typeof GET_VERIFICATIONS_DEFAULT_SELECT;
		}> & {
			valuePreview: string;
			isExpired: boolean;
		}
	>;
	pagination: PaginationInfo;
};

export type GetVerificationsParams = z.infer<typeof getVerificationsSchema>;

import { buildVerificationWhereClause } from "../utils/verification-query-builder";

// ============================================================================
// UTILS
// ============================================================================

function maskValue(value: string): string {
	if (value.length <= 4) {
		return "***";
	}
	return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les vérifications (admin uniquement)
 * SÉCURITÉ : value JAMAIS exposé, même en admin
 */
export async function getVerifications(
	params: GetVerificationsParams
): Promise<GetVerificationsReturn> {
	try {
		const admin = await isAdmin();

		if (!admin) {
			throw new Error("Admin access required");
		}

		const validation = getVerificationsSchema.safeParse(params);

		if (!validation.success) {
			throw new Error("Invalid parameters");
		}

		return await fetchVerifications(validation.data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new Error("Invalid parameters");
		}

		throw error;
	}
}

/**
 * Récupère la liste des vérifications avec pagination, tri et filtrage
 * Admin uniquement avec sécurité renforcée
 */
export async function fetchVerifications(
	params: GetVerificationsParams
): Promise<GetVerificationsReturn> {
	"use cache";
	cacheDashboard();

	const sortOrder = (params.sortOrder ||
		GET_VERIFICATIONS_DEFAULT_SORT_ORDER) as Prisma.SortOrder;

	try {
		const where = buildVerificationWhereClause(params);

		const orderBy: Prisma.VerificationOrderByWithRelationInput[] = [
			{
				[params.sortBy]: sortOrder,
			} as Prisma.VerificationOrderByWithRelationInput,
			{ id: "asc" },
		];

		const take = Math.min(
			Math.max(1, params.perPage || GET_VERIFICATIONS_DEFAULT_PER_PAGE),
			GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const verificationsRaw = await prisma.verification.findMany({
			where,
			select: {
				...GET_VERIFICATIONS_DEFAULT_SELECT,
				value: true,
			},
			orderBy,
			...cursorConfig,
		});

		const { items: verificationsWithoutTransform, pagination } =
			processCursorResults(
				verificationsRaw,
				take,
				params.direction,
				params.cursor
			);

		const now = new Date();
		const verifications = verificationsWithoutTransform.map((verification) => {
			const { value, ...verificationWithoutValue } = verification;

			return {
				...verificationWithoutValue,
				valuePreview: maskValue(value),
				isExpired: verification.expiresAt < now,
			};
		});

		return {
			verifications,
			pagination,
		};
	} catch (error) {
		const baseReturn = {
			verifications: [],
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
					: "Failed to fetch verifications",
		};

		return baseReturn as GetVerificationsReturn & { error: string };
	}
}
