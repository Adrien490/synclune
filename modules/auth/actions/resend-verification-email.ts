"use server";

import { auth } from "@/modules/auth/lib/auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { resendVerificationEmailSchema } from "../schemas/auth.schemas";

export const resendVerificationEmail = async (
	_: ActionState | null,
	formData: FormData
): Promise<ActionState> => {
	try {
		// Rate limiting géré par Better Auth (voir domains/auth/lib/auth.ts)
		// Validation des données
		const rawData = {
			email: formData.get("email") as string,
		};

		const validation = resendVerificationEmailSchema.safeParse(rawData);
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Email invalide",
			};
		}

		const { email } = validation.data;

		// 3. Appeler l'API Better Auth pour renvoyer l'email
		try {
			await auth.api.sendVerificationEmail({
				body: {
					email,
					callbackURL: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"}/verifier-email`,
				},
			});

			// Toujours retourner un succès pour ne pas révéler si un email existe
			return {
				status: ActionStatus.SUCCESS,
				message:
					"Si cet email est enregistré et non vérifié, vous recevrez un nouveau lien de vérification.",
			};
		} catch (error) {
			// Même en cas d'erreur, on retourne un succès pour ne pas révéler d'information
			return {
				status: ActionStatus.SUCCESS,
				message:
					"Si cet email est enregistré et non vérifié, vous recevrez un nouveau lien de vérification.",
			};
		}
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur inattendue est survenue",
		};
	}
};
