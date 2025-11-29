"use server";

import { ajAuth } from "@/shared/lib/arcjet";
import { auth } from "@/modules/auth/lib/auth";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { signUpEmailSchema } from "../schemas/auth.schemas";

export const signUpEmail = async (
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> => {
	try {
		const headersList = await headers();

		// 🛡️ Protection Arcjet : Shield + Bot Detection + Rate Limiting
		// Protection contre spam accounts, bots, et attaques courantes
		const request = new Request("https://synclune.fr/auth/signup", {
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
						"Trop de tentatives d'inscription. Veuillez réessayer dans 15 minutes 🔒",
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

		// Vérifier si l'utilisateur est déjà connecté
		const session = await auth.api.getSession({
			headers: headersList,
		});
		if (session?.user?.id) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous êtes déjà connecté",
			};
		}
		const rawData = {
			email: formData.get("email") as string,
			password: formData.get("password") as string,
			confirmPassword: formData.get("confirmPassword") as string,
			name: formData.get("name") as string,
		};

		const validation = signUpEmailSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			const errorPath = firstError.path.join(".");
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: `${errorPath}: ${firstError.message}`,
			};
		}

		const { email, password, name } = validation.data;

		try {
			const response = await auth.api.signUpEmail({
				body: {
					email,
					password,
					name,
				},
			});

			if (!response) {
				return {
					status: ActionStatus.ERROR,
					message: "Une erreur est survenue lors de l'inscription",
				};
			}

			// Note: Le merge du panier et de la wishlist se fera automatiquement
			// lors de la première connexion via /auth/callback

			return {
				status: ActionStatus.SUCCESS,
				message: "Inscription réussie ! Un email de vérification vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte.",
			};
		} catch (error) {
			// Message générique pour éviter l'énumération d'emails
			// Ne pas révéler si un email existe déjà dans la base de données
			return {
				status: ActionStatus.ERROR,
				message: "Une erreur est survenue lors de l'inscription. Si cet email est déjà utilisé, essayez de vous connecter.",
			};
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error
				? error.message
				: "Une erreur inattendue est survenue";

		return {
			status: ActionStatus.ERROR,
			message: errorMessage,
		};
	}
};
