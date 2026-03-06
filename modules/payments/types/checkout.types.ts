import type { createCheckoutSessionSchema } from "../schemas/create-checkout-session-schema";
import type { z } from "zod";

export type CreateCheckoutSessionData = z.infer<typeof createCheckoutSessionSchema>;

export type CreateCheckoutSessionResult = {
	clientSecret: string;
	orderId: string;
	orderNumber: string;
};

export interface CheckoutFormValuesSnapshot {
	email?: string;
	shipping?: {
		fullName: string;
		addressLine1: string;
		addressLine2?: string;
		city: string;
		postalCode: string;
		country: string;
		phoneNumber: string;
	};
}
