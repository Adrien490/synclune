import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import {
	GET_ACCOUNTS_DEFAULT_PER_PAGE,
	GET_ACCOUNTS_MAX_RESULTS_PER_PAGE,
	GET_ACCOUNTS_DEFAULT_SORT_BY,
	GET_ACCOUNTS_DEFAULT_SORT_ORDER,
	GET_ACCOUNTS_SORT_FIELDS,
} from "../constants/accounts.constants";

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
// GET ACCOUNT SCHEMA
// ============================================================================

export const getAccountSchema = z.object({
	id: z.string().trim().min(1),
});

// ============================================================================
// FILTERS SCHEMA
// ============================================================================

export const accountFiltersSchema = z
	.object({
		userId: stringOrStringArray,
		providerId: stringOrStringArray,
		accountId: stringOrStringArray,
		scope: stringOrStringArray,
		hasAccessToken: z.boolean().optional(),
		hasRefreshToken: z.boolean().optional(),
		hasPassword: z.boolean().optional(),
		accessTokenExpiresBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		accessTokenExpiresAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		refreshTokenExpiresBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		refreshTokenExpiresAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
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
	})
	.refine((data) => {
		if (data.accessTokenExpiresAfter && data.accessTokenExpiresBefore) {
			return data.accessTokenExpiresAfter <= data.accessTokenExpiresBefore;
		}
		return true;
	}, "accessTokenExpiresAfter must be before or equal to accessTokenExpiresBefore")
	.refine((data) => {
		if (data.refreshTokenExpiresAfter && data.refreshTokenExpiresBefore) {
			return data.refreshTokenExpiresAfter <= data.refreshTokenExpiresBefore;
		}
		return true;
	}, "refreshTokenExpiresAfter must be before or equal to refreshTokenExpiresBefore")
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
	}, "updatedAfter must be before or equal to updatedBefore");

// ============================================================================
// SORT SCHEMA
// ============================================================================

export const accountSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_ACCOUNTS_SORT_FIELDS.includes(
			value as (typeof GET_ACCOUNTS_SORT_FIELDS)[number]
		)
		? value
		: GET_ACCOUNTS_DEFAULT_SORT_BY;
}, z.enum(GET_ACCOUNTS_SORT_FIELDS));

// ============================================================================
// MAIN SCHEMA
// ============================================================================

export const getAccountsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_ACCOUNTS_DEFAULT_PER_PAGE, GET_ACCOUNTS_MAX_RESULTS_PER_PAGE),
	sortBy: accountSortBySchema.default(GET_ACCOUNTS_DEFAULT_SORT_BY),
	sortOrder: z.enum(["asc", "desc"]).default(GET_ACCOUNTS_DEFAULT_SORT_ORDER),
	filters: accountFiltersSchema.default({}),
});
