import { isAdmin } from "@/modules/auth/utils/guards";
import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";
import { z } from "zod";
import {
	GET_VERIFICATIONS_DEFAULT_SELECT,
	GET_VERIFICATIONS_DEFAULT_PER_PAGE,
	GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE,
	GET_VERIFICATIONS_DEFAULT_SORT_ORDER,
} from "../constants/verification.constants";
import { getVerificationsSchema } from "../schemas/verification.schemas";
import type {
	GetVerificationsParams,
	GetVerificationsReturn,
} from "../types/verification.types";
import { buildVerificationWhereClause } from "../services/verification-query-builder";
import { cacheAuthVerifications } from "../utils/cache.utils";

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
async function fetchVerifications(
	params: GetVerificationsParams
): Promise<GetVerificationsReturn> {
	"use cache";
	cacheAuthVerifications();

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
