"use server";

import { auth } from "@/modules/auth/lib/auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, unauthorized, validateInput, safeFormGet } from "@/shared/lib/actions";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { signInSocialSchema } from "../schemas/auth.schemas";

export const signInSocial = async (_: unknown, formData: FormData): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Vérifier si l'utilisateur est déjà connecté
		const session = await auth.api.getSession({ headers: headersList });
		if (session?.user.id) {
			return unauthorized("Vous êtes déjà connecté");
		}

		// Rate-limit OAuth signin attempts (mirror /sign-in/email LOGIN limit) —
		// protège contre énumération via account-linking et DoS vers le provider.
		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.LOGIN);
		if ("error" in rateLimit) return rateLimit.error;

		// Validation des données
		const rawData = {
			provider: safeFormGet(formData, "provider"),
			callbackURL: safeFormGet(formData, "callbackURL") ?? "/",
		};

		const validation = validateInput(signInSocialSchema, rawData);
		if ("error" in validation) return validation.error;

		const { provider, callbackURL } = validation.data;

		const response = await auth.api.signInSocial({
			body: { provider, callbackURL },
		});

		if (!response.url) {
			return error("URL de redirection manquante");
		}

		redirect(response.url);
	} catch (err) {
		unstable_rethrow(err);

		// Message générique pour éviter l'exposition d'erreurs techniques
		return error("Une erreur est survenue lors de la connexion. Veuillez réessayer.");
	}
};
