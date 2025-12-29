import { z } from "zod";

// ============================================================================
// DATE SCHEMAS
// ============================================================================

/**
 * Transforme une string ISO ou Date en Date valide
 * Retourne undefined si la valeur est invalide
 *
 * Utilise dans les filtres de date (orders, refunds, newsletter, reviews)
 */
export const stringOrDateSchema = z
	.union([z.string(), z.date()])
	.transform((val) => {
		if (val instanceof Date) return val;
		if (typeof val === "string") {
			const date = new Date(val);
			return isNaN(date.getTime()) ? undefined : date;
		}
		return undefined;
	})
	.optional();

/**
 * Type infere du schema stringOrDate
 */
export type StringOrDateInput = z.infer<typeof stringOrDateSchema>;
