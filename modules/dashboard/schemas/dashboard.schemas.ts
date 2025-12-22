import { z } from "zod";

/**
 * Périodes disponibles pour le dashboard
 */
export const DASHBOARD_PERIODS = [
	"today",
	"week",
	"30d",
	"3m",
	"6m",
	"1y",
] as const;

/**
 * Schema pour le formulaire de contact Adrien
 */
export const contactAdrienSchema = z.object({
	message: z
		.string()
		.min(10, "Le message doit contenir au moins 10 caractères")
		.max(2000, "Le message ne doit pas dépasser 2000 caractères"),
});
