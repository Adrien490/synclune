"use server";

import { auth } from "@/modules/auth/lib/auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import {
	error,
	handleActionError,
	success,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { AUTH_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { changePasswordSchema } from "../schemas/auth.schemas";
import { checkPasswordBreached } from "../services/hibp.service";

export const changePassword = async (
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Verify authenticated user exists in DB (checks deletedAt: null + accountStatus = ACTIVE + suspendedAt = null)
		const authResult = await requireAuth();
		if ("error" in authResult) return authResult.error;
		const { user } = authResult;

		// Rate limit AFTER auth (3/h per user) — protège contre brute-force du
		// currentPassword sur session active volée. Le rate-limit après auth évite
		// aussi de consommer le bucket pour les requêtes non authentifiées.
		const rateLimit = await enforceRateLimitForCurrentUser(AUTH_LIMITS.PASSWORD_CHANGE);
		if ("error" in rateLimit) return rateLimit.error;

		// Check user has a credential account (not OAuth-only)
		const userWithAccounts = await prisma.user.findUnique({
			where: { id: user.id },
			select: {
				emailVerified: true,
				accounts: { select: { providerId: true } },
			},
		});

		if (!userWithAccounts) {
			return error("Utilisateur introuvable");
		}

		if (!userWithAccounts.emailVerified) {
			return error(
				"Ton email n'a pas été vérifié. Vérifie ta boîte mail avant de changer ton mot de passe.",
			);
		}

		const hasCredentialAccount = userWithAccounts.accounts.some(
			(account) => account.providerId === "credential",
		);
		if (!hasCredentialAccount) {
			const oauthProvider = userWithAccounts.accounts.find(
				(account) => account.providerId !== "credential",
			)?.providerId;
			const providerName = oauthProvider === "google" ? "Google" : oauthProvider;
			return error(
				`Votre compte utilise l'authentification ${providerName}. Vous ne pouvez pas définir de mot de passe pour ce type de compte.`,
			);
		}

		// Validate input
		const rawData = {
			currentPassword: safeFormGet(formData, "currentPassword"),
			newPassword: safeFormGet(formData, "newPassword"),
			confirmPassword: safeFormGet(formData, "confirmPassword"),
		};

		const validation = validateInput(changePasswordSchema, rawData);
		if ("error" in validation) return validation.error;

		const { currentPassword, newPassword } = validation.data;
		const revokeOtherSessions = formData.get("revokeOtherSessions") === "true";

		// Check new password against known breaches (HIBP k-anonymity)
		const breachCount = await checkPasswordBreached(newPassword);
		if (breachCount > 0) {
			return error(
				"Ce mot de passe a été compromis dans une fuite de données. Choisis-en un autre.",
			);
		}

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions },
				headers: headersList,
			});

			// Plus AUCUNE invalidation de cache ici, et c'est correct : les deux
			// familles de tags concernées (`auth-sessions-*` et `sessions-user-*`)
			// n'ont plus un seul lecteur depuis le retrait de l'espace client
			// (2026-07-31) — le fetcher `modules/auth/data/get-session.ts` et la page
			// détail utilisateur qui les posaient ont été supprimés. Invalider un tag
			// que personne ne pose ne rafraîchit rien ; ça donne juste l'illusion
			// d'une cascade. Better Auth révoque les sessions en base, ce qui suffit.

			return success(
				revokeOtherSessions
					? "Mot de passe changé avec succès. Toutes les autres sessions ont été déconnectées."
					: "Mot de passe changé avec succès",
			);
		} catch (err: unknown) {
			if (err instanceof Error) {
				if (err.message.includes("Invalid password") || err.message.includes("incorrect")) {
					return error("Le mot de passe actuel est incorrect");
				}
			}
			return handleActionError(err, "Une erreur est survenue lors du changement de mot de passe", {
				service: "changePassword",
			});
		}
	} catch (err) {
		return handleActionError(err, "Une erreur inattendue est survenue", {
			service: "changePassword",
		});
	}
};
