import { getSession as getCurrentSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

import { GET_SESSION_SELECT } from "../constants/session.constants";
import { cacheAuthSession } from "../utils/cache.utils";
import { getSessionSchema } from "../schemas/session.schemas";
import type {
	GetSessionParams,
	GetSessionReturn,
	FetchSessionContext,
} from "../types/session.types";

// Re-export pour compatibilité
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

export async function getSession(
	params: Partial<GetSessionParams>,
): Promise<GetSessionReturn | null> {
	const validation = getSessionSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();
	const session = await getCurrentSession();

	if (!admin && !session?.user.id) {
		return null;
	}

	return fetchSession(validation.data, { admin, userId: session?.user.id });
}

export async function fetchSession(
	params: GetSessionParams,
	context: FetchSessionContext,
): Promise<GetSessionReturn | null> {
	// CACHE-AUDIT-001 : cache PRIVÉ. La clé `cacheAuthSession(params.id)` n'inclut
	// pas le contexte (admin vs user), or le WHERE en dépend (un admin ne filtre
	// pas par `userId`). En cache partagé, un résultat admin non-scopé pourrait
	// être servi à un user (IDOR-via-cache). `"use cache: private"` scope l'entrée
	// par requête/session et neutralise le risque.
	"use cache: private";
	cacheAuthSession(params.id);

	const where: { id: string; userId?: string } = {
		id: params.id,
	};

	if (!context.admin && context.userId) {
		where.userId = context.userId;
	}

	try {
		const result = await prisma.session.findFirst({
			where,
			select: GET_SESSION_SELECT,
		});

		if (!result) {
			return null;
		}

		const { token, ...rest } = result;

		return {
			...rest,
			tokenMasked: token ? `${token.slice(0, 4)}...${token.slice(-2)}` : null,
		};
	} catch (error) {
		logger.error("Failed to fetch session", error, { service: "fetchSession" });
		return null;
	}
}
