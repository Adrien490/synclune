import { z } from "zod";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";

export const bulkUpdateStatusSchema = z.object({
	requestIds: z.array(z.cuid()).min(1, "Au moins une demande requise"),
	status: z.nativeEnum(CustomizationRequestStatus),
});

export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;
