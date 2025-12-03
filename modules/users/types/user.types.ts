import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_USER_SELECT,
	GET_USERS_SELECT,
	GET_USERS_SORT_FIELDS,
} from "../constants/user.constants";
import {
	getUserSchema,
	getUsersSchema,
	userFiltersSchema,
} from "../schemas/user.schemas";

// ============================================================================
// TYPES - SINGLE USER
// ============================================================================

export type GetUserParams = z.infer<typeof getUserSchema>;

export type GetUserReturn = Prisma.UserGetPayload<{
	select: typeof GET_USER_SELECT;
}> | null;

// ============================================================================
// TYPES - USER LIST
// ============================================================================

export type UserFilters = z.infer<typeof userFiltersSchema>;

export type UserSortField = (typeof GET_USERS_SORT_FIELDS)[number];

export type GetUsersParams = z.infer<typeof getUsersSchema>;

export type GetUsersReturn = {
	users: Array<
		Prisma.UserGetPayload<{ select: typeof GET_USERS_SELECT }>
	>;
	pagination: PaginationInfo;
};

export type User = Prisma.UserGetPayload<{
	select: typeof GET_USERS_SELECT;
}>;

export type UserDetail = Prisma.UserGetPayload<{
	select: typeof GET_USER_SELECT;
}>;
