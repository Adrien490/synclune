"use server";

import { z } from "zod";
import {
	success,
	error,
	handleActionError,
	validateInput,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { toggleFabVisibility } from "./toggle-fab-visibility";
import { FAB_KEYS } from "@/shared/constants/fab";

/**
 * Schema de validation pour la visibilité FAB
 */
const setFabVisibilitySchema = z.object({
	key: z.enum([
		FAB_KEYS.CONTACT_ADRIEN,
		FAB_KEYS.ADMIN_SPEED_DIAL,
		FAB_KEYS.STOREFRONT,
		FAB_KEYS.ADMIN_DASHBOARD,
	]),
	isHidden: z.preprocess((v) => v === "true", z.boolean()),
});

/**
 * Wrapper Server Action pour useActionState
 * Parse les données du FormData et appelle toggleFabVisibility
 */
export async function setFabVisibility(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const validation = validateInput(setFabVisibilitySchema, {
		key: formData.get("key"),
		isHidden: formData.get("isHidden"),
	});

	if ("error" in validation) {
		return validation.error;
	}

	try {
		const { key, isHidden } = validation.data;
		const result = await toggleFabVisibility(key, isHidden);

		return success("Préférence enregistrée", { isHidden: result.isHidden });
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'enregistrement");
	}
}
