import type { createCheckoutSessionSchema } from "../schemas/create-checkout-session-schema";
import type { z } from "zod";

export type CreateCheckoutSessionData = z.infer<typeof createCheckoutSessionSchema>;

export type CreateCheckoutSessionResult = {
	clientSecret: string;
	orderId: string;
	orderNumber: string;
};