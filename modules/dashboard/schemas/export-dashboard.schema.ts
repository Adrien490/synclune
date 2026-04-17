import { z } from "zod";

export const EXPORT_DASHBOARD_FORMATS = ["csv", "json"] as const;
export type ExportDashboardFormat = (typeof EXPORT_DASHBOARD_FORMATS)[number];

export const exportDashboardSchema = z.object({
	period: z.enum(["7d", "30d", "month", "quarter", "year"], {
		message: "Période invalide",
	}),
	format: z.enum(EXPORT_DASHBOARD_FORMATS, { message: "Format invalide" }),
});

export type ExportDashboardInput = z.infer<typeof exportDashboardSchema>;
