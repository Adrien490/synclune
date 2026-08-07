"use server";

import { auth } from "@/modules/auth/lib/auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	unauthorized,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
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
			return unauthorized("Tu as déjà une session ouverte");
		}

		// Validation AVANT rate limit : un payload malformé n'est pas une tentative
		// de connexion. L'inverse consommait 1 des 5 essais / 15 min par IP à chaque
		// faute de frappe, jusqu'à verrouiller un utilisateur qui a le bon mot de
		// passe. La protection brute-force reste intacte : un payload valide (donc
		// toute tentative réelle) est toujours compté avant l'appel à Better Auth.
		const rawData = {
			email: safeFormGet(formData, "email"),
			password: safeFormGet(formData, "password"),
			callbackURL: safeFormGet(formData, "callbackURL"),
		};

		const validation = validateInput(signInEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.LOGIN);
		if ("error" in rateLimit) return rateLimit.error;

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

		return handleActionError(err, "Une erreur est survenue lors de la connexion", {
			service: "signInEmail",
		});
	}
};
