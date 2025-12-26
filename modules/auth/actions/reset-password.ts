"use server";

import { auth } from "@/modules/auth/lib/auth";
import { error, success, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { resetPasswordSchema } from "../schemas/auth.schemas";
import { checkArcjetProtection } from "../utils/arcjet-protection";

export const resetPassword = async (
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Protection Arcjet : Shield + Bot Detection + Rate Limiting
		const arcjetBlocked = await checkArcjetProtection("/auth/reset-password", headersList);
		if (arcjetBlocked) return arcjetBlocked;

		// Validation des données
		const rawData = {
			password: formData.get("password") as string,
			confirmPassword: formData.get("confirmPassword") as string,
			token: formData.get("token") as string,
		};

		const validation = validateInput(resetPasswordSchema, rawData);
		if ("error" in validation) return validation.error;

		const { password, token } = validation.data;

		await auth.api.resetPassword({
			body: { newPassword: password, token },
		});

		return success(
			"Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter."
		);
	} catch (err: unknown) {
		if (err instanceof Error) {
			if (err.message.includes("Invalid token") || err.message.includes("expired")) {
				return error(
					"Le lien de réinitialisation est invalide ou a expiré. Veuillez faire une nouvelle demande."
				);
			}
		}
		return error("Une erreur est survenue lors de la réinitialisation du mot de passe");
	}
};
