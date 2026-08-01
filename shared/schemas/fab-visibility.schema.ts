import { z } from "zod";
import { FAB_KEYS } from "@/shared/constants/fab";
import { formBooleanSchema } from "@/shared/schemas/boolean.schema";

/**
 * Schema de validation pour la visibilité FAB
 * Utilisé par l'action setFabVisibility
 */
export const setFabVisibilitySchema = z.object({
	key: z.enum([FAB_KEYS.ADMIN_DASHBOARD]),
	// SSOT `formBooleanSchema`. Le `z.preprocess((v) => v === "true", …)` d'avant
	// coercait TOUT le reste — `undefined`, une faute de frappe, un `File` — en
	// `false` silencieux, au lieu de le rejeter. C'est exactement le piège que
	// `formBooleanSchema` a été créé pour fermer (cf. son en-tête).
	isHidden: formBooleanSchema,
});

type SetFabVisibilityInput = z.infer<typeof setFabVisibilitySchema>;
