import { z } from "zod";
import {
	cursorSchema,
	directionSchema,
} from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";
import { optionalStringOrStringArraySchema } from "@/shared/schemas/filters.schema";
import {
	GET_VERIFICATIONS_SORT_FIELDS,
	GET_VERIFICATIONS_DEFAULT_SORT_BY,
	GET_VERIFICATIONS_DEFAULT_PER_PAGE,
	GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE,
	GET_VERIFICATIONS_DEFAULT_SORT_ORDER,
} from "../constants/verification.constants";

// ============================================================================
// GET VERIFICATION SCHEMA (single)
// ============================================================================

export const getVerificationSchema = z.object({
	id: z.string().trim().min(1),
});

// ============================================================================
// GET VERIFICATIONS SCHEMA (list)
// ============================================================================

export const verificationFiltersSchema = z
	.object({
		identifier: optionalStringOrStringArraySchema,
		expiresBefore: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		expiresAfter: z.coerce
			.date()
			.min(new Date("2020-01-01"), "Date too old")
			.optional(),
		isExpired: z.boolean().optional(),
		isActive: z.boolean().optional(),
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
		if (data.expiresAfter && data.expiresBefore) {
			return data.expiresAfter <= data.expiresBefore;
		}
		return true;
	}, "expiresAfter must be before or equal to expiresBefore")
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

export const verificationSortBySchema = z.preprocess((value) => {
	return typeof value === "string" &&
		GET_VERIFICATIONS_SORT_FIELDS.includes(
			value as (typeof GET_VERIFICATIONS_SORT_FIELDS)[number]
		)
		? value
		: GET_VERIFICATIONS_DEFAULT_SORT_BY;
}, z.enum(GET_VERIFICATIONS_SORT_FIELDS));

export const getVerificationsSchema = z.object({
	cursor: cursorSchema,
	direction: directionSchema,
	perPage: createPerPageSchema(GET_VERIFICATIONS_DEFAULT_PER_PAGE, GET_VERIFICATIONS_MAX_RESULTS_PER_PAGE),
	sortBy: verificationSortBySchema.default(GET_VERIFICATIONS_DEFAULT_SORT_BY),
	sortOrder: z
		.enum(["asc", "desc"])
		.default(GET_VERIFICATIONS_DEFAULT_SORT_ORDER),
	filters: verificationFiltersSchema.default({}),
});
