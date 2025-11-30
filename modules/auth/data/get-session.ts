import { getSession as getCurrentSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { z } from "zod";

import { GET_SESSION_SELECT } from "../constants/session.constants";
import { getSessionSchema } from "../schemas/session.schemas";
import type {
	GetSessionParams,
	GetSessionReturn,
	FetchSessionContext,
} from "../types/session.types";

// Re-export pour compatibilité
export { GET_SESSION_SELECT } from "../constants/session.constants";
export { getSessionSchema } from "../schemas/session.schemas";
export type {
	GetSessionParams,
	GetSessionReturn,
	FetchSessionContext,
} from "../types/session.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

export async function getSession(
	params: Partial<GetSessionParams>
): Promise<GetSessionReturn | null> {
	const validation = getSessionSchema.safeParse(params ?? {});

	if (!validation.success) {
		if (process.env.NODE_ENV !== "production") {
			// console.warn("getSession invalid params", validation.error.issues);
		}
		return null;
	}

	const admin = await isAdmin();
	const session = await getCurrentSession();

	if (!admin && !session?.user?.id) {
		return null;
	}

	return fetchSession(validation.data, { admin, userId: session?.user?.id });
}

export async function fetchSession(
	params: GetSessionParams,
	context: FetchSessionContext
): Promise<GetSessionReturn | null> {
	"use cache";
	cacheDashboard();

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
		if (process.env.NODE_ENV !== "production") {
			// console.error("fetchSession error:", error);
		}
		return null;
	}
}
