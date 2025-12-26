"use server";

import { auth } from "@/modules/auth/lib/auth";
import { checkArcjetProtection } from "@/modules/auth/utils/arcjet-protection";
import { error, success, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { resendVerificationEmailSchema } from "../schemas/auth.schemas";

export const resendVerificationEmail = async (
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> => {
	try {
		// Protection Arcjet (Shield + Bot Detection + Rate Limiting)
		const headersList = await headers();
		const arcjetBlocked = await checkArcjetProtection(
			"/send-verification-email",
			headersList
		);
		if (arcjetBlocked) return arcjetBlocked;

		// Validation des données
		const rawData = {
			email: formData.get("email") as string,
		};

		const validation = validateInput(resendVerificationEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email } = validation.data;

		try {
			await auth.api.sendVerificationEmail({
				body: {
					email,
					callbackURL: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"}/verifier-email`,
				},
			});

			// Toujours retourner succès pour ne pas révéler si l'email existe
			return success(
				"Si cet email est enregistré et non vérifié, vous recevrez un nouveau lien de vérification."
			);
		} catch {
			// Même en cas d'erreur, succès pour ne pas révéler d'information
			return success(
				"Si cet email est enregistré et non vérifié, vous recevrez un nouveau lien de vérification."
			);
		}
	} catch {
		return error("Une erreur inattendue est survenue");
	}
};
