import { Prisma } from "@/app/generated/prisma";
import { GET_CURRENT_USER_DEFAULT_SELECT } from "../constants/current-user.constants";

// ============================================================================
// TYPES - CURRENT USER
// ============================================================================

export type GetCurrentUserReturn = Prisma.UserGetPayload<{
	select: typeof GET_CURRENT_USER_DEFAULT_SELECT;
}> | null;

/**
 * Type pour l'utilisateur connecté (non-null)
 * @deprecated Use GetCurrentUserReturn instead
 */
export type CurrentUser = NonNullable<GetCurrentUserReturn>;
