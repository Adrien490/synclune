"use server";

import { auth } from "@/modules/auth/lib/auth";
import {
	enforceRateLimitForCurrentUser,
	getRateLimitId,
} from "@/modules/auth/lib/rate-limit-helpers";
import { handleActionError, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { requestPasswordResetSchema } from "../schemas/auth.schemas";

const GENERIC_SUCCESS_MESSAGE =
	"Si cet email existe dans notre base, tu recevras un lien de réinitialisation.";

export const requestPasswordReset = async (
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> => {
	try {
		// 1. Rate limit by IP/user (3/h) — limite l'attaquant qui spam le formulaire
		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.PASSWORD_RESET);
		if ("error" in rateLimit) return rateLimit.error;

		// 2. Validation des données
		const rawData = {
			email: safeFormGet(formData, "email"),
		};

		const validation = validateInput(requestPasswordResetSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email } = validation.data;

		// 3. Rate limit per email-target (3/h) — empêche le mail bombing d'une victime
		// via rotation d'IP (Tor, botnet). Identifier dédié, indépendant du RL IP/user.
		// Réponse générique pour ne PAS révéler que l'email existe ou est sous attaque.
		// ⚠️ Le 3ᵉ argument n'est pas optionnel en pratique : l'extraction automatique de
		// l'IP ne marche que sur un identifiant préfixé `ip:`. Sans lui, `effectiveIp`
		// vaut `null` et whitelist, blacklist ET plafond global 100/min/IP sont inertes
		// pour cet appel — le motif corrigé le 2026-07-31 sur les routes PDF.
		const { ipAddress } = await getRateLimitId();
		const emailKey = `password-reset-email:${email.toLowerCase().trim()}`;
		const emailCheck = await checkRateLimit(emailKey, AUTH_LIMITS.PASSWORD_RESET, ipAddress);
		if (!emailCheck.success) {
			return success(GENERIC_SUCCESS_MESSAGE);
		}

		// Note: Ne PAS vérifier si l'utilisateur existe pour éviter l'énumération

		try {
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: "/reinitialiser-mot-de-passe" },
			});

			// Plus d'invalidation de `auth-verifications-list` : la vue admin des
			// vérifications qui posait ce tag a disparu avec l'espace client
			// (2026-07-31). Invalider un tag que plus aucun lecteur ne pose, c'est
			// invalider dans le vide — et ça fait croire à une cascade qui n'existe
			// pas. Si une liste admin des vérifications revient, elle devra
			// réintroduire LES DEUX côtés (lecteur + mutateur).

			return success(GENERIC_SUCCESS_MESSAGE);
		} catch (err) {
			// Succès même en cas d'erreur pour ne pas révéler d'information
			// (anti-énumération) — mais on logue l'erreur technique côté serveur.
			logger.error("Password reset request failed", err, { service: "requestPasswordReset" });
			return success(GENERIC_SUCCESS_MESSAGE);
		}
	} catch (err) {
		return handleActionError(err, "Une erreur inattendue est survenue", {
			service: "requestPasswordReset",
		});
	}
};
