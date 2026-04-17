import { z } from "zod";

export const cancelCustomerSchema = z.object({
	requestId: z.cuid2("ID invalide"),
});

export type CancelCustomerInput = z.infer<typeof cancelCustomerSchema>;
