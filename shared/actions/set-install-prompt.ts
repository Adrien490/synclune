"use server";

import { success, handleActionError, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { installPromptActionSchema } from "@/shared/schemas/install-prompt.schema";
import { updateInstallPrompt } from "./update-install-prompt";

/**
 * Wrapper Server Action for useActionState.
 * Parses FormData with Zod, calls updateInstallPrompt.
 */
export async function setInstallPrompt(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const validation = validateInput(installPromptActionSchema, {
		action: formData.get("action"),
	});

	if ("error" in validation) {
		return validation.error;
	}

	try {
		const result = await updateInstallPrompt(validation.data);
		return success("OK", result);
	} catch (e) {
		return handleActionError(e, "Erreur install prompt");
	}
}
