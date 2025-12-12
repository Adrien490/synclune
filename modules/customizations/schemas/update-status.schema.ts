import { z } from "zod";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";

export const updateStatusSchema = z.object({
	requestId: z.string().cuid(),
	status: z.nativeEnum(CustomizationRequestStatus),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
