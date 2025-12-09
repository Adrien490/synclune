"use server";

import { success, error, handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { toggleFabVisibility } from "./toggle-fab-visibility";
import { FAB_KEYS, type FabKey } from "../constants";

/**
 * Wrapper Server Action pour useActionState
 * Parse les données du FormData et appelle toggleFabVisibility
 */
export async function setFabVisibility(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const key = formData.get("key") as FabKey;
		const isHidden = formData.get("isHidden") === "true";

		// Validation de la clé
		const validKeys = Object.values(FAB_KEYS);
		if (!validKeys.includes(key)) {
			return error("Clé FAB invalide");
		}

		const result = await toggleFabVisibility(key, isHidden);

		return success("Préférence enregistrée", { isHidden: result.isHidden });
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'enregistrement");
	}
}
