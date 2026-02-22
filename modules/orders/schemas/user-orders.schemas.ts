import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_USER_ORDERS_DEFAULT_PER_PAGE,
	GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
	USER_ORDERS_SORT_OPTIONS,
} from "../constants/user-orders.constants";

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const userOrdersSortBySchema = z
	.enum([
		USER_ORDERS_SORT_OPTIONS.CREATED_DESC,
		USER_ORDERS_SORT_OPTIONS.CREATED_ASC,
		USER_ORDERS_SORT_OPTIONS.TOTAL_DESC,
		USER_ORDERS_SORT_OPTIONS.TOTAL_ASC,
	])
	.default(USER_ORDERS_SORT_OPTIONS.CREATED_DESC);

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getUserOrdersSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_USER_ORDERS_DEFAULT_PER_PAGE, GET_USER_ORDERS_MAX_RESULTS_PER_PAGE),
	sortBy: userOrdersSortBySchema,
	search: z.string().max(50).optional(),
});
