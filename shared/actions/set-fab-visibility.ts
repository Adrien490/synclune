"use server";

import {
	success,
	handleActionError,
	validateInput,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { toggleFabVisibility } from "./toggle-fab-visibility";
import { setFabVisibilitySchema } from "@/shared/schemas/fab-visibility.schema";

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
