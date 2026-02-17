import { z } from "zod";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";

export const bulkUpdateStatusSchema = z.object({
	requestIds: z.array(z.cuid2()).min(1, "Au moins une demande requise").max(100, "Maximum 100 demandes par operation"),
	status: z.nativeEnum(CustomizationRequestStatus),
});

export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;
