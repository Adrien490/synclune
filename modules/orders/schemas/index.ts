import { z } from "zod";
import {
	GET_USER_ORDERS_DEFAULT_PER_PAGE,
	GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
	USER_ORDERS_SORT_OPTIONS,
} from "../constants/user-orders.constants";

const sortBySchema = z
	.enum([
		USER_ORDERS_SORT_OPTIONS.CREATED_DESC,
		USER_ORDERS_SORT_OPTIONS.CREATED_ASC,
		USER_ORDERS_SORT_OPTIONS.TOTAL_DESC,
		USER_ORDERS_SORT_OPTIONS.TOTAL_ASC,
	])
	.default(USER_ORDERS_SORT_OPTIONS.CREATED_DESC);

export const getUserOrdersSchema = z.object({
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int({ message: "PerPage must be an integer" })
		.min(1, { message: "PerPage must be at least 1" })
		.max(
			GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
			`PerPage cannot exceed ${GET_USER_ORDERS_MAX_RESULTS_PER_PAGE}`
		)
		.default(GET_USER_ORDERS_DEFAULT_PER_PAGE),
	sortBy: sortBySchema,
});
