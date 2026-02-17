"use server";

import { auth } from "@/modules/auth/lib/auth";
import { error, unauthorized, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInEmailSchema } from "../schemas/auth.schemas";
import { checkArcjetProtection } from "../utils/arcjet-protection";

export const signInEmail = async (
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Protection Arcjet : Shield + Bot Detection + Rate Limiting
		const arcjetBlocked = await checkArcjetProtection("/auth/signin", headersList);
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
			callbackURL: formData.get("callbackURL") as string,
		};

		const validation = validateInput(signInEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email, password, callbackURL } = validation.data;

		// Better Auth lance une exception APIError en cas d'erreur d'authentification
		const response = await auth.api.signInEmail({
			body: { email, password, callbackURL },
			headers: headersList,
		});

		if (!response) {
			return error("Aucune réponse du service d'authentification");
		}

		// Redirection après connexion réussie
		redirect(callbackURL);
	} catch (err: unknown) {
		// Les erreurs de redirection Next.js doivent être propagées
		if (isRedirectError(err)) {
			throw err;
		}

		// Gestion des erreurs spécifiques de Better Auth
		if (err instanceof Error) {
			const errorMessage = err.message.toLowerCase();

			if (errorMessage.includes("invalid email or password")) {
				return unauthorized("Email ou mot de passe incorrect");
			}

			if (errorMessage.includes("email") && errorMessage.includes("not verified")) {
				return error(
					"EMAIL_NOT_VERIFIED"
				);
			}
		}

		return error("Une erreur est survenue lors de la connexion");
	}
};
