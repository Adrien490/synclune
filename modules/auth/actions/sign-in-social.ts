"use server";

import { auth } from "@/modules/auth/lib/auth";
import { checkArcjetProtection } from "@/modules/auth/utils/arcjet-protection";
import { error, unauthorized, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInSocialSchema } from "../schemas/auth.schemas";

export const signInSocial = async (
	_: unknown,
	formData: FormData
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Protection Arcjet contre le brute-force
		const arcjetResult = await checkArcjetProtection(
			"/sign-in/social",
			headersList
		);
		if (arcjetResult) return arcjetResult;

		// Vérifier si l'utilisateur est déjà connecté
		const session = await auth.api.getSession({ headers: headersList });
		if (session?.user?.id) {
			return unauthorized("Vous êtes déjà connecté");
		}

		// Validation des données
		const rawData = {
			provider: formData.get("provider") as string,
			callbackURL: (formData.get("callbackURL") as string) || "/",
		};

		const validation = validateInput(signInSocialSchema, rawData);
		if ("error" in validation) return validation.error;

		const { provider, callbackURL } = validation.data;

		const response = await auth.api.signInSocial({
			body: { provider, callbackURL },
		});

		if (!response?.url) {
			return error("URL de redirection manquante");
		}

		redirect(response.url);
	} catch (err) {
		if (isRedirectError(err)) {
			throw err;
		}

		const errorMessage = err instanceof Error ? err.message : "Une erreur inattendue est survenue";
		return error(errorMessage);
	}
};
