"use server";

import { auth } from "@/modules/auth/lib/auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, unauthorized, validateInput, safeFormGet } from "@/shared/lib/actions";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { AUTH_ERROR_CODES } from "../constants/error-messages";
import { signInEmailSchema } from "../schemas/auth.schemas";

export const signInEmail = async (
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Vérifier si l'utilisateur est déjà connecté
		const session = await auth.api.getSession({ headers: headersList });
		if (session?.user.id) {
			return unauthorized("Vous êtes déjà connecté");
		}

		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.LOGIN);
		if ("error" in rateLimit) return rateLimit.error;

		// Validation des données
		const rawData = {
			email: safeFormGet(formData, "email"),
			password: safeFormGet(formData, "password"),
			callbackURL: safeFormGet(formData, "callbackURL"),
		};

		const validation = validateInput(signInEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email, password, callbackURL } = validation.data;

		// Better Auth lance une exception APIError en cas d'erreur d'authentification
		const _response = await auth.api.signInEmail({
			body: { email, password, callbackURL },
			headers: headersList,
		});

		// Redirection après connexion réussie
		redirect(callbackURL);
	} catch (err: unknown) {
		// Les erreurs de redirection/notFound Next.js doivent être propagées
		unstable_rethrow(err);

		// Gestion des erreurs spécifiques de Better Auth
		if (err instanceof Error) {
			const errorMessage = err.message.toLowerCase();

			if (errorMessage.includes("invalid email or password")) {
				return unauthorized("Email ou mot de passe incorrect");
			}

			if (errorMessage.includes("email") && errorMessage.includes("not verified")) {
				return error(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
			}
		}

		return error("Une erreur est survenue lors de la connexion");
	}
};
