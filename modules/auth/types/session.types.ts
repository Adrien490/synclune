import { Prisma } from "@/app/generated/prisma";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_SESSION_SELECT,
	GET_SESSIONS_SELECT,
	GET_SESSIONS_SORT_FIELDS,
} from "../constants/session.constants";
import {
	getSessionSchema,
	getSessionsSchema,
	sessionFiltersSchema,
} from "../schemas/session.schemas";

// ============================================================================
// TYPES - SINGLE SESSION
// ============================================================================

export type GetSessionParams = z.infer<typeof getSessionSchema>;

type RawSessionResult = Prisma.SessionGetPayload<{
	select: typeof GET_SESSION_SELECT;
}>;

export type GetSessionReturn = Omit<RawSessionResult, "token"> & {
	tokenMasked: string | null;
};

export interface FetchSessionContext {
	admin: boolean;
	userId?: string;
}

// ============================================================================
// TYPES - SESSION LIST
// ============================================================================

export type SessionFilters = z.infer<typeof sessionFiltersSchema>;

export type SessionSortField = (typeof GET_SESSIONS_SORT_FIELDS)[number];

export type GetSessionsParams = z.infer<typeof getSessionsSchema>;

export type GetSessionsReturn = {
	sessions: Array<
		Prisma.SessionGetPayload<{ select: typeof GET_SESSIONS_SELECT }> & {
			tokenPreview?: string;
			isExpired: boolean;
			isActive: boolean;
		}
	>;
	pagination: PaginationInfo;
};

export type Session = Prisma.SessionGetPayload<{
	select: typeof GET_SESSIONS_SELECT;
}>;

// ============================================================================
// TYPES - USER SESSIONS
// ============================================================================

export type UserSession = {
	id: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
	expiresAt: Date;
	isCurrentSession: boolean;
	isExpired: boolean;
};

export type GetUserSessionsReturn = UserSession[];
