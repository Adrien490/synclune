import { getSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { Prisma } from "@/app/generated/prisma/client";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/lib/pagination";
import { prisma } from "@/shared/lib/prisma";

import {
	GET_SESSIONS_SELECT,
	GET_SESSIONS_DEFAULT_PER_PAGE,
	GET_SESSIONS_MAX_RESULTS_PER_PAGE,
	GET_SESSIONS_DEFAULT_SORT_BY,
	GET_SESSIONS_DEFAULT_SORT_ORDER,
	GET_SESSIONS_ADMIN_FALLBACK_SORT_BY,
	GET_SESSIONS_SORT_FIELDS,
} from "../constants/session.constants";
import { cacheAuthSessions } from "../utils/cache.utils";
import {
	getSessionsSchema,
	sessionFiltersSchema,
	sessionSortBySchema,
} from "../schemas/session.schemas";
import type { GetSessionsParams, GetSessionsReturn } from "../types/session.types";
import { buildSessionWhereClause } from "../services/session-query-builder";

// Re-export pour compatibilité
export {
	GET_SESSIONS_SELECT,
	GET_SESSIONS_DEFAULT_PER_PAGE,
	GET_SESSIONS_MAX_RESULTS_PER_PAGE,
	GET_SESSIONS_DEFAULT_SORT_BY,
	GET_SESSIONS_SORT_FIELDS,
} from "../constants/session.constants";
export {
	getSessionsSchema,
	sessionFiltersSchema,
	sessionSortBySchema,
} from "../schemas/session.schemas";
export type {
	GetSessionsParams,
	GetSessionsReturn,
	SessionFilters,
	Session,
} from "../types/session.types";

// ============================================================================
// UTILS
// ============================================================================

function maskToken(token: string): string | undefined {
	if (token.length <= 8) {
		return "***";
	}
	return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les sessions avec gestion des droits
 * - Admin : peut voir toutes les sessions
 * - User : ne voit que ses propres sessions
 * SÉCURITÉ : Token JAMAIS exposé en clair
 */
export async function getSessions(
	params: GetSessionsParams
): Promise<GetSessionsReturn> {
	const [admin, session] = await Promise.all([isAdmin(), getSession()]);

	if (!admin && !session?.user?.id) {
		throw new Error("Authentication required");
	}

	const validation = getSessionsSchema.safeParse(params);

	if (!validation.success) {
		throw new Error("Invalid parameters");
	}

	let validatedParams = validation.data;

	if (
		admin &&
		validatedParams.sortBy === GET_SESSIONS_DEFAULT_SORT_BY &&
		!params?.sortBy
	) {
		validatedParams = {
			...validatedParams,
			sortBy: GET_SESSIONS_ADMIN_FALLBACK_SORT_BY,
		};
	}

	// Non-admin users can only see their own sessions
	const userId = admin ? undefined : session!.user.id;

	return await fetchSessions(validatedParams, userId);
}

/**
 * Récupère la liste des sessions avec pagination, tri et filtrage
 * @param userId - If provided, restricts results to this user's sessions only
 */
async function fetchSessions(
	params: GetSessionsParams,
	userId?: string
): Promise<GetSessionsReturn> {
	"use cache";
	cacheAuthSessions();

	const sortOrder = (params.sortOrder ||
		GET_SESSIONS_DEFAULT_SORT_ORDER) as Prisma.SortOrder;

	try {
		const where = buildSessionWhereClause(params);

		// Scope to specific user for non-admin callers
		if (userId) {
			where.userId = userId;
		}

		const orderBy: Prisma.SessionOrderByWithRelationInput[] = [
			{
				[params.sortBy]: sortOrder,
			} as Prisma.SessionOrderByWithRelationInput,
			{ id: "asc" },
		];

		const take = Math.min(
			Math.max(1, params.perPage || GET_SESSIONS_DEFAULT_PER_PAGE),
			GET_SESSIONS_MAX_RESULTS_PER_PAGE
		);

		const cursorConfig = buildCursorPagination({
			cursor: params.cursor,
			direction: params.direction,
			take,
		});

		const sessionsRaw = await prisma.session.findMany({
			where,
			select: {
				...GET_SESSIONS_SELECT,
				token: true,
			},
			orderBy,
			...cursorConfig,
		});

		const { items: sessionsWithoutTransform, pagination } =
			processCursorResults(sessionsRaw, take, params.direction, params.cursor);

		const now = new Date();
		const sessions = sessionsWithoutTransform.map((session) => {
			const { token, ...sessionWithoutToken } = session;

			return {
				...sessionWithoutToken,
				tokenPreview: maskToken(token),
				isExpired: session.expiresAt < now,
				isActive: session.expiresAt > now,
			};
		});

		return {
			sessions,
			pagination,
		};
	} catch (error) {
		const baseReturn = {
			sessions: [],
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
					: "Failed to fetch sessions",
		};

		return baseReturn as GetSessionsReturn & { error: string };
	}
}
