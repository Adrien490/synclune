import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";
import {
	GET_SESSIONS_DEFAULT_PER_PAGE,
	GET_SESSIONS_DEFAULT_SORT_BY,
	GET_SESSIONS_DEFAULT_SORT_ORDER,
	GET_SESSIONS_MAX_RESULTS_PER_PAGE,
	GET_SESSIONS_SORT_FIELDS,
} from "../constants/session.constants";

// ============================================================================
// GET SESSION SCHEMA
// ============================================================================

export const getSessionSchema = z.object({
	id: z.string().trim().min(1),
});

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

const MIN_DATE = new Date("2020-01-01");

const pastDateSchema = z.coerce
	.date()
	.min(MIN_DATE, "Date too old")
	.refine((d) => d <= new Date(), "Date cannot be in the future")
	.optional();

const dateSchema = z.coerce
	.date()
	.min(MIN_DATE, "Date too old")
	.optional();

export const sessionFiltersSchema = z
	.object({
		userId: optionalStringOrStringArraySchema,
		createdAfter: pastDateSchema,
		createdBefore: dateSchema,
		updatedAfter: pastDateSchema,
		updatedBefore: dateSchema,
		expiresAfter: dateSchema,
		expiresBefore: dateSchema,
		isExpired: z.boolean().optional(),
		isActive: z.boolean().optional(),
		ipAddress: optionalStringOrStringArraySchema,
		hasIpAddress: z.boolean().optional(),
		hasUserAgent: z.boolean().optional(),
	})
	.refine((data) => {
		if (data.createdAfter && data.createdBefore) {
			return data.createdAfter <= data.createdBefore;
		}
		return true;
	}, "createdAfter must be before or equal to createdBefore")
	.refine((data) => {
		if (data.updatedAfter && data.updatedBefore) {
			return data.updatedAfter <= data.updatedBefore;
		}
		return true;
	}, "updatedAfter must be before or equal to updatedBefore")
	.refine((data) => {
		if (data.expiresAfter && data.expiresBefore) {
			return data.expiresAfter <= data.expiresBefore;
		}
		return true;
	}, "expiresAfter must be before or equal to expiresBefore");

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const sessionSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_SESSIONS_SORT_FIELDS.includes(
			value as (typeof GET_SESSIONS_SORT_FIELDS)[number]
		)
		? value
		: GET_SESSIONS_DEFAULT_SORT_BY;
}, z.enum(GET_SESSIONS_SORT_FIELDS));

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getSessionsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_SESSIONS_DEFAULT_PER_PAGE, GET_SESSIONS_MAX_RESULTS_PER_PAGE),
	sortBy: sessionSortBySchema.default(GET_SESSIONS_DEFAULT_SORT_BY),
	sortOrder: z.enum(["asc", "desc"]).default(GET_SESSIONS_DEFAULT_SORT_ORDER),
	filters: sessionFiltersSchema.default({}),
});
