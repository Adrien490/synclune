"use server";

import { auth } from "@/shared/lib/auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { resetPasswordSchema } from "../schemas/auth.schemas";

export const resetPassword = async (
	_: ActionState | null,
	formData: FormData
): Promise<ActionState> => {
	try {
		// Rate limiting géré par Better Auth (voir domains/auth/lib/auth.ts)
		// Validation des données
		const rawData = {
			password: formData.get("password") as string,
			confirmPassword: formData.get("confirmPassword") as string,
			token: formData.get("token") as string,
		};

		const validation = resetPasswordSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { password, token } = validation.data;

		// Appeler l'API Better Auth pour réinitialiser le mot de passe
		await auth.api.resetPassword({
			body: {
				newPassword: password,
				token,
			},
		});

		return {
			status: ActionStatus.SUCCESS,
			message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
		};
	} catch (error: unknown) {
		// Vérifier le type d'erreur
		if (error instanceof Error) {
			if (error.message.includes("Invalid token") || error.message.includes("expired")) {
				return {
					status: ActionStatus.ERROR,
					message: "Le lien de réinitialisation est invalide ou a expiré. Veuillez faire une nouvelle demande.",
				};
			}
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la réinitialisation du mot de passe",
		};
	}
};
