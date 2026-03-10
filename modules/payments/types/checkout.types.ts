import type { confirmCheckoutSchema } from "../schemas/checkout.schema";
import type { z } from "zod";

export type ConfirmCheckoutData = z.infer<typeof confirmCheckoutSchema>;
