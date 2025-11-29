"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { auth } from "@/modules/auth/lib/auth";

/**
 * Server Action ADMIN pour envoyer un email de réinitialisation de mot de passe
 *
 * Permet à un admin d'envoyer un lien de réinitialisation à un utilisateur.
 */
export async function sendPasswordResetAdmin(userId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Récupérer l'utilisateur
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				accounts: {
					select: { providerId: true },
				},
			},
		});

		if (!user) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Utilisateur non trouvé",
			};
		}

		if (user.deletedAt) {
			return {
				status: ActionStatus.ERROR,
				message: "Impossible d'envoyer un email à un compte supprimé",
			};
		}

		// 3. Vérifier que l'utilisateur a un compte credential
		const hasCredentialAccount = user.accounts.some(
			(account) => account.providerId === "credential"
		);

		if (!hasCredentialAccount) {
			const oauthProvider = user.accounts.find(
				(account) => account.providerId !== "credential"
			)?.providerId;
			const providerName = oauthProvider === "google" ? "Google" : oauthProvider;

			return {
				status: ActionStatus.ERROR,
				message: `Cet utilisateur utilise uniquement l'authentification ${providerName}. Il n'a pas de mot de passe à réinitialiser.`,
			};
		}

		// 4. Envoyer l'email de réinitialisation
		await auth.api.requestPasswordReset({
			body: {
				email: user.email,
				redirectTo: "/reinitialiser-mot-de-passe",
			},
		});

		const displayName = user.name || user.email;
		return {
			status: ActionStatus.SUCCESS,
			message: `Email de réinitialisation envoyé à ${displayName}`,
		};
	} catch (error) {
		console.error("[SEND_PASSWORD_RESET_ADMIN] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de l'envoi de l'email",
		};
	}
}
