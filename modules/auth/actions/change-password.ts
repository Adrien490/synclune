"use server";

import { auth } from "@/modules/auth/lib/auth";
import { error, notFound, success, unauthorized, validateInput } from "@/shared/lib/actions";
import { sendPasswordChangedEmail } from "@/shared/lib/email";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { changePasswordSchema } from "../schemas/change-password-schema";

export const changePassword = async (
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// Vérifier que l'utilisateur est connecté
		const session = await auth.api.getSession({ headers: headersList });
		if (!session?.user?.id) {
			return unauthorized("Vous devez être connecté pour changer votre mot de passe");
		}

		// Vérifier que l'utilisateur a un compte avec mot de passe (pas seulement OAuth)
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
			include: { accounts: { select: { providerId: true } } },
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		if (!user.emailVerified) {
			return error(
				"Votre email n'a pas été vérifié. Veuillez vérifier votre boîte mail avant de pouvoir changer votre mot de passe."
			);
		}

		const hasCredentialAccount = user.accounts.some((account) => account.providerId === "credential");
		if (!hasCredentialAccount) {
			const oauthProvider = user.accounts.find((account) => account.providerId !== "credential")?.providerId;
			const providerName = oauthProvider === "google" ? "Google" : oauthProvider;
			return error(
				`Votre compte utilise l'authentification ${providerName}. Vous ne pouvez pas définir de mot de passe pour ce type de compte.`
			);
		}

		// Validation des données
		const rawData = {
			currentPassword: formData.get("currentPassword") as string,
			newPassword: formData.get("newPassword") as string,
			confirmPassword: formData.get("confirmPassword") as string,
		};

		const validation = validateInput(changePasswordSchema, rawData);
		if ("error" in validation) return validation.error;

		const { currentPassword, newPassword } = validation.data;
		const revokeOtherSessions = formData.get("revokeOtherSessions") === "true";

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions },
				headers: headersList,
			});

			// Envoyer un email de notification (sécurité)
			try {
				const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0].trim();
				const changeDate = new Intl.DateTimeFormat("fr-FR", {
					dateStyle: "long",
					timeStyle: "short",
				}).format(new Date());

				await sendPasswordChangedEmail({
					to: session.user.email,
					userName: session.user.name,
					changeDate,
					ipAddress: ipAddress || undefined,
				});
			} catch {
				// Ne pas faire échouer si l'email ne part pas
			}

			return success(
				revokeOtherSessions
					? "Mot de passe changé avec succès. Toutes les autres sessions ont été déconnectées."
					: "Mot de passe changé avec succès"
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
