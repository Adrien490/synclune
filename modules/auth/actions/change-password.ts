"use server";

import { auth } from "@/modules/auth/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { sendPasswordChangedEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { changePasswordSchema } from "../schemas/change-password-schema";

export const changePassword = async (
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> => {
	try {
		// 1. Vérifier que l'utilisateur est connecté
		const headersList = await headers();
		const session = await auth.api.getSession({
			headers: headersList,
		});

		if (!session?.user?.id) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour changer votre mot de passe",
			};
		}

		// 2. Vérifier que l'utilisateur a un compte avec mot de passe (pas seulement OAuth)
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
			include: {
				accounts: {
					select: { providerId: true },
				},
			},
		});

		if (!user) {
			return {
				status: ActionStatus.ERROR,
				message: "Utilisateur non trouvé",
			};
		}

		// 2.1 Vérifier que l'email est vérifié (bonne pratique de sécurité)
		if (!user.emailVerified) {
			return {
				status: ActionStatus.ERROR,
				message: "Votre email n'a pas été vérifié. Veuillez vérifier votre boîte mail ou renvoyer l'email de vérification avant de pouvoir changer votre mot de passe.",
			};
		}

		// Vérifier si l'utilisateur a un compte credential (email/password)
		const hasCredentialAccount = user.accounts.some((account) => account.providerId === "credential");

		if (!hasCredentialAccount) {
			const oauthProvider = user.accounts.find((account) => account.providerId !== "credential")?.providerId;
			const providerName = oauthProvider === "google" ? "Google" : oauthProvider;

			return {
				status: ActionStatus.ERROR,
				message: `Votre compte utilise l'authentification ${providerName}. Vous ne pouvez pas définir de mot de passe pour ce type de compte.`,
			};
		}

		// Rate limiting géré par Better Auth (voir domains/auth/lib/auth.ts)
		// Récupérer l'IP pour logging sécurité
		const ipAddress = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

		// 3. Validation des données
		const rawData = {
			currentPassword: formData.get("currentPassword") as string,
			newPassword: formData.get("newPassword") as string,
			confirmPassword: formData.get("confirmPassword") as string,
		};

		const validation = changePasswordSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { currentPassword, newPassword } = validation.data;
		const revokeOtherSessions = formData.get("revokeOtherSessions") === "true";

		// 4. Appeler l'API Better Auth pour changer le mot de passe
		try {
			await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword,
					revokeOtherSessions,
				},
				headers: headersList,
			});

			// 5. Logging du changement de mot de passe pour audit de sécurité
			// console.log(
			// 	`🔐 [SECURITY_AUDIT] Changement de mot de passe pour l'utilisateur ${session.user.id}`,
			// 	{
			// 		userId: session.user.id,
			// 		email: session.user.email,
			// 		ipAddress: ipAddress || "unknown",
			// 		timestamp: new Date().toISOString(),
			// 		revokeOtherSessions,
			// 	}
			// );

			// 6. Envoyer un email de notification (sécurité)
			try {
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

				// console.log(
			// 		`✅ Email de notification de changement envoyé à ${session.user.email}`
			// 	);
			} catch (emailError) {
				// Ne pas faire échouer la requête si l'email ne part pas
				// console.error(
				// 	"❌ Erreur lors de l'envoi de l'email de notification:",
				// 	emailError
				// );
			}

			return {
				status: ActionStatus.SUCCESS,
				message: revokeOtherSessions
					? "Mot de passe changé avec succès. Toutes les autres sessions ont été déconnectées."
					: "Mot de passe changé avec succès",
			};
		} catch (error: unknown) {
			// console.error("❌ Erreur lors du changement de mot de passe:", error);

			// Vérifier le type d'erreur
			if (error instanceof Error) {
				if (error.message.includes("Invalid password") || error.message.includes("incorrect")) {
					return {
						status: ActionStatus.ERROR,
						message: "Le mot de passe actuel est incorrect",
					};
				}
			}

			return {
				status: ActionStatus.ERROR,
				message: "Une erreur est survenue lors du changement de mot de passe",
			};
		}
	} catch (error) {
		// console.error("Exception lors du changement de mot de passe:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur inattendue est survenue",
		};
	}
};
