import { z } from "zod";

// ============================================================================
// DASHBOARD DATE RANGE SCHEMA
// ============================================================================

export const dashboardDateRangeSchema = z.object({
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
}).refine((data) => {
	if (data.startDate && data.endDate) {
		return data.startDate <= data.endDate;
	}
	return true;
}, "La date de début doit être antérieure ou égale à la date de fin");

// ============================================================================
// DASHBOARD PERIOD SCHEMA
// ============================================================================

export const dashboardPeriodSchema = z.enum([
	"today",
	"yesterday",
	"last7days",
	"last30days",
	"thisMonth",
	"lastMonth",
	"thisYear",
	"lastYear",
	"custom",
]).default("last30days");

// ============================================================================
// VAT BREAKDOWN SCHEMA
// ============================================================================

export const getVatBreakdownSchema = z.object({
	period: dashboardPeriodSchema.optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
});

// ============================================================================
// TOP PRODUCTS SCHEMA
// ============================================================================

export const getTopProductsSchema = z.object({
	limit: z.coerce.number().int().min(1).max(20).default(5),
	period: dashboardPeriodSchema.optional(),
});

// ============================================================================
// PAGINATION SCHEMA
// ============================================================================

export const paginationSchema = z.object({
	skip: z.coerce.number().int().min(0).default(0),
	take: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ============================================================================
// STOCK ALERTS SCHEMA
// ============================================================================

export const getStockAlertsSchema = z.object({
	skip: z.coerce.number().int().min(0).default(0),
	take: z.coerce.number().int().min(1).max(50).default(10),
	threshold: z.coerce.number().int().min(0).max(100).default(5),
});

// ============================================================================
// CONTACT ADRIEN SCHEMA
// ============================================================================

export const contactAdrienSchema = z.object({
	type: z.enum(["bug", "feature", "improvement", "question", "other"]),
	message: z
		.string()
		.min(10, "Le message doit contenir au moins 10 caractères")
		.max(5000, "Le message ne doit pas dépasser 5000 caractères"),
});

export type ContactAdrienInput = z.infer<typeof contactAdrienSchema>;

