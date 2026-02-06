"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import {
	validateInput,
	success,
	error,
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { auth } from "@/modules/auth/lib/auth";
import { adminUserIdSchema } from "../../schemas/user-admin.schemas";

/**
 * Server Action ADMIN pour envoyer un email de réinitialisation de mot de passe
 *
 * Permet à un admin d'envoyer un lien de réinitialisation à un utilisateur.
 */
export async function sendPasswordResetAdmin(userId: string): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.SEND_RESET);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2b. Validation du userId
		const validation = validateInput(adminUserIdSchema, { userId });
		if ("error" in validation) return validation.error;

		// 3. Récupérer l'utilisateur
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				accounts: {
					select: { providerId: true },
				},
			},
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		if (user.deletedAt) {
			return error("Impossible d'envoyer un email à un compte supprimé");
		}

		// 4. Vérifier que l'utilisateur a un compte credential
		const hasCredentialAccount = user.accounts.some(
			(account) => account.providerId === "credential"
		);

		if (!hasCredentialAccount) {
			const oauthProvider = user.accounts.find(
				(account) => account.providerId !== "credential"
			)?.providerId;
			const providerName = oauthProvider === "google" ? "Google" : oauthProvider;

			return error(
				`Cet utilisateur utilise uniquement l'authentification ${providerName}. Il n'a pas de mot de passe à réinitialiser.`
			);
		}

		// 5. Envoyer l'email de réinitialisation
		await auth.api.requestPasswordReset({
			body: {
				email: user.email,
				redirectTo: "/reinitialiser-mot-de-passe",
			},
		});

		const displayName = user.name || user.email;
		return success(`Email de réinitialisation envoyé à ${displayName}`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'envoi de l'email");
	}
}
