import { z } from "zod";
import {
	GET_SESSIONS_DEFAULT_PER_PAGE,
	GET_SESSIONS_DEFAULT_SORT_BY,
	GET_SESSIONS_DEFAULT_SORT_ORDER,
	GET_SESSIONS_MAX_RESULTS_PER_PAGE,
	GET_SESSIONS_SORT_FIELDS,
} from "../constants/session.constants";

// ============================================================================
// HELPERS
// ============================================================================

const stringOrStringArray = z
	.union([
		z.string().min(1).max(100),
		z.array(z.string().min(1).max(100)).max(50),
	])
	.optional();

// ============================================================================
// GET SESSION SCHEMA
// ============================================================================

export const getSessionSchema = z.object({
	id: z.string().trim().min(1),
});

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const sessionFiltersSchema = z
	.object({
		userId: stringOrStringArray,
		createdAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		createdBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		updatedAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.max(new Date(), "Date cannot be in the future")
			.optional(),
		updatedBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		expiresAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		expiresBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		isExpired: z.boolean().optional(),
		isActive: z.boolean().optional(),
		ipAddress: stringOrStringArray,
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
	cursor: z.cuid2().optional(),
	direction: z.enum(["forward", "backward"]).optional().default("forward"),
	perPage: z.coerce
		.number()
		.int({ message: "PerPage must be an integer" })
		.min(1, { message: "PerPage must be at least 1" })
		.max(
			GET_SESSIONS_MAX_RESULTS_PER_PAGE,
			`PerPage cannot exceed ${GET_SESSIONS_MAX_RESULTS_PER_PAGE}`
		)
		.default(GET_SESSIONS_DEFAULT_PER_PAGE),
	sortBy: sessionSortBySchema.default(GET_SESSIONS_DEFAULT_SORT_BY),
	sortOrder: z.enum(["asc", "desc"]).default(GET_SESSIONS_DEFAULT_SORT_ORDER),
	filters: sessionFiltersSchema.default({}),
});
