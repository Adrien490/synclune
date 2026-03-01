"use server";

import { auth } from "@/modules/auth/lib/auth";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { error, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import { sendPasswordChangedEmail } from "@/modules/emails/services/auth-emails";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { changePasswordSchema } from "../schemas/auth.schemas";
import { checkArcjetProtection } from "../utils/arcjet-protection";
import { checkPasswordBreached } from "../services/hibp.service";

export const changePassword = async (
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Protection Arcjet : Rate Limiting against brute-force on current password
		const arcjetBlocked = await checkArcjetProtection("/auth/change-password", headersList);
		if (arcjetBlocked) return arcjetBlocked;

		// Verify authenticated user exists in DB (checks deletedAt: null)
		const authResult = await requireAuth();
		if ("error" in authResult) return authResult.error;
		const { user } = authResult;

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
				"Votre email n'a pas été vérifié. Veuillez vérifier votre boîte mail avant de pouvoir changer votre mot de passe.",
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
				"Ce mot de passe a été compromis dans une fuite de données. Veuillez en choisir un autre.",
			);
		}

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions },
				headers: headersList,
			});

			// Send notification email (security)
			try {
				const changeDate = new Intl.DateTimeFormat("fr-FR", {
					dateStyle: "long",
					timeStyle: "short",
				}).format(new Date());

				await sendPasswordChangedEmail({
					to: user.email,
					userName: user.name ?? user.email,
					changeDate,
				});
			} catch {
				// Don't fail if email sending fails
			}

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
			return error("Une erreur est survenue lors du changement de mot de passe");
		}
	} catch {
		return error("Une erreur inattendue est survenue");
	}
};
