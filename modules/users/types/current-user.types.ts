import { Prisma } from "@/app/generated/prisma/client";
import { GET_CURRENT_USER_DEFAULT_SELECT } from "../constants/current-user.constants";

// ============================================================================
// TYPES - CURRENT USER
// ============================================================================

export type GetCurrentUserReturn = Prisma.UserGetPayload<{
	select: typeof GET_CURRENT_USER_DEFAULT_SELECT;
}> | null;
