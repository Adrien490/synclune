"use server";

import { auth } from "@/modules/auth/lib/auth";
import {
	enforceRateLimitForCurrentUser,
	getRateLimitId,
} from "@/modules/auth/lib/rate-limit-helpers";
import { handleActionError, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import { logger } from "@/shared/lib/logger";
import { checkRateLimit } from "@/shared/lib/rate-limit";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { resendVerificationEmailSchema } from "../schemas/auth.schemas";

const GENERIC_SUCCESS_MESSAGE =
	"Si cet email est enregistré et non vérifié, tu recevras un nouveau lien de vérification.";

export const resendVerificationEmail = async (
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> => {
	try {
		// 1. Rate limit par IP/user (5/h) — limite l'attaquant qui spam le formulaire
		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.EMAIL_VERIFICATION);
		if ("error" in rateLimit) return rateLimit.error;

		// Validation des données
		const rawData = {
			email: safeFormGet(formData, "email"),
		};

		const validation = validateInput(resendVerificationEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		const { email } = validation.data;

		// 2. Rate limit par email-cible (5/h) — empêche le mail bombing d'une victime
		// via rotation d'IP (Tor, botnet), que le compteur IP ci-dessus ne voit pas.
		// Symétrique de `request-password-reset.ts` : sans lui, l'unique adresse admin
		// était bombardable sans plafond, aux frais Resend et de la réputation d'envoi.
		// Réponse générique pour ne PAS révéler que l'email existe ou est sous attaque.
		// ⚠️ Le 3ᵉ argument n'est pas optionnel en pratique : l'extraction automatique de
		// l'IP ne marche que sur un identifiant préfixé `ip:`. Sans lui, `effectiveIp`
		// vaut `null` et whitelist, blacklist ET plafond global 100/min/IP sont inertes
		// pour cet appel — le motif corrigé le 2026-07-31 sur les routes PDF.
		const { ipAddress } = await getRateLimitId();
		const emailKey = `verification-email:${email.toLowerCase().trim()}`;
		const emailCheck = await checkRateLimit(emailKey, AUTH_LIMITS.EMAIL_VERIFICATION, ipAddress);
		if (!emailCheck.success) {
			return success(GENERIC_SUCCESS_MESSAGE);
		}

		try {
			await auth.api.sendVerificationEmail({
				body: {
					email,
					callbackURL: buildUrl(ROUTES.AUTH.VERIFY_EMAIL),
				},
			});

			// Plus d'invalidation de `auth-verifications-list` : ses deux lecteurs
			// (`get-verifications.ts` / `get-verification.ts`) sont partis avec
			// l'espace client le 2026-07-31. Le tag n'a plus personne à rafraîchir.

			// Toujours retourner succès pour ne pas révéler si l'email existe
			return success(GENERIC_SUCCESS_MESSAGE);
		} catch (err) {
			// Même en cas d'erreur, succès pour ne pas révéler d'information
			// (anti-énumération) — mais on logue l'erreur technique côté serveur.
			logger.error("Verification email resend failed", err, {
				service: "resendVerificationEmail",
			});
			return success(GENERIC_SUCCESS_MESSAGE);
		}
	} catch (err) {
		return handleActionError(err, "Une erreur inattendue est survenue", {
			service: "resendVerificationEmail",
		});
	}
};
