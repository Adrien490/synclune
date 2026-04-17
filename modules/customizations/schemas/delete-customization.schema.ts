import { z } from "zod";

export const deleteCustomizationSchema = z.object({
	requestId: z.cuid2("ID invalide"),
});

export const bulkDeleteCustomizationSchema = z.object({
	requestIds: z
		.array(z.cuid2("ID invalide"))
		.min(1, "Au moins une demande est requise")
		.max(100, "Maximum 100 demandes par opération"),
});

export type DeleteCustomizationInput = z.infer<typeof deleteCustomizationSchema>;
export type BulkDeleteCustomizationInput = z.infer<typeof bulkDeleteCustomizationSchema>;
