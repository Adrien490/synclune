"use server";

import { auth } from "@/modules/auth/lib/auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { resendVerificationEmailSchema } from "../schemas/auth.schemas";

export const resendVerificationEmail = async (
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> => {
	try {
		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.EMAIL_VERIFICATION);
		if ("error" in rateLimit) return rateLimit.error;

		// Validation des données
		const rawData = {
			email: safeFormGet(formData, "email"),
		};

		const validation = validateInput(resendVerificationEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email } = validation.data;

		try {
			await auth.api.sendVerificationEmail({
				body: {
					email,
					callbackURL: buildUrl(ROUTES.AUTH.VERIFY_EMAIL),
				},
			});

			// Toujours retourner succès pour ne pas révéler si l'email existe
			return success(
				"Si cet email est enregistré et non vérifié, vous recevrez un nouveau lien de vérification.",
			);
		} catch {
			// Même en cas d'erreur, succès pour ne pas révéler d'information
			return success(
				"Si cet email est enregistré et non vérifié, vous recevrez un nouveau lien de vérification.",
			);
		}
	} catch {
		return error("Une erreur inattendue est survenue");
	}
};
