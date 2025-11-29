"use server";

import { ajAuth } from "@/shared/lib/arcjet";
import { auth } from "@/modules/auth/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { requestPasswordResetSchema } from "../schemas/auth.schemas";

export const requestPasswordReset = async (
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> => {
	try {
		// 🛡️ Protection Arcjet : Shield + Bot Detection + Rate Limiting
		// Protection contre enumeration, bots, et attaques courantes
		const headersList = await headers();
		const request = new Request("https://synclune.fr/auth/reset-password", {
			method: "POST",
			headers: headersList,
		});

		const decision = await ajAuth.protect(request, { requested: 1 });

		// Bloquer si Arcjet détecte une menace
		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Trop de tentatives de réinitialisation. Veuillez réessayer dans 15 minutes 🔒",
				};
			}

			if (decision.reason.isBot()) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Votre requête a été identifiée comme automatisée. Veuillez réessayer.",
				};
			}

			if (decision.reason.isShield()) {
				return {
					status: ActionStatus.ERROR,
					message: "Requête bloquée pour des raisons de sécurité.",
				};
			}

			return {
				status: ActionStatus.ERROR,
				message: "Votre requête n'a pas pu être traitée. Veuillez réessayer.",
			};
		}

		// Validation des données
		const rawData = {
			email: formData.get("email") as string,
		};

		const validation = requestPasswordResetSchema.safeParse(rawData);
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Données invalides",
			};
		}

		const { email } = validation.data;

		// Vérifier si l'utilisateur existe et quel type de compte il a
		const user = await prisma.user.findFirst({
			where: {
				email,
				deletedAt: null, // Uniquement les comptes actifs
			},
			include: {
				accounts: {
					select: { providerId: true },
				},
			},
		});

		// Si l'utilisateur existe et a un compte OAuth (non "credential")
		if (user && user.accounts.some((account) => account.providerId !== "credential")) {
			// Vérifier s'il n'a QUE des comptes OAuth (pas de compte credential)
			const hasCredentialAccount = user.accounts.some((account) => account.providerId === "credential");

			if (!hasCredentialAccount) {
				const oauthProvider = user.accounts.find((account) => account.providerId !== "credential")?.providerId;
				const providerName = oauthProvider === "google" ? "Google" : oauthProvider;

				return {
					status: ActionStatus.ERROR,
					message: `Votre compte utilise l'authentification ${providerName}. Veuillez vous connecter avec ${providerName} ou contactez le support si vous avez besoin d'aide.`,
				};
			}
		}

		// 3. Appeler l'API Better Auth pour demander la réinitialisation
		try {
			await auth.api.requestPasswordReset({
				body: {
					email,
					redirectTo: "/reinitialiser-mot-de-passe",
				},
			});

			// Toujours retourner un succès, même si l'email n'existe pas
			// (pour des raisons de sécurité, ne pas révéler si un email existe dans la base)
			return {
				status: ActionStatus.SUCCESS,
				message: "Si cet email existe dans notre base, vous recevrez un lien de réinitialisation.",
			};
		} catch (error) {
			// Même en cas d'erreur, on retourne un succès pour ne pas révéler d'information
			return {
				status: ActionStatus.SUCCESS,
				message: "Si cet email existe dans notre base, vous recevrez un lien de réinitialisation.",
			};
		}
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur inattendue est survenue",
		};
	}
};
