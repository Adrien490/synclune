import { z } from "zod";
import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import { cursorSchema, directionSchema } from "@/shared/schemas/pagination-schema";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_ORDERS_DEFAULT_PER_PAGE,
	GET_ORDERS_DEFAULT_SORT_BY,
	GET_ORDERS_MAX_RESULTS_PER_PAGE,
	GET_ORDERS_SORT_FIELDS,
	ORDER_STATUSES,
} from "../constants/order.constants";

// ============================================================================
// LISTE ADMIN
// ============================================================================

const orderFiltersSchema = z.object({
	status: z.array(z.enum(ORDER_STATUSES)).optional(),
});

const orderSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_ORDERS_SORT_FIELDS.includes(value as (typeof GET_ORDERS_SORT_FIELDS)[number])
		? value
		: GET_ORDERS_DEFAULT_SORT_BY;
}, z.enum(GET_ORDERS_SORT_FIELDS));

export const getOrdersSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_ORDERS_DEFAULT_PER_PAGE, GET_ORDERS_MAX_RESULTS_PER_PAGE),
	sortBy: orderSortBySchema.default(GET_ORDERS_DEFAULT_SORT_BY),
	search: z.string().max(TEXT_LIMITS.SEARCH.max).optional(),
	filters: orderFiltersSchema.optional(),
});

export type GetOrdersParams = z.infer<typeof getOrdersSchema>;

// ============================================================================
// ACTIONS ADMIN
// ============================================================================

/**
 * « Marquer expédiée » : le numéro de suivi est saisi par Léane. Borné large
 * (les numéros transporteur font 11-15 caractères, on tolère les espaces et
 * tirets — `detectCarrierAndUrl` nettoie).
 */
export const markOrderAsShippedSchema = z.object({
	orderId: z.cuid2({ message: "ID commande invalide" }),
	trackingNumber: z
		.string()
		.trim()
		.min(4, "Le numéro de suivi est trop court.")
		.max(64, "Le numéro de suivi est trop long."),
});

export const cancelOrderSchema = z.object({
	orderId: z.cuid2({ message: "ID commande invalide" }),
});
