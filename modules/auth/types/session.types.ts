import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import {
	type GET_SESSION_SELECT,
	type GET_SESSIONS_SELECT,
	type GET_SESSIONS_SORT_FIELDS,
} from "../constants/session.constants";
import {
	type getSessionSchema,
	type getSessionsSchema,
	type sessionFiltersSchema,
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
