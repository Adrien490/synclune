import { Prisma } from "@/app/generated/prisma";
import { GET_LAST_ORDER_DEFAULT_SELECT } from "../constants/last-order.constants";

// ============================================================================
// TYPES - LAST ORDER
// ============================================================================

export type GetLastOrderReturn = Prisma.OrderGetPayload<{
	select: typeof GET_LAST_ORDER_DEFAULT_SELECT;
}> | null;
