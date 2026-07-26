"use server";

import { auth } from "@/modules/auth/lib/auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	error,
	handleActionError,
	success,
	unauthorized,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
import { LEGAL_TERMS_VERSION } from "@/shared/constants/legal-versions";
import { prisma } from "@/shared/lib/prisma";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { signUpEmailSchema } from "../schemas/auth.schemas";
import { checkPasswordBreached } from "../services/hibp.service";

export const signUpEmail = async (
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

		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.SIGNUP);
		if ("error" in rateLimit) return rateLimit.error;

		// Validation des données
		const rawData = {
			email: safeFormGet(formData, "email"),
			password: safeFormGet(formData, "password"),
			name: safeFormGet(formData, "name"),
			acceptTerms: safeFormGet(formData, "acceptTerms"),
		};

		const validation = validateInput(signUpEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email, password, name } = validation.data;

		// Check password against known breaches (HIBP k-anonymity)
		const breachCount = await checkPasswordBreached(password);
		if (breachCount > 0) {
			return error(
				"Ce mot de passe a été compromis dans une fuite de données. Veuillez en choisir un autre.",
			);
		}

		try {
			await auth.api.signUpEmail({
				body: { email, password, name },
			});

			// Record GDPR consent timestamp + document version for CGV + privacy
			// policy acceptance (accountability Art. 7 RGPD)
			await prisma.user.update({
				where: { email },
				data: { termsAcceptedAt: new Date(), termsVersion: LEGAL_TERMS_VERSION },
			});

			return success(
				"Inscription réussie ! Un email de vérification vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte.",
			);
		} catch (err) {
			// Message générique pour éviter l'énumération d'emails (handleActionError
			// logue l'erreur technique côté serveur sans la surfacer)
			return handleActionError(
				err,
				"Une erreur est survenue lors de l'inscription. Si cet email est déjà utilisé, essayez de vous connecter.",
				{ service: "signUpEmail" },
			);
		}
	} catch (err) {
		// Message generique pour eviter l'exposition d'erreurs techniques
		return handleActionError(err, "Une erreur inattendue est survenue. Veuillez réessayer.", {
			service: "signUpEmail",
		});
	}
};
