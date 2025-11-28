"use server";

import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { toggleContactAdrienVisibility } from "./toggle-contact-adrien-visibility";

/**
 * Action serveur pour définir la visibilité du bouton Contact Adrien
 *
 * Wrapper autour de toggleContactAdrienVisibility qui :
 * - Accepte FormData (compatible useActionState)
 * - Retourne ActionState (compatible withCallbacks)
 */
export async function setContactAdrienVisibility(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const isHidden = formData.get("isHidden") === "true";

	try {
		const result = await toggleContactAdrienVisibility(isHidden);

		return {
			status: ActionStatus.SUCCESS,
			message: result.isHidden ? "Bouton masqué" : "Bouton affiché",
			data: { isHidden: result.isHidden },
		};
	} catch {
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de la mise à jour",
		};
	}
}
