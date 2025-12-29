import { z } from "zod";
import { FAB_KEYS } from "@/shared/constants/fab";

/**
 * Schema de validation pour la visibilité FAB
 * Utilisé par l'action setFabVisibility
 */
export const setFabVisibilitySchema = z.object({
	key: z.enum([
		FAB_KEYS.ADMIN_SPEED_DIAL,
		FAB_KEYS.STOREFRONT,
		FAB_KEYS.ADMIN_DASHBOARD,
	]),
	isHidden: z.preprocess((v) => v === "true", z.boolean()),
});

export type SetFabVisibilityInput = z.infer<typeof setFabVisibilitySchema>;
