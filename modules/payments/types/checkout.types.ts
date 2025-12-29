import type { createCheckoutSessionSchema } from "../schemas/create-checkout-session-schema";
import type { z } from "zod";

export type CreateCheckoutSessionData = z.infer<typeof createCheckoutSessionSchema>;

export type CreateCheckoutSessionResult = {
	clientSecret: string;
	orderId: string;
	orderNumber: string;
};

// ============================================================================
// SHIPPING ZONE TYPES (re-exported from orders module)
// ============================================================================

// Re-export pour compatibilité - les types canoniques sont dans orders/utils/postal-zone.utils
export type { ShippingZone, ShippingZoneResult } from "@/modules/orders/utils/postal-zone.utils";
