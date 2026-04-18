"use server";

import { auth } from "@/modules/auth/lib/auth";
import { error, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { requestPasswordResetSchema } from "../schemas/auth.schemas";

export const requestPasswordReset = async (
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> => {
	try {
		// Validation des données
		const rawData = {
			email: safeFormGet(formData, "email"),
		};

		const validation = validateInput(requestPasswordResetSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email } = validation.data;

		// Note: Ne PAS vérifier si l'utilisateur existe pour éviter l'énumération

		try {
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: "/reinitialiser-mot-de-passe" },
			});

			return success(
				"Si cet email existe dans notre base, vous recevrez un lien de réinitialisation.",
			);
		} catch {
			// Succès même en cas d'erreur pour ne pas révéler d'information
			return success(
				"Si cet email existe dans notre base, vous recevrez un lien de réinitialisation.",
			);
		}
	} catch {
		return error("Une erreur inattendue est survenue");
	}
};
