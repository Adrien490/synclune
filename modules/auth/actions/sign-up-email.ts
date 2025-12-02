"use server";

import { auth } from "@/modules/auth/lib/auth";
import { error, success, unauthorized, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { signUpEmailSchema } from "../schemas/auth.schemas";
import { checkArcjetProtection } from "../utils/arcjet-protection";

export const signUpEmail = async (
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Protection Arcjet : Shield + Bot Detection + Rate Limiting
		const arcjetBlocked = await checkArcjetProtection("/auth/signup", headersList);
		if (arcjetBlocked) return arcjetBlocked;

		// Vérifier si l'utilisateur est déjà connecté
		const session = await auth.api.getSession({ headers: headersList });
		if (session?.user?.id) {
			return unauthorized("Vous êtes déjà connecté");
		}

		// Validation des données
		const rawData = {
			email: formData.get("email") as string,
			password: formData.get("password") as string,
			confirmPassword: formData.get("confirmPassword") as string,
			name: formData.get("name") as string,
		};

		const validation = validateInput(signUpEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email, password, name } = validation.data;

		try {
			const response = await auth.api.signUpEmail({
				body: { email, password, name },
			});

			if (!response) {
				return error("Une erreur est survenue lors de l'inscription");
			}

			return success(
				"Inscription réussie ! Un email de vérification vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte."
			);
		} catch {
			// Message générique pour éviter l'énumération d'emails
			return error(
				"Une erreur est survenue lors de l'inscription. Si cet email est déjà utilisé, essayez de vous connecter."
			);
		}
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : "Une erreur inattendue est survenue";
		return error(errorMessage);
	}
};
