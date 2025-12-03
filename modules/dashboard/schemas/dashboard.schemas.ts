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
// DASHBOARD FILTERS SCHEMA (avec validation période custom)
// ============================================================================

export const dashboardFiltersSchema = z.object({
	period: dashboardPeriodSchema,
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
}).refine(
	(data) => {
		// Si période "custom", les dates sont obligatoires
		if (data.period === "custom") {
			return data.startDate != null && data.endDate != null;
		}
		return true;
	},
	{ message: "Les dates de début et de fin sont requises pour une période personnalisée", path: ["startDate"] }
).refine(
	(data) => {
		// Validation que startDate <= endDate si les deux sont présentes
		if (data.startDate && data.endDate) {
			return data.startDate <= data.endDate;
		}
		return true;
	},
	{ message: "La date de début doit être antérieure ou égale à la date de fin", path: ["endDate"] }
);

export type DashboardFiltersInput = z.infer<typeof dashboardFiltersSchema>;

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
	message: z
		.string()
		.min(10, "Le message doit contenir au moins 10 caractères")
		.max(5000, "Le message ne doit pas dépasser 5000 caractères"),
});

export type ContactAdrienInput = z.infer<typeof contactAdrienSchema>;

